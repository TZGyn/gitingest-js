import { Hono } from 'hono'

// For extending the Zod schema with OpenAPI properties
import 'zod-openapi/extend'
import { describeRoute, openAPISpecs } from 'hono-openapi'
import { resolver, validator as zValidator } from 'hono-openapi/zod'
import { z } from 'zod'
import { getLatestCommit } from '$lib/utils/git/get-latest-commit'
import { db } from '$lib/db'
import { git } from '$lib/db/schema'
import { google, mistral } from '$lib/ai/model'
import {
	convertToCoreMessages,
	createDataStreamResponse,
	generateText,
	smoothStream,
	streamText,
} from 'ai'
import { formatFiles } from '$lib/utils/files/format-files'
import { nanoid } from '$lib/utils/nanoid'
import { getAllFilesStats } from '$lib/utils/files/get-all-files-stats'
import { $ } from 'bun'
import * as fs from 'node:fs/promises'

const app = new Hono().post(
	'/',
	zValidator(
		'json',
		z.object({
			messages: z.any(),
			repo: z
				.string()
				.refine(
					(url) => {
						try {
							const repo = new URL(url)
							if (
								!['github.com', 'gitlab.com'].includes(repo.hostname)
							) {
								return false
							}
							return true
						} catch (error) {
							return false
						}
					},
					{
						message: 'Invalid url, must be github.com or gitlab.com',
					},
				)
				.transform((url) => new URL(url))
				.openapi({
					example: 'https://github.com/TZGyn/gitingest-js.git',
				}),
			branch: z
				.string()
				.optional()
				.nullable()
				.openapi({ nullable: true }),
			commit: z
				.string()
				.optional()
				.nullable()
				.openapi({ nullable: true }),
		}),
	),
	async (c) => {
		if (!google) {
			return c.text('Chat not enabled', { status: 500 })
		}
		const { messages, repo, branch, commit } = c.req.valid('json')

		let useCommit: null | string = null
		if (!commit) {
			useCommit = await getLatestCommit({
				url: repo.toString(),
				branch,
			})
		} else {
			useCommit = commit
		}

		if (!useCommit) {
			return c.text('Unable to get commit')
		}

		const providers: Record<string, 'github' | 'gitlab'> = {
			'github.com': 'github',
			'gitlab.com': 'gitlab',
		}

		const existGitData = await db.query.git.findFirst({
			where: (git, t) =>
				t.and(
					t.eq(git.commit, useCommit),
					t.eq(git.branch, branch || 'HEAD'),
					t.eq(git.repo, repo.pathname.split('.')[0].substring(1)),
					t.eq(git.provider, providers[repo.hostname]),
				),
		})

		let filesText: string
		let currentCommit: string
		if (existGitData) {
			const { files, commit } = existGitData
			filesText = formatFiles(files as any)
			currentCommit = commit
		} else {
			const id = nanoid()
			const dir = `tmp/${id}`
			const cloneArgs = []
			if (!commit) {
				cloneArgs.push('--depth=1')
			}
			if (branch && !['main', 'master'].includes(branch)) {
				cloneArgs.push('--branch', branch)
			}
			console.log(
				`git clone ${repo} ${cloneArgs.join(' ')} tmp/${id}`,
			)
			await $`git clone ${repo} ${cloneArgs.join(' ')} tmp/${id}`

			if (commit) {
				await $`cd ${dir} && git checkout ${commit}`
			}

			const files = await getAllFilesStats(dir, dir)

			await fs.rm(dir, { recursive: true, force: true })

			const gitData = await db.insert(git).values({
				branch: branch || 'HEAD',
				commit: useCommit,
				files: files,
				provider: 'github',
				repo: repo.pathname.split('.')[0].substring(1),
			})

			filesText = formatFiles(files)
			currentCommit = commit ?? 'latest'
		}

		let coreMessages = convertToCoreMessages(messages)

		const model = google('gemini-2.0-flash')

		return createDataStreamResponse({
			headers: {
				...c.res.headers,
			},
			execute: async (dataStream) => {
				dataStream.writeData({
					type: 'message',
					message: 'Understanding prompt',
				})

				dataStream.writeData({
					type: 'message',
					message: 'Generating Response',
				})

				dataStream.writeData({
					type: 'commit',
					commit: currentCommit,
				})

				const result = streamText({
					model: model,
					messages: coreMessages,
					system: `
						You are a git repo chat assistant, the repo files had been processed into text format and it will be given to you as context
						Users will ask questions about the repo, you can use the files texts provided to you to answer their prompts

						Here are the files:
						${filesText}

						Today's Date: ${new Date().toLocaleDateString('en-US', {
							year: 'numeric',
							month: 'short',
							day: '2-digit',
							weekday: 'short',
						})}

						Note: frontend has a tool to display mermaid code, 
						so you don't have to tell the user you don't have the ability to render mermaid code 
						or tell the user how to render them

						if a math equation is generated, wrap it around $$ for katex inline styling and $$ for block
						example:

						(inline)
						Pythagorean theorem: $$a^2+b^2=c^2$$

						(block)
						$$
						\mathcal{L}\{f\}(s) = \int_0^{\infty} {f(t)e^{-st}dt}
						$$

						DONT USE $$ UNLESS YOU NEED TO GENERATE MATH FORMULAS

						WRAP CODE AROUND \`IF INLINE\`
						WRAP CODE AROUND
						\`\`\`
						IF BLOCK
						\`\`\`
						You must put the programming language for codeblock so frontend can make correct syntax highlighting
						eg:
						\`\`\`javascript
						javascript code
						\`\`\`

						Do not generate tool call details to the user
						It is a must to generate some text, letting the user knows your thinking process before using a tool.
						Thus providing better user experience, rather than immediately jump to using the tool and generate a conclusion

						Common Order: Tool, Text
						Better order you must follow: Text, Tool, Text

						If the tools return an unauthenticated error due to user not logged in, please say the following to the user:
						"You must be logged in to use this feature, if you sign up we will give you 50 credits (worth $0.50)"
					`,
					providerOptions: {},
					abortSignal: c.req.raw.signal,
					maxSteps: 5,
					// experimental_activeTools: [...activeTools(mode)],
					onError: (error) => {
						console.log('Error', error)
					},
					experimental_transform: smoothStream({
						delayInMs: 20, // optional: defaults to 10ms
						chunking: 'word', // optional: defaults to 'word'
					}),
				})

				result.mergeIntoDataStream(dataStream, {
					sendReasoning: true,
				})
			},
			onError: (error) => {
				// Error messages are masked by default for security reasons.
				// If you want to expose the error message to the client, you can do so here:
				console.log('Stream Error', error)
				return error instanceof Error ? error.message : String(error)
			},
		})
	},
)

export { app as ChatRoute }

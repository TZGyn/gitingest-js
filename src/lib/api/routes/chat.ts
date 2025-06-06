import { Hono } from 'hono'

// For extending the Zod schema with OpenAPI properties
import 'zod-openapi/extend'
import { validator as zValidator } from 'hono-openapi/zod'
import { z } from 'zod'
import { getLatestCommit } from '$lib/utils/git/get-latest-commit'
import { google } from '$lib/ai/model'
import {
	convertToCoreMessages,
	createDataStreamResponse,
	streamText,
	tool,
} from 'ai'
import { formatFiles } from '$lib/utils/files/format-files'
import type { OCRResponse } from '@mistralai/mistralai/models/components'
import { normalize } from '$lib/utils/files/normalize-path'
import { pathsort } from '$lib/utils/files/path-sort'
import { getRepoData } from '$lib/utils/git/get-repo-data'

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
							new URL(url)
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

				let files: {
					path: string
					type: string
					content: string
					pdfParsed?: OCRResponse
					imageDescription?: string
				}[] = []

				const result = streamText({
					model: model,
					messages: coreMessages,
					system: `
						You are a git repo chat assistant, the repo files had been processed into text format and it will be given to you as context
						Users will ask questions about the repo, you can use the file paths provided to you to answer their prompts
						To get the file content, use the paths (max 30 at one time) to the get their content, you can decided on your own which path to use
						For example, if the user ask to summarize the entire codebase, u can repeatedly call the function to get the content of all files
						Make sure to stop once u got the data you wanted

						Use the tool getRepo to get all the file paths in the repo

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
					maxSteps: 100,
					tools: {
						getRepo: tool({
							description: 'Fetch Repo Data, must use at the start',
							parameters: z.object({}),
							execute: async ({}) => {
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
									dataStream.writeMessageAnnotation({
										type: 'git_ingest',
										status: 'error',
										error: {
											type: 'invalid_data',
											message: 'Unable to get commit data',
										},
									})
									return
								}

								const { files: filesData, currentCommit } =
									await getRepoData({
										repo,
										useCommit,
										branch,
										commit,
									})

								files = filesData

								dataStream.writeData({
									type: 'commit',
									commit: currentCommit,
								})

								const paths = files.map((file) =>
									normalize(file.path),
								)
								return {
									paths: pathsort(paths),
								}
							},
						}),
						getFiles: tool({
							parameters: z.object({
								filePaths: z
									.string()
									.array()
									.describe(
										'File paths (max 30 at the time), if its small files like prettierrc.json, u can include 100 of them, make sure the file content doesnt exceed 1 million tokens since you will crash',
									),
							}),
							execute: async ({ filePaths }) => {
								const filesData = files.filter((file) => {
									return (
										filePaths.includes(normalize(file.path)) ||
										filePaths.includes('/' + normalize(file.path))
									)
								})

								const filesText = formatFiles(filesData)

								return { content: filesText }
							},
						}),
					},
					onError: (error) => {
						console.log('Error', error)
					},
					// experimental_transform: smoothStream({
					// 	delayInMs: 20, // optional: defaults to 10ms
					// 	chunking: 'word', // optional: defaults to 'word'
					// }),
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

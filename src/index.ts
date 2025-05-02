import { $ } from 'bun'
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import * as fs from 'node:fs/promises'
import * as path from 'path'
import { nanoid } from '$lib/utils/nanoid'

// For extending the Zod schema with OpenAPI properties
import 'zod-openapi/extend'
import { describeRoute, openAPISpecs } from 'hono-openapi'
import { Scalar } from '@scalar/hono-api-reference'
import { resolver, validator as zValidator } from 'hono-openapi/zod'
import { z } from 'zod'
import { getLatestCommit } from '$lib/utils/git/get-latest-commit'
import { db } from '$lib/db'
import { git } from '$lib/db/schema'
import { google, mistral } from '$lib/ai/model'
import { generateText } from 'ai'
import { OCRResponse } from '@mistralai/mistralai/models/components'
import { isIgnored } from '$lib/utils/git/ignore-patterns'

const app = new Hono()
app.use(cors())
app.use(logger())

app.get(
	'/openapi',
	openAPISpecs(app, {
		documentation: {
			info: {
				title: 'Hono',
				version: '1.0.0',
				description: 'API for greeting users',
			},
			servers: [
				{
					url: Bun.env.APP_URL || 'http://127.0.0.1:8080',
					description: 'Server',
				},
			],
		},
	}),
)

app.get(
	'/docs',
	Scalar({
		theme: 'saturn',
		url: '/openapi',
	}),
)

async function getAllFilesStats(rootPath: string, dirPath: string) {
	const files = await fs.readdir(dirPath)
	const arrayOfFiles: {
		path: string
		type: string
		content: string
		pdfParsed?: OCRResponse
		imageDescription?: string
	}[] = []

	for (const file of files) {
		const filePath = path.join(dirPath, file)
		const bunFile = Bun.file(filePath)
		const fileStat = await bunFile.stat()

		if (isIgnored(path.relative(rootPath, filePath))) {
			continue
		}

		if (fileStat.isDirectory()) {
			arrayOfFiles.push(
				...(await getAllFilesStats(rootPath, filePath)),
			)
		} else {
			if (bunFile.type.startsWith('application/pdf') && mistral) {
				const base64 = (await bunFile.bytes()).toBase64()

				arrayOfFiles.push({
					path: path.relative(rootPath, filePath),
					type: bunFile.type,
					content: await bunFile.text(),
					pdfParsed: await mistral.ocr.process({
						model: 'mistral-ocr-latest',
						document: {
							type: 'document_url',
							documentUrl: 'data:application/pdf;base64,' + base64,
						},
						includeImageBase64: true,
					}),
				})
			} else if (bunFile.type.startsWith('image/') && google) {
				const arrayBuffer = await bunFile.arrayBuffer()
				const { text } = await generateText({
					model: google('gemini-2.0-flash'),
					messages: [
						{
							role: 'user',
							content: [
								{
									type: 'text',
									text: `
										Description this image as detailed as possible
										Dont make any unneccessary comments like "Here's a detailed description of the image"
										The description is most likely going to be used to improve other llm's understanding of the image, so give as much details as possible
										Only generate the description of the image, no chatting
									`,
								},
								{ type: 'image', image: arrayBuffer },
							],
						},
					],
				})

				arrayOfFiles.push({
					path: path.relative(rootPath, filePath),
					type: bunFile.type,
					content: await bunFile.text(),
					imageDescription: text,
				})
			} else {
				arrayOfFiles.push({
					path: path.relative(rootPath, filePath),
					type: bunFile.type,
					content: await bunFile.text(),
				})
			}
		}
	}

	return arrayOfFiles
}

const formatFiles = (
	files: {
		path: string
		type: string
		content: string
		pdfParsed?: OCRResponse
		imageDescription?: string
	}[],
) => {
	const text = files
		.map((file) => {
			let output = '='.repeat(48)
			output += '\n'
			output += 'FILE: ' + file.path.split('/').pop()
			output += '\n'
			output += '='.repeat(48)
			output += '\n'
			output +=
				file.type.split(';')[0] === 'application/pdf'
					? JSON.stringify(file.pdfParsed)
					: file.type.split(';')[0].startsWith('image/')
					? file.imageDescription
					: file.content
			return output
		})
		.join('\n\n')
	return text
}

app.get(
	'/',
	zValidator(
		'query',
		z.object({
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
			branch: z.string().optional().openapi({ nullable: true }),
			commit: z.string().optional().openapi({ nullable: true }),
		}),
	),
	async (c) => {
		const { branch, repo, commit } = c.req.valid('query')

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

		if (existGitData) {
			const { files } = existGitData
			return c.text(formatFiles(files as any))
		}

		const id = nanoid()
		const dir = `tmp/${id}`
		const cloneArgs = []
		if (!commit) {
			cloneArgs.push('--depth=1')
		}
		if (branch && !['main', 'master'].includes(branch)) {
			cloneArgs.push('--branch', branch)
		}
		console.log(`git clone ${repo} ${cloneArgs.join(' ')} tmp/${id}`)
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

		return c.text(formatFiles(files))
	},
)

export default {
	fetch: app.fetch,
	// hostname: '0.0.0.0',
	port: 8080,
	idleTimeout: 0,
}

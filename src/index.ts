import { $ } from 'bun'
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import * as fs from 'node:fs/promises'
import * as path from 'path'
import { nanoid } from '$lib/utils/nanoid'
import { Stats } from 'node:fs'

// For extending the Zod schema with OpenAPI properties
import 'zod-openapi/extend'
import { describeRoute, openAPISpecs } from 'hono-openapi'
import { Scalar } from '@scalar/hono-api-reference'
import { resolver, validator as zValidator } from 'hono-openapi/zod'
import { z } from 'zod'
import { getLatestCommit } from '$lib/utils/git/get-latest-commit'
import { db } from '$lib/db'
import { git } from '$lib/db/schema'

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
					url: 'http://127.0.0.1:3000',
					description: 'Local server',
				},
				{
					url: 'https://gitingest-js-production.up.railway.app',
					description: 'Public Server',
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

async function getAllFilesStats(
	rootPath: string,
	dirPath: string,
	{
		excludeFiles,
		excludeFolders,
	}: {
		excludeFiles: string[]
		excludeFolders: string[]
	},
) {
	const files = await fs.readdir(dirPath)
	const arrayOfFiles: {
		path: string
		type: string
		content: string
		// stats: Stats
	}[] = []

	for (const file of files) {
		const filePath = path.join(dirPath, file)
		const bunFile = Bun.file(filePath)
		const fileStat = await bunFile.stat()

		if (fileStat.isDirectory()) {
			if (excludeFolders.includes(file)) {
				continue
			}
			arrayOfFiles.push(
				...(await getAllFilesStats(rootPath, filePath, {
					excludeFiles: excludeFiles,
					excludeFolders: excludeFolders,
				})),
			)
		} else {
			if (excludeFiles.includes(file)) {
				continue
			}
			arrayOfFiles.push({
				path: path.relative(rootPath, filePath),
				type: bunFile.type,
				content: await bunFile.text(),
				// stats: fileStat,
			})
		}
	}

	return arrayOfFiles
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
							new URL(url)
							return true
						} catch (error) {
							return false
						}
					},
					{ message: 'invalid url' },
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

		if (!['github.com'].includes(repo.hostname)) {
			return c.text('invalid')
		}

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

		const existGitData = await db.query.git.findFirst({
			where: (git, t) =>
				t.and(
					t.eq(git.commit, useCommit),
					t.eq(git.branch, branch || 'HEAD'),
					t.eq(git.repo, repo.pathname.split('.')[0]),
					t.eq(git.provider, 'github'),
				),
		})

		if (existGitData) {
			return c.json(existGitData)
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

		const files = await getAllFilesStats(dir, dir, {
			excludeFiles: ['bun.lockb', 'bun.lock', 'package.lock'],
			excludeFolders: ['.git'],
		})

		await fs.rm(dir, { recursive: true, force: true })

		const gitData = await db
			.insert(git)
			.values({
				branch: branch || 'HEAD',
				commit: useCommit,
				files: files,
				provider: 'github',
				repo: repo.pathname.split('.')[0].substring(1),
			})
			.returning()

		return c.json(gitData[0])
	},
)

export default {
	fetch: app.fetch,
	// hostname: '0.0.0.0',
	port: 3000,
	idleTimeout: 0,
}

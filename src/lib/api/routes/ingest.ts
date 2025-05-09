import { $ } from 'bun'
import { Hono } from 'hono'
import * as fs from 'node:fs/promises'
import * as path from 'path'
import { nanoid } from '$lib/utils/nanoid'

// For extending the Zod schema with OpenAPI properties
import 'zod-openapi/extend'
import { describeRoute, openAPISpecs } from 'hono-openapi'
import { resolver, validator as zValidator } from 'hono-openapi/zod'
import { z } from 'zod'
import { getLatestCommit } from '$lib/utils/git/get-latest-commit'
import { db } from '$lib/db'
import { git } from '$lib/db/schema'
import { type OCRResponse } from '@mistralai/mistralai/models/components'
import { isIgnored } from '$lib/utils/git/ignore-patterns'
import { getAllFilesStats } from '$lib/utils/files/get-all-files-stats'
import { formatFiles } from '$lib/utils/files/format-files'

const app = new Hono().get(
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

export { app as IngestRoute }

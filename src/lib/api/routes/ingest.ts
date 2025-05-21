import { Hono } from 'hono'

// For extending the Zod schema with OpenAPI properties
import 'zod-openapi/extend'
import { validator as zValidator } from 'hono-openapi/zod'
import { z } from 'zod'
import { getLatestCommit } from '$lib/utils/git/get-latest-commit'
import { formatFiles } from '$lib/utils/files/format-files'
import { getRepoData } from '$lib/utils/git/get-repo-data'

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

		const { files, currentCommit } = await getRepoData({
			repo,
			useCommit,
			branch,
			commit,
		})

		return c.text(formatFiles(files))
	},
)

export { app as IngestRoute }

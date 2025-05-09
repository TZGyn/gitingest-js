import { $ } from 'bun'

export const getLatestCommit = async ({
	url,
	branch,
}: {
	url: string
	branch?: string | null
}) => {
	try {
		const commit = (
			await $`git ls-remote ${url} ${branch || 'HEAD'}`.text()
		)
			.split('\n')[0]
			.split('\t')[0]

		return commit
	} catch (error) {
		return null
	}
}

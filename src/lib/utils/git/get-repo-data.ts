import { db } from '$lib/db'
import type { OCRResponse } from '@mistralai/mistralai/models/components'
import { nanoid } from '$lib/utils/nanoid'
import { getAllFilesStats } from '$lib/utils/files/get-all-files-stats'
import { $ } from 'bun'
import * as fs from 'node:fs/promises'
import { git } from '$lib/db/schema'

export const getRepoData = async ({
	repo,
	useCommit,
	commit,
	branch,
}: {
	useCommit: string
	commit?: string | null
	branch?: string | null
	repo: URL
}) => {
	let files: {
		path: string
		type: string
		content: string
		pdfParsed?: OCRResponse
		imageDescription?: string
	}[] = []

	const existGitData = await db.query.git.findFirst({
		where: (git, t) =>
			t.and(
				t.eq(git.commit, useCommit),
				t.eq(git.branch, branch || 'HEAD'),
				t.eq(git.repo, repo.pathname.split('.git')[0].substring(1)),
				t.eq(git.provider, repo.hostname),
			),
	})

	let currentCommit: string
	if (existGitData) {
		const { files: filesData, commit } = existGitData
		files = filesData as any

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
		console.log(`git clone ${repo} ${cloneArgs.join(' ')} tmp/${id}`)
		await $`git clone ${repo} ${cloneArgs.join(' ')} tmp/${id}`

		if (commit) {
			await $`cd ${dir} && git checkout ${commit}`
		}

		const filesData = await getAllFilesStats(dir, dir)

		await fs.rm(dir, { recursive: true, force: true })

		const gitData = await db.insert(git).values({
			branch: branch || 'HEAD',
			commit: useCommit,
			files: filesData,
			provider: 'github',
			repo: repo.pathname.split('.')[0].substring(1),
		})

		files = filesData
		currentCommit = commit ?? 'latest'
	}

	return {
		files,
		currentCommit,
	}
}

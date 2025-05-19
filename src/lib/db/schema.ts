import { pgTable, primaryKey } from 'drizzle-orm/pg-core'

export const git = pgTable(
	'git',
	(t) => ({
		provider: t.varchar('provider', { length: 255 }).notNull(),
		repo: t.text('repo').notNull(),
		branch: t.text('branch').notNull(),
		commit: t.varchar('commit', { length: 255 }).notNull(),
		files: t.json('files').notNull(),
	}),
	(table) => [
		primaryKey({
			columns: [
				table.provider,
				table.repo,
				table.branch,
				table.commit,
			],
		}),
	],
)

// import { drizzle } from 'drizzle-orm/bun-sql'
import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from './schema'
import * as pg from 'pg'
const { Pool } = pg

const pool = new Pool({
	connectionString: Bun.env.DATABASE_URL!,
})

// const client = new Bun.SQL({
// 	url: Bun.env.DATABASE_URL!,
// 	max: 15, // Maximum connections in pool
// 	idleTimeout: 30, // Close idle connections after 30s
// 	maxLifetime: 0, // Connection lifetime in seconds (0 = forever)
// 	connectionTimeout: 30, // Timeout when establishing new connections
// 	onconnect: (client): void => {
// 		console.log('sql connected')
// 	},
// 	onclose: (client): void => {
// 		console.log('sql closed')
// 	},
// })

export const db = drizzle(pool, { schema })

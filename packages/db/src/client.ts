import { mkdirSync } from 'node:fs'
import path from 'node:path'

import Database from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'

import { migrateDb } from './migrate.js'
import * as schema from './schema.js'

export type CircuitDb = BetterSQLite3Database<typeof schema>

export interface CreateDbOptions {
  dbPath: string
  migrationsFolder: string
}

export function createDb({ dbPath, migrationsFolder }: CreateDbOptions): {
  db: CircuitDb
  sqlite: Database.Database
} {
  mkdirSync(path.dirname(dbPath), { recursive: true })

  const sqlite = new Database(dbPath)
  sqlite.pragma('journal_mode = WAL')
  // Table-rebuild migrations (e.g. default changes) must drop parent tables while
  // child FKs exist — disable for the whole migrate pass, then re-enable.
  sqlite.pragma('foreign_keys = OFF')
  migrateDb(sqlite, migrationsFolder)
  sqlite.pragma('foreign_keys = ON')

  const db = drizzle(sqlite, { schema })

  return { db, sqlite }
}

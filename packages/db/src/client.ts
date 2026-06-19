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
  sqlite.pragma('foreign_keys = ON')

  migrateDb(sqlite, migrationsFolder)

  const db = drizzle(sqlite, { schema })

  return { db, sqlite }
}

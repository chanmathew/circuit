import type Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'

/** Apply Drizzle SQL migrations from `packages/db/migrations` (generated via db:generate). */
export function migrateDb(sqlite: Database.Database, migrationsFolder: string): void {
  const db = drizzle(sqlite)
  migrate(db, { migrationsFolder })
}

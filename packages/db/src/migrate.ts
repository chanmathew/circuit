import type Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'

export function migrateDb(sqlite: Database.Database, migrationsFolder: string): void {
  const db = drizzle(sqlite)
  migrate(db, { migrationsFolder })
}

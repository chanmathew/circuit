import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'

const packageRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const dbPath = path.join(packageRoot, '.data', 'circuit-dev.db')
const migrationsFolder = path.join(packageRoot, 'migrations')

function printRebuildHint() {
  console.error(`
better-sqlite3 was compiled for Electron, not this Node runtime.

For the dev DB only:
  pnpm rebuild better-sqlite3
  pnpm --filter @circuit/db db:migrate
  pnpm --filter desktop postinstall   # restore Electron binary

For normal app use, just restart Circuit — it auto-migrates on startup.
`)
}

mkdirSync(path.dirname(dbPath), { recursive: true })

const sqlite = new Database(dbPath)
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')

try {
  const db = drizzle(sqlite)
  migrate(db, { migrationsFolder })
  console.log(`Migrations applied to ${dbPath}`)
} catch (error) {
  if (error instanceof Error && 'code' in error && error.code === 'ERR_DLOPEN_FAILED') {
    printRebuildHint()
    process.exit(1)
  }
  throw error
} finally {
  sqlite.close()
}

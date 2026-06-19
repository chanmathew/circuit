import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { app } from 'electron'

import { createDb, type CircuitDb } from '@circuit/db'

let db: CircuitDb | undefined
let sqlite: { close: () => void } | undefined

export function getDb(): CircuitDb {
  if (!db) {
    throw new Error('Database not initialized')
  }
  return db
}

export function initDb(): CircuitDb {
  if (db) {
    return db
  }

  const dbPath = path.join(app.getPath('userData'), 'circuit.db')
  const migrationsFolder = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations')
  const connection = createDb({ dbPath, migrationsFolder })
  db = connection.db
  sqlite = connection.sqlite
  return db
}

export function closeDb(): void {
  sqlite?.close()
  sqlite = undefined
  db = undefined
}

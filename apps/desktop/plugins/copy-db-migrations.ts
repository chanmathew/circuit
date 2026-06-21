import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'

const migrationsSource = resolve(__dirname, '../../../packages/db/migrations')
const defaultOutDir = resolve(__dirname, '../out/main')

function copyDbMigrations(outDir: string): void {
  if (!existsSync(migrationsSource)) {
    throw new Error(`Missing Drizzle migrations folder: ${migrationsSource}`)
  }

  const target = resolve(outDir, 'migrations')
  mkdirSync(outDir, { recursive: true })
  cpSync(migrationsSource, target, { recursive: true })
}

export function copyDbMigrationsPlugin(outDir = defaultOutDir): Plugin {
  return {
    name: 'copy-db-migrations',
    buildStart() {
      copyDbMigrations(outDir)
    },
    writeBundle() {
      copyDbMigrations(outDir)
    },
  }
}

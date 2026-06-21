import { mkdirSync, rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const dbPath = path.join(packageRoot, '.data', 'circuit-dev.db')

for (const suffix of ['', '-wal', '-shm']) {
  rmSync(`${dbPath}${suffix}`, { force: true })
}

mkdirSync(path.dirname(dbPath), { recursive: true })
console.log(`Deleted dev DB at ${dbPath}`)
console.log('Run pnpm --filter @circuit/db db:migrate to recreate the dev DB')

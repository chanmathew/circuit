import { asc, eq } from 'drizzle-orm'

import type { CircuitDb } from './client.js'
import { repos } from './schema.js'

export type RepoRow = typeof repos.$inferSelect
export type NewRepoRow = typeof repos.$inferInsert

export function insertRepo(db: CircuitDb, repo: NewRepoRow): RepoRow {
  db.insert(repos).values(repo).run()
  const row = getRepoById(db, repo.id)
  if (!row) {
    throw new Error(`Failed to insert repo: ${repo.id}`)
  }
  return row
}

export function listRepos(db: CircuitDb): RepoRow[] {
  return db.select().from(repos).orderBy(asc(repos.createdAt)).all()
}

export function getRepoById(db: CircuitDb, id: string): RepoRow | undefined {
  return db.select().from(repos).where(eq(repos.id, id)).get()
}

export function getRepoByPath(db: CircuitDb, repoPath: string): RepoRow | undefined {
  return db.select().from(repos).where(eq(repos.path, repoPath)).get()
}

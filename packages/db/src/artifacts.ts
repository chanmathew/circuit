import { and, asc, eq } from 'drizzle-orm'

import type { CircuitDb } from './client.js'
import { artifacts } from './schema.js'

export type ArtifactRow = typeof artifacts.$inferSelect
export type NewArtifactRow = typeof artifacts.$inferInsert

export function insertArtifact(db: CircuitDb, artifact: NewArtifactRow): ArtifactRow {
  db.insert(artifacts).values(artifact).run()
  const row = getArtifactById(db, artifact.id)
  if (!row) {
    throw new Error(`Failed to insert artifact: ${artifact.id}`)
  }
  return row
}

export function getArtifactById(db: CircuitDb, id: string): ArtifactRow | undefined {
  return db.select().from(artifacts).where(eq(artifacts.id, id)).get()
}

export function getTicketArtifactForTask(db: CircuitDb, taskId: string): ArtifactRow | undefined {
  return db
    .select()
    .from(artifacts)
    .where(and(eq(artifacts.taskId, taskId), eq(artifacts.phase, 'ticket')))
    .get()
}

export function listArtifactsForTask(db: CircuitDb, taskId: string): ArtifactRow[] {
  return db
    .select()
    .from(artifacts)
    .where(eq(artifacts.taskId, taskId))
    .orderBy(asc(artifacts.title))
    .all()
}

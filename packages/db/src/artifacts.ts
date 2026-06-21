import { and, asc, desc, eq } from 'drizzle-orm'

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

function isNewerArtifact(candidate: ArtifactRow, current: ArtifactRow): boolean {
  if (candidate.version !== current.version) {
    return candidate.version > current.version
  }
  return candidate.updatedAt > current.updatedAt
}

export function latestArtifactPerPhase(artifactRows: ArtifactRow[]): ArtifactRow[] {
  const byPhase = new Map<string, ArtifactRow>()
  for (const artifact of artifactRows) {
    const existing = byPhase.get(artifact.phase)
    if (!existing || isNewerArtifact(artifact, existing)) {
      byPhase.set(artifact.phase, artifact)
    }
  }
  return [...byPhase.values()].sort((left, right) => left.title.localeCompare(right.title))
}

export function getArtifactByTaskAndPhase(
  db: CircuitDb,
  taskId: string,
  phase: string,
  workflowRunId?: string,
): ArtifactRow | undefined {
  const conditions = [eq(artifacts.taskId, taskId), eq(artifacts.phase, phase)]
  if (workflowRunId) {
    conditions.push(eq(artifacts.workflowRunId, workflowRunId))
  }
  return db
    .select()
    .from(artifacts)
    .where(and(...conditions))
    .orderBy(desc(artifacts.version), desc(artifacts.updatedAt))
    .get()
}

export function getTicketArtifactForRun(db: CircuitDb, workflowRunId: string): ArtifactRow | undefined {
  return db
    .select()
    .from(artifacts)
    .where(and(eq(artifacts.workflowRunId, workflowRunId), eq(artifacts.phase, 'ticket')))
    .get()
}

export function getTicketArtifactForTask(db: CircuitDb, taskId: string): ArtifactRow | undefined {
  return db
    .select()
    .from(artifacts)
    .where(and(eq(artifacts.taskId, taskId), eq(artifacts.phase, 'ticket')))
    .orderBy(asc(artifacts.createdAt))
    .all()
    .at(-1)
}

export function listArtifactsForWorkflowRun(db: CircuitDb, workflowRunId: string): ArtifactRow[] {
  const rows = db
    .select()
    .from(artifacts)
    .where(eq(artifacts.workflowRunId, workflowRunId))
    .orderBy(asc(artifacts.title))
    .all()
  return latestArtifactPerPhase(rows)
}

export function deleteArtifact(db: CircuitDb, artifactId: string): void {
  db.delete(artifacts).where(eq(artifacts.id, artifactId)).run()
}

export function updateArtifact(
  db: CircuitDb,
  artifactId: string,
  patch: Partial<Pick<ArtifactRow, 'content' | 'status' | 'version' | 'updatedAt'>>,
): ArtifactRow | undefined {
  db.update(artifacts).set(patch).where(eq(artifacts.id, artifactId)).run()
  return getArtifactById(db, artifactId)
}

export function listArtifactsForTask(db: CircuitDb, taskId: string): ArtifactRow[] {
  return db
    .select()
    .from(artifacts)
    .where(eq(artifacts.taskId, taskId))
    .orderBy(asc(artifacts.title))
    .all()
}

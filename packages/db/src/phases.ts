import { asc, eq } from 'drizzle-orm'

import type { CircuitDb } from './client.js'
import { phases } from './schema.js'

export type PhaseRow = typeof phases.$inferSelect
export type NewPhaseRow = typeof phases.$inferInsert

export function insertPhase(db: CircuitDb, phase: NewPhaseRow): PhaseRow {
  db.insert(phases).values(phase).run()
  const row = getPhaseById(db, phase.id)
  if (!row) {
    throw new Error(`Failed to insert phase: ${phase.id}`)
  }
  return row
}

export function insertPhases(db: CircuitDb, rows: NewPhaseRow[]): PhaseRow[] {
  if (rows.length === 0) return []
  db.insert(phases).values(rows).run()
  return listPhasesForTask(db, rows[0]!.taskId)
}

export function getPhaseById(db: CircuitDb, id: string): PhaseRow | undefined {
  return db.select().from(phases).where(eq(phases.id, id)).get()
}

export function listPhasesForTask(db: CircuitDb, taskId: string): PhaseRow[] {
  return db.select().from(phases).where(eq(phases.taskId, taskId)).orderBy(asc(phases.order)).all()
}

export function updatePhaseArtifactId(
  db: CircuitDb,
  phaseId: string,
  artifactId: string,
): PhaseRow | undefined {
  db.update(phases).set({ currentArtifactId: artifactId }).where(eq(phases.id, phaseId)).run()
  return getPhaseById(db, phaseId)
}

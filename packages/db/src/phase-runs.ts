import { asc, eq } from 'drizzle-orm'

import type { CircuitDb } from './client.js'
import { phaseRuns } from './schema.js'

export type PhaseRunRow = typeof phaseRuns.$inferSelect
export type NewPhaseRunRow = typeof phaseRuns.$inferInsert

export function insertPhaseRun(db: CircuitDb, run: NewPhaseRunRow): PhaseRunRow {
  db.insert(phaseRuns).values(run).run()
  const row = getPhaseRunById(db, run.id)
  if (!row) {
    throw new Error(`Failed to insert phase run: ${run.id}`)
  }
  return row
}

export function getPhaseRunById(db: CircuitDb, id: string): PhaseRunRow | undefined {
  return db.select().from(phaseRuns).where(eq(phaseRuns.id, id)).get()
}

export function listPhaseRunsForTask(db: CircuitDb, taskId: string): PhaseRunRow[] {
  return db
    .select()
    .from(phaseRuns)
    .where(eq(phaseRuns.taskId, taskId))
    .orderBy(asc(phaseRuns.startedAt))
    .all()
}

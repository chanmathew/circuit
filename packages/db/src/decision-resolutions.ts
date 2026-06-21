import { and, eq, isNull } from 'drizzle-orm'

import type { CircuitDb } from './client.js'
import { decisionResolutions } from './schema.js'

export type DecisionResolutionRow = typeof decisionResolutions.$inferSelect
export type NewDecisionResolutionRow = typeof decisionResolutions.$inferInsert

export function upsertDecisionResolution(
  db: CircuitDb,
  resolution: NewDecisionResolutionRow,
): DecisionResolutionRow {
  const scope = resolution.workflowRunId
    ? eq(decisionResolutions.workflowRunId, resolution.workflowRunId)
    : isNull(decisionResolutions.workflowRunId)

  db.delete(decisionResolutions)
    .where(
      and(
        eq(decisionResolutions.taskId, resolution.taskId),
        eq(decisionResolutions.decisionId, resolution.decisionId),
        scope,
      ),
    )
    .run()

  db.insert(decisionResolutions).values(resolution).run()

  const row = db
    .select()
    .from(decisionResolutions)
    .where(eq(decisionResolutions.id, resolution.id))
    .get()

  if (!row) {
    throw new Error(`Failed to upsert decision resolution: ${resolution.id}`)
  }
  return row
}

export function listDecisionResolutionsForTask(
  db: CircuitDb,
  taskId: string,
): DecisionResolutionRow[] {
  return db
    .select()
    .from(decisionResolutions)
    .where(eq(decisionResolutions.taskId, taskId))
    .all()
}

export function listDecisionResolutionsForPhase(
  db: CircuitDb,
  taskId: string,
  phase: string,
  workflowRunId?: string,
): DecisionResolutionRow[] {
  const conditions = [
    eq(decisionResolutions.taskId, taskId),
    eq(decisionResolutions.phase, phase),
  ]
  if (workflowRunId) {
    conditions.push(eq(decisionResolutions.workflowRunId, workflowRunId))
  }

  return db
    .select()
    .from(decisionResolutions)
    .where(and(...conditions))
    .all()
}

export function getDecisionResolution(
  db: CircuitDb,
  taskId: string,
  decisionId: string,
  workflowRunId?: string,
): DecisionResolutionRow | undefined {
  const conditions = [
    eq(decisionResolutions.taskId, taskId),
    eq(decisionResolutions.decisionId, decisionId),
  ]
  if (workflowRunId) {
    conditions.push(eq(decisionResolutions.workflowRunId, workflowRunId))
  }

  return db
    .select()
    .from(decisionResolutions)
    .where(and(...conditions))
    .get()
}

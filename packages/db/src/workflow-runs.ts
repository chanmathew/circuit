import { and, desc, eq } from 'drizzle-orm'

import type { CircuitDb } from './client.js'
import { workflowRuns } from './schema.js'

export type WorkflowRunRow = typeof workflowRuns.$inferSelect
export type NewWorkflowRunRow = typeof workflowRuns.$inferInsert

export function insertWorkflowRun(db: CircuitDb, run: NewWorkflowRunRow): WorkflowRunRow {
  db.insert(workflowRuns).values(run).run()
  const row = getWorkflowRunById(db, run.id)
  if (!row) {
    throw new Error(`Failed to insert workflow run: ${run.id}`)
  }
  return row
}

export function getWorkflowRunById(db: CircuitDb, id: string): WorkflowRunRow | undefined {
  return db.select().from(workflowRuns).where(eq(workflowRuns.id, id)).get()
}

export function getActiveWorkflowRunForTask(
  db: CircuitDb,
  taskId: string,
): WorkflowRunRow | undefined {
  return db
    .select()
    .from(workflowRuns)
    .where(and(eq(workflowRuns.taskId, taskId), eq(workflowRuns.status, 'active')))
    .get()
}

export function listWorkflowRunsForTask(db: CircuitDb, taskId: string): WorkflowRunRow[] {
  return db
    .select()
    .from(workflowRuns)
    .where(eq(workflowRuns.taskId, taskId))
    .orderBy(desc(workflowRuns.startedAt))
    .all()
}

export function updateWorkflowRun(
  db: CircuitDb,
  runId: string,
  patch: Partial<
    Pick<
      WorkflowRunRow,
      'status' | 'completedAt' | 'cancelledAt' | 'currentPhaseId' | 'title' | 'updatedAt'
    >
  >,
): WorkflowRunRow | undefined {
  db.update(workflowRuns).set(patch).where(eq(workflowRuns.id, runId)).run()
  return getWorkflowRunById(db, runId)
}

export function completeWorkflowRun(
  db: CircuitDb,
  runId: string,
  completedAt: string,
): WorkflowRunRow | undefined {
  return updateWorkflowRun(db, runId, {
    status: 'completed',
    completedAt,
    updatedAt: completedAt,
  })
}

export function cancelWorkflowRun(
  db: CircuitDb,
  runId: string,
  cancelledAt: string,
): WorkflowRunRow | undefined {
  return updateWorkflowRun(db, runId, {
    status: 'cancelled',
    cancelledAt,
    updatedAt: cancelledAt,
  })
}

export function deleteWorkflowRun(db: CircuitDb, runId: string): void {
  db.delete(workflowRuns).where(eq(workflowRuns.id, runId)).run()
}

import { eq } from 'drizzle-orm'

import type { CircuitDb } from './client.js'
import { workflowEvents } from './schema.js'

export type WorkflowEventRow = typeof workflowEvents.$inferSelect
export type NewWorkflowEventRow = typeof workflowEvents.$inferInsert

export function insertWorkflowEvent(db: CircuitDb, event: NewWorkflowEventRow): WorkflowEventRow {
  db.insert(workflowEvents).values(event).run()

  const row = db.select().from(workflowEvents).where(eq(workflowEvents.id, event.id)).get()
  if (!row) {
    throw new Error(`Failed to insert workflow event: ${event.id}`)
  }
  return row
}

export function listWorkflowEventsForTask(db: CircuitDb, taskId: string): WorkflowEventRow[] {
  return db
    .select()
    .from(workflowEvents)
    .where(eq(workflowEvents.taskId, taskId))
    .all()
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

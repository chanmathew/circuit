import { eq } from 'drizzle-orm'

import type { CircuitDb } from './client.js'
import { tasks } from './schema.js'

export type TaskRow = typeof tasks.$inferSelect

export function updateTask(
  db: CircuitDb,
  taskId: string,
  patch: Partial<
    Pick<TaskRow, 'status' | 'currentPhase' | 'updatedAt' | 'title' | 'description' | 'workflowType'>
  >,
): TaskRow | undefined {
  db.update(tasks).set(patch).where(eq(tasks.id, taskId)).run()
  return db.select().from(tasks).where(eq(tasks.id, taskId)).get()
}

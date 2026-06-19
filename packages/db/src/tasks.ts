import { and, desc, eq } from 'drizzle-orm'

import type { CircuitDb } from './client.js'
import { tasks } from './schema.js'

export type TaskRow = typeof tasks.$inferSelect
export type NewTaskRow = typeof tasks.$inferInsert

export function insertTask(db: CircuitDb, task: NewTaskRow): TaskRow {
  db.insert(tasks).values(task).run()
  const row = getTaskById(db, task.id)
  if (!row) {
    throw new Error(`Failed to insert task: ${task.id}`)
  }
  return row
}

export function listTasks(db: CircuitDb, repoId?: string): TaskRow[] {
  if (repoId) {
    return db
      .select()
      .from(tasks)
      .where(eq(tasks.repoId, repoId))
      .orderBy(desc(tasks.updatedAt))
      .all()
  }

  return db.select().from(tasks).orderBy(desc(tasks.updatedAt)).all()
}

export function getTaskById(db: CircuitDb, id: string): TaskRow | undefined {
  return db.select().from(tasks).where(eq(tasks.id, id)).get()
}

export function listSlugsForRepo(db: CircuitDb, repoId: string): string[] {
  return db
    .select({ slug: tasks.slug })
    .from(tasks)
    .where(eq(tasks.repoId, repoId))
    .all()
    .map((row: { slug: string }) => row.slug)
}

export function slugExistsInRepo(db: CircuitDb, repoId: string, slug: string): boolean {
  const row = db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.repoId, repoId), eq(tasks.slug, slug)))
    .get()

  return row !== undefined
}

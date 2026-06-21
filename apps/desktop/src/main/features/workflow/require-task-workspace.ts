import { getTaskById } from '@circuit/db'
import { NotFoundError, ValidationError } from '@circuit/shared'

import { getDb } from '../../db.js'

/** Resolve workspace path from task — never trust renderer-supplied paths alone. */
export function requireTaskWorkspacePath(taskId: string, workspacePath: string): string {
  const task = getTaskById(getDb(), taskId)
  if (!task) {
    throw new NotFoundError('Task', taskId)
  }
  if (task.workspacePath !== workspacePath) {
    throw new ValidationError('Workspace path does not match task')
  }
  return task.workspacePath
}

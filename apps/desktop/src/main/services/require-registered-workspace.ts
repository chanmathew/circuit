import path from 'node:path'

import { getRepoByPath, listTasks } from '@circuit/db'
import { ValidationError } from '@circuit/shared'

import { getDb } from '../db.js'

/** Reject IPC workspace paths that are not a registered repo or known task workspace. */
export function requireRegisteredWorkspacePath(workspacePath: string): string {
  const resolved = path.resolve(workspacePath)
  const db = getDb()

  if (getRepoByPath(db, resolved)) {
    return resolved
  }

  const hasTask = listTasks(db).some((task) => path.resolve(task.workspacePath) === resolved)
  if (hasTask) {
    return resolved
  }

  throw new ValidationError('Workspace path is not registered')
}

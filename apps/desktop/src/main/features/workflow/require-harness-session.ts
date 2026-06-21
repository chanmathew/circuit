import { listPhaseRunsForTask } from '@circuit/db'
import { ValidationError } from '@circuit/shared'

import { getDb } from '../../db.js'
import { getSessionTaskId } from './phase-run-registry.js'

/** Ensure harness sessionId is bound to task via active run or prior phase_runs. */
export function requireHarnessSessionForTask(taskId: string, sessionId: string): void {
  if (getSessionTaskId(sessionId) === taskId) return

  const runs = listPhaseRunsForTask(getDb(), taskId)
  const bound = runs.some((run) => run.sessionId === sessionId)
  if (!bound) {
    throw new ValidationError('Session does not belong to this task')
  }
}

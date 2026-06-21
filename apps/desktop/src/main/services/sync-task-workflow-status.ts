import {
  getActiveWorkflowRunForTask,
  getPhaseById,
  listWorkflowRunsForTask,
  updateTask,
  type WorkflowRunRow,
} from '@circuit/db'

import { getDb } from '../db.js'

/** Derive tasks.workflow_status from workflow_runs (ADR 003 §8). */
export function deriveTaskWorkflowStatus(runs: WorkflowRunRow[]): string {
  const active = runs.find((run) => run.status === 'active')
  if (active) return 'active'

  const terminal = runs
    .filter((run) => run.status === 'completed' || run.status === 'cancelled')
    .sort((a, b) => {
      const aTime = a.completedAt ?? a.cancelledAt ?? a.startedAt
      const bTime = b.completedAt ?? b.cancelledAt ?? b.startedAt
      return bTime.localeCompare(aTime)
    })

  if (terminal.length === 0) return 'not_started'
  return terminal[0]!.status === 'completed' ? 'completed' : 'cancelled'
}

export function syncTaskWorkflowStatusFromRuns(taskId: string, now = new Date().toISOString()): void {
  const db = getDb()
  const runs = listWorkflowRunsForTask(db, taskId)
  const active = getActiveWorkflowRunForTask(db, taskId)
  const workflowStatus = deriveTaskWorkflowStatus(runs)

  const patch: Parameters<typeof updateTask>[2] = {
    workflowStatus,
    updatedAt: now,
  }

  if (active?.currentPhaseId) {
    const phase = getPhaseById(db, active.currentPhaseId)
    if (phase) {
      patch.currentPhase = phase.name
    }
  }

  updateTask(db, taskId, patch)
}

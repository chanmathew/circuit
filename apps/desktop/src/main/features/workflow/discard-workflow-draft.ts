import {
  deleteArtifact,
  deleteWorkflowRun,
  getActiveWorkflowRunForTask,
  getTaskById,
  getTicketArtifactForRun,
  insertWorkflowEvent,
  listPhasesForWorkflowRun,
} from '@circuit/db'
import { createId, NotFoundError, ValidationError } from '@circuit/shared'

import { getDb } from '../../db.js'
import { toWorkflowEventRow } from '../../services/feed-workflow-events.js'
import { syncTaskWorkflowStatusFromRuns } from '../../services/sync-task-workflow-status.js'
import { getTaskDetail, type TaskDetail } from '../../services/tasks.js'
import { canDiscardWorkflowDraft } from '../../../shared/workflow-run.js'

/** Remove ticket-only active run before any phase harness has started. */
export function discardWorkflowDraft(taskId: string): TaskDetail {
  const db = getDb()
  const task = getTaskById(db, taskId)
  if (!task) throw new NotFoundError('Task', taskId)

  const activeRun = getActiveWorkflowRunForTask(db, taskId)
  if (!activeRun) {
    throw new ValidationError('No active workflow draft to discard')
  }

  const phases = listPhasesForWorkflowRun(db, activeRun.id)
  if (
    !canDiscardWorkflowDraft(
      {
        id: activeRun.id,
        taskId: activeRun.taskId,
        status: activeRun.status as 'active' | 'completed' | 'cancelled',
        workflowType: activeRun.workflowType,
        title: activeRun.title,
        startedAt: activeRun.startedAt,
        completedAt: activeRun.completedAt ?? undefined,
        cancelledAt: activeRun.cancelledAt ?? undefined,
        currentPhaseId: activeRun.currentPhaseId ?? undefined,
      },
      phases,
    )
  ) {
    throw new ValidationError('Cannot discard — workflow phases have already started')
  }

  const ticket = getTicketArtifactForRun(db, activeRun.id)
  if (ticket) {
    deleteArtifact(db, ticket.id)
  }

  const now = new Date().toISOString()
  insertWorkflowEvent(
    db,
    toWorkflowEventRow({
      id: createId(),
      taskId,
      workflowRunId: activeRun.id,
      actor: 'user',
      type: 'workflow:discarded',
      summary: 'Workflow draft discarded',
      payload: { workflowRunId: activeRun.id },
      createdAt: now,
    }),
  )

  deleteWorkflowRun(db, activeRun.id)
  syncTaskWorkflowStatusFromRuns(taskId)

  return getTaskDetail(taskId)
}

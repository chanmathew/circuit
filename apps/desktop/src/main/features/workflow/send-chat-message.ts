import { getActiveWorkflowRunForTask, getPhaseByTaskAndName, getTaskById } from '@circuit/db'
import { NotFoundError, ValidationError } from '@circuit/shared'
import { isRevisionFeedback } from '@circuit/workflow'

import { getDb } from '../../db.js'
import { recordSteering } from '../../services/workflow-events.js'
import { scheduleChatMessage, schedulePhaseRun } from './background-phase-runner.js'
import { isPhaseRunLocked } from './phase-run-lock.js'
import { requestPhaseRevision } from './request-revision.js'
import type { TaskDetail } from '../../services/tasks.js'

/** Persist chat message event and start harness chat turn in the background. */
export function sendChatMessage(taskId: string, text: string): TaskDetail {
  const trimmed = text.trim()
  if (!trimmed) {
    throw new ValidationError('Chat message cannot be empty')
  }

  const task = getTaskById(getDb(), taskId)
  if (!task) {
    throw new NotFoundError('Task', taskId)
  }

  if (isPhaseRunLocked(taskId)) {
    throw new ValidationError('A chat run is already in progress for this task')
  }

  const db = getDb()
  const activeRun = getActiveWorkflowRunForTask(db, taskId)
  if (activeRun && task.currentPhase) {
    const phase = getPhaseByTaskAndName(db, taskId, task.currentPhase, activeRun.id)
    if (phase?.status === 'needs_review' && isRevisionFeedback(trimmed)) {
      const detail = requestPhaseRevision(taskId, task.currentPhase, trimmed, 'chat')
      schedulePhaseRun(taskId, task.currentPhase)
      return detail
    }
  }

  const detail = recordSteering(taskId, trimmed)
  scheduleChatMessage(taskId, trimmed)
  return detail
}

import { getTaskById } from '@circuit/db'
import { NotFoundError, ValidationError } from '@circuit/shared'

import { getDb } from '../../db.js'
import { recordSteering } from '../../services/workflow-events.js'
import { scheduleChatMessage } from './background-phase-runner.js'
import { isPhaseRunLocked } from './phase-run-lock.js'
import type { TaskDetail } from '../../services/tasks.js'

/** Persist steering event and start harness chat turn in the background. */
export function sendChatMessage(taskId: string, text: string): TaskDetail {
  const trimmed = text.trim()
  if (!trimmed) {
    throw new ValidationError('Chat message cannot be empty')
  }

  const task = getTaskById(getDb(), taskId)
  if (!task) {
    throw new NotFoundError('Task', taskId)
  }

  if (task.workflowType !== 'freeform') {
    throw new ValidationError('Chat messages require a freeform task')
  }

  if (isPhaseRunLocked(taskId)) {
    throw new ValidationError('A chat run is already in progress for this task')
  }

  const detail = recordSteering(taskId, trimmed)
  scheduleChatMessage(taskId, trimmed)
  return detail
}

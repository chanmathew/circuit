import { getTaskById, updateTask } from '@circuit/db'
import { generateTitle, NotFoundError, ValidationError } from '@circuit/shared'

import type { ComposerMode } from '../../../shared/api.js'
import { getDb } from '../../db.js'
import { getTaskDetail, taskNeedsIntake, type TaskDetail } from '../../services/tasks.js'
import { recordSteering } from '../../services/workflow-events.js'
import { bootstrapTaskFromIntake } from './bootstrap-intake.js'
import { scheduleChatMessage, schedulePhaseRun } from './background-phase-runner.js'

export { taskNeedsIntake } from '../../services/tasks.js'

function submitChatIntake(taskId: string, text: string): void {
  const db = getDb()
  const task = getTaskById(db, taskId)
  if (!task) throw new NotFoundError('Task', taskId)

  const title = generateTitle(text)
  updateTask(db, taskId, {
    title,
    description: text,
    workflowType: 'freeform',
    status: 'draft',
    currentPhase: 'chat',
    updatedAt: new Date().toISOString(),
  })
}

/** First composer message — mode selects chat (freeform) vs plan (structured bootstrap). */
export function submitTaskIntake(
  taskId: string,
  text: string,
  mode: ComposerMode = 'chat',
): TaskDetail {
  const trimmed = text.trim()
  if (!trimmed) {
    throw new ValidationError('Intake message cannot be empty')
  }

  const db = getDb()
  const task = getTaskById(db, taskId)
  if (!task) {
    throw new NotFoundError('Task', taskId)
  }

  if (!taskNeedsIntake(task)) {
    throw new ValidationError('Task intake already submitted')
  }

  if (mode === 'plan') {
    bootstrapTaskFromIntake(taskId, trimmed)
    const detail = recordSteering(taskId, trimmed)
    schedulePhaseRun(taskId, 'questions')
    return detail
  }

  if (mode !== 'chat') {
    throw new ValidationError(`Unknown intake mode: ${String(mode)}`)
  }

  submitChatIntake(taskId, trimmed)
  const detail = recordSteering(taskId, trimmed)
  scheduleChatMessage(taskId, trimmed)
  return detail
}

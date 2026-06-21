import { getTaskById, updateTask } from '@circuit/db'
import { generateTitle, NotFoundError, ValidationError } from '@circuit/shared'

import { getDb } from '../../db.js'
import { getTaskDetail, taskNeedsIntake, type TaskDetail } from '../../services/tasks.js'
import { recordSteering } from '../../services/workflow-events.js'
import { scheduleChatMessage } from './background-phase-runner.js'
import { enableWorkflow } from './start-workflow.js'
import { synthesizeTaskBrief } from './synthesize-task-brief.js'

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
    interactionMode: 'chat',
    workflowStatus: 'not_started',
    status: 'draft',
    currentPhase: 'chat',
    updatedAt: new Date().toISOString(),
  })
}

/** First composer message — always chat; workflow is enabled separately from the panel. */
export async function submitTaskIntake(taskId: string, text: string): Promise<TaskDetail> {
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

  submitChatIntake(taskId, trimmed)
  const detail = recordSteering(taskId, trimmed)
  scheduleChatMessage(taskId, trimmed)
  return detail
}

/** Enable workflow on an existing chat task (mid-conversation conversion). */
export async function enableWorkflowFromChat(
  taskId: string,
  text?: string,
  options?: { autoRunFirstPhase?: boolean; replaceActive?: boolean },
): Promise<TaskDetail> {
  const db = getDb()
  const task = getTaskById(db, taskId)
  if (!task) throw new NotFoundError('Task', taskId)

  const description = synthesizeTaskBrief(taskId, text?.trim() || task.description)
  if (text?.trim()) {
    recordSteering(taskId, text.trim())
  }

  const input = {
    description,
    autoRunFirstPhase: options?.autoRunFirstPhase ?? false,
  }

  if (options?.replaceActive) {
    const { cancelAndEnableWorkflow } = await import('./start-workflow.js')
    return cancelAndEnableWorkflow(taskId, input)
  }

  return enableWorkflow(taskId, input)
}

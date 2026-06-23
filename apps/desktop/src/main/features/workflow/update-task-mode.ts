import { getTaskById, updateTask } from '@circuit/db'
import { NotFoundError, ValidationError } from '@circuit/shared'
import { isValidTaskMode, type TaskMode } from '@circuit/workflow'

import { getDb } from '../../db.js'
import { getTaskDetail, type TaskDetail } from '../../services/tasks.js'
import { isWorkflowActive } from '../../../shared/workflow-status.js'

function assertValidTaskMode(taskMode: string): asserts taskMode is TaskMode {
  if (!isValidTaskMode(taskMode)) {
    throw new ValidationError(`Unsupported task mode: ${taskMode}`)
  }
}

export function updateTaskMode(taskId: string, taskMode: TaskMode): TaskDetail {
  assertValidTaskMode(taskMode)

  const db = getDb()
  const task = getTaskById(db, taskId)
  if (!task) {
    throw new NotFoundError('Task', taskId)
  }

  if (isWorkflowActive(task.workflowStatus)) {
    throw new ValidationError('Cannot change mode while a workflow is active')
  }

  updateTask(db, taskId, {
    taskMode,
    updatedAt: new Date().toISOString(),
  })

  return getTaskDetail(taskId)
}

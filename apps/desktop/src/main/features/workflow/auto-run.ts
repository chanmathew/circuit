import { getPhaseByTaskAndName, getTaskById } from '@circuit/db'
import { getWorkflowDefinition, type WorkflowType } from '@circuit/workflow'

import { getDb } from '../../db.js'
import type { TaskDetail } from '../../services/tasks.js'
import { runPhase } from './run-phase.js'

export async function autoRunOnTaskCreate(taskId: string): Promise<TaskDetail | undefined> {
  const db = getDb()
  const task = getTaskById(db, taskId)
  if (!task) return undefined

  const workflow = getWorkflowDefinition(task.workflowType as WorkflowType)
  if (!workflow || workflow.type !== 'structured_change') return undefined

  const questions = getPhaseByTaskAndName(db, taskId, 'questions')
  if (!questions || questions.status !== 'ready') return undefined

  return runPhase(taskId, 'questions')
}

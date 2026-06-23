import { createDraftTask, type TaskDetail } from '../../services/tasks.js'
import { submitTaskIntake } from './submit-intake.js'
import type { TaskMode } from '@circuit/workflow'

/** Create task on first composer message — nothing appears in the list until this runs. */
export async function createTaskFromIntake(
  repoId: string,
  text: string,
  taskMode: TaskMode = 'auto',
): Promise<TaskDetail> {
  const draft = createDraftTask(repoId, taskMode)
  return submitTaskIntake(draft.id, text)
}

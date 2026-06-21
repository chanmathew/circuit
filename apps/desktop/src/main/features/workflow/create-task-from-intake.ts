import { createDraftTask, type TaskDetail } from '../../services/tasks.js'
import { submitTaskIntake } from './submit-intake.js'

/** Create task on first composer message — nothing appears in the list until this runs. */
export async function createTaskFromIntake(repoId: string, text: string): Promise<TaskDetail> {
  const draft = createDraftTask(repoId)
  return submitTaskIntake(draft.id, text)
}

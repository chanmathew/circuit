import type { ComposerMode } from '../../../shared/api.js'
import { createDraftTask, type TaskDetail } from '../../services/tasks.js'
import { submitTaskIntake } from './submit-intake.js'

/** Create task on first composer message — nothing appears in the list until this runs. */
export function createTaskFromIntake(
  repoId: string,
  text: string,
  mode: ComposerMode = 'chat',
): TaskDetail {
  const draft = createDraftTask(repoId, mode)
  return submitTaskIntake(draft.id, text, mode)
}

import { recordHarnessActionResolved } from './persist-harness-action.js'
import { requireOpenCodeAdapter } from './require-opencode-adapter.js'

export interface RejectQuestionInput {
  taskId: string
  requestId: string
  workspacePath: string
}

export async function rejectHarnessQuestion(input: RejectQuestionInput): Promise<void> {
  const adapter = requireOpenCodeAdapter()
  await adapter.rejectQuestion(input)
  recordHarnessActionResolved(input.taskId, `question-${input.requestId}`)
}

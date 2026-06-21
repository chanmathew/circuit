import { recordHarnessActionResolved } from './persist-harness-action.js'
import { requireOpenCodeAdapter } from './require-opencode-adapter.js'

export interface ReplyQuestionInput {
  taskId: string
  requestId: string
  sessionId: string
  workspacePath: string
  answers: string[][]
}

export async function replyHarnessQuestion(input: ReplyQuestionInput): Promise<void> {
  const adapter = requireOpenCodeAdapter()
  await adapter.replyQuestion(input)
  recordHarnessActionResolved(input.taskId, `question-${input.requestId}`)
}

import { recordHarnessActionResolved } from './persist-harness-action.js'
import { requireOpenCodeAdapter } from './require-opencode-adapter.js'

export type PermissionReply = 'once' | 'always' | 'reject'

export interface ReplyPermissionInput {
  taskId: string
  sessionId: string
  permissionId: string
  response: PermissionReply
  workspacePath: string
}

export async function replyHarnessPermission(input: ReplyPermissionInput): Promise<void> {
  const adapter = requireOpenCodeAdapter()
  await adapter.replyPermission(input)
  recordHarnessActionResolved(input.taskId, `permission-${input.permissionId}`)
}

import type { AgentAdapter } from '@circuit/agent-adapters'
import { ValidationError } from '@circuit/shared'

import { getActiveAgentAdapterName, workflowAdapter } from './adapter.js'

type OpenCodeHarnessAdapter = AgentAdapter &
  Required<
    Pick<
      AgentAdapter,
      'replyPermission' | 'replyQuestion' | 'rejectQuestion' | 'abortSession'
    >
  >

export function requireOpenCodeAdapter(): OpenCodeHarnessAdapter {
  if (getActiveAgentAdapterName() !== 'opencode') {
    throw new ValidationError('This action requires the OpenCode adapter')
  }

  const adapter = workflowAdapter
  if (
    !adapter.replyPermission ||
    !adapter.replyQuestion ||
    !adapter.rejectQuestion ||
    !adapter.abortSession
  ) {
    throw new ValidationError('Active adapter does not support OpenCode harness IPC')
  }

  return adapter as OpenCodeHarnessAdapter
}

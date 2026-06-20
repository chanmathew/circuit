import { signalSessionAbort } from './phase-run-registry.js'
import { requireOpenCodeAdapter } from './require-opencode-adapter.js'

export interface AbortSessionInput {
  sessionId: string
  workspacePath: string
}

export async function abortSession(input: AbortSessionInput): Promise<void> {
  signalSessionAbort(input.sessionId)
  const adapter = requireOpenCodeAdapter()
  await adapter.abortSession(input)
}

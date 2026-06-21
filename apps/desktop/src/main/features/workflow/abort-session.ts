import { signalSessionAbort } from './phase-run-registry.js'
import { requireOpenCodeAdapter } from './require-opencode-adapter.js'

export interface AbortSessionInput {
  sessionId: string
  workspacePath: string
}

export async function abortSession(input: AbortSessionInput): Promise<void> {
  signalSessionAbort(input.sessionId)
  const adapter = requireOpenCodeAdapter()
  try {
    await adapter.abortSession(input)
  } catch {
    // Local cancel already rejected the in-flight run — OpenCode abort is best-effort.
  }
}

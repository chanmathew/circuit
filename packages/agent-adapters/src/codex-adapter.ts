import { CODEX_CAPABILITIES } from './capabilities.js'
import type { AgentAdapter } from './adapter.js'
import type { AgentActivityEvent, PhaseRunRequest, PhaseRunResult } from './types.js'

/**
 * Codex CLI adapter sketch — local JSONL sessions, ref-based transcript export.
 * Full implementation lands in M4 alongside OpenCode.
 */
export class CodexAdapter implements AgentAdapter {
  readonly name = 'codex'
  readonly capabilities = CODEX_CAPABILITIES

  async connect(): Promise<void> {
    throw new Error('Codex adapter not yet implemented')
  }

  async disconnect(): Promise<void> {
    // no-op
  }

  async runPhase(
    _request: PhaseRunRequest,
    _onActivity: (event: AgentActivityEvent) => void,
  ): Promise<PhaseRunResult> {
    throw new Error('Codex adapter not yet implemented')
  }

  async sendMessage(): Promise<void> {
    throw new Error('Codex adapter not yet implemented')
  }

  async fetchSessionMessages(_sessionId: string): Promise<never> {
    throw new Error('Codex adapter not yet implemented')
  }
}

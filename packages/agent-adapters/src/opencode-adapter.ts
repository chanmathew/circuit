import type { AgentAdapter } from './types.js'

export class OpenCodeAdapter implements AgentAdapter {
  readonly name = 'opencode'

  async connect(): Promise<void> {
    throw new Error('OpenCode adapter not yet implemented')
  }

  async disconnect(): Promise<void> {
    // no-op
  }

  async runPhase(): Promise<never> {
    throw new Error('OpenCode adapter not yet implemented')
  }
}

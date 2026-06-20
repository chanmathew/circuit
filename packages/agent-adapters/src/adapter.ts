import type { AgentAdapterCapabilities } from './capabilities.js'
import type { AgentActivityEvent, PhaseRunRequest, PhaseRunResult } from './types.js'

export type HarnessMessageRole = 'user' | 'assistant' | 'system'

/** Normalized harness message for stream projection — not Circuit durable storage. */
export interface HarnessSessionMessage {
  id: string
  role: HarnessMessageRole
  text: string
  timestamp: string
}

export interface SendMessageRequest {
  sessionId: string
  text: string
  workspacePath: string
}

export interface AgentAdapter {
  readonly name: string
  readonly capabilities: AgentAdapterCapabilities
  connect(): Promise<void>
  disconnect(): Promise<void>
  runPhase(
    request: PhaseRunRequest,
    onActivity: (event: AgentActivityEvent) => void,
  ): Promise<PhaseRunResult>
  /** Mid-run user message — only when capabilities.midRunMessaging is true. */
  sendMessage?(request: SendMessageRequest): Promise<void>
  /** Fetch session transcript for stream rebuild — when capabilities.sessionFetch is true. */
  fetchSessionMessages?(sessionId: string): Promise<HarnessSessionMessage[]>
}

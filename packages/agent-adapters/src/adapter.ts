import type { AgentAdapterCapabilities } from './capabilities.js'
import type {
  AgentActivityEvent,
  ChatTurnRequest,
  ChatTurnResult,
  PhaseRunRequest,
  PhaseRunResult,
} from './types.js'

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

export interface ReplyPermissionRequest {
  sessionId: string
  permissionId: string
  response: 'once' | 'always' | 'reject'
  workspacePath: string
}

export interface ReplyQuestionRequest {
  requestId: string
  sessionId: string
  workspacePath: string
  /** Selected option labels per question, in order. */
  answers: string[][]
}

export interface RejectQuestionRequest {
  requestId: string
  workspacePath: string
}

export interface AbortSessionRequest {
  sessionId: string
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
  /** Freeform chat turn — reuses sessionId when provided. */
  runChatTurn?(
    request: ChatTurnRequest,
    onActivity: (event: AgentActivityEvent) => void,
  ): Promise<ChatTurnResult>
  /** Mid-run user message — only when capabilities.midRunMessaging is true. */
  sendMessage?(request: SendMessageRequest): Promise<void>
  /** Respond to a harness permission prompt — OpenCode only. */
  replyPermission?(request: ReplyPermissionRequest): Promise<void>
  /** Answer a harness clarification question — OpenCode only. */
  replyQuestion?(request: ReplyQuestionRequest): Promise<void>
  /** Reject/dismiss a harness clarification question — OpenCode only. */
  rejectQuestion?(request: RejectQuestionRequest): Promise<void>
  /** Abort an in-flight harness session — OpenCode only. */
  abortSession?(request: AbortSessionRequest): Promise<void>
  /** Fetch session transcript for stream rebuild — when capabilities.sessionFetch is true. */
  fetchSessionMessages?(sessionId: string): Promise<HarnessSessionMessage[]>
}

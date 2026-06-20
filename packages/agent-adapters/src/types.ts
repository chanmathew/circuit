export interface AgentActivityEvent {
  type:
    | 'message'
    | 'tool_call'
    | 'file_read'
    | 'file_changed'
    | 'command'
    | 'permission_request'
    | 'question_request'
  timestamp: string
  content: string
  metadata?: Record<string, unknown>
}

export interface ContextPackPayload {
  hash: string
  files: { path: string; content: string }[]
}

export interface ChatTurnRequest {
  taskId: string
  workspacePath: string
  prompt: string
  sessionId?: string
  onSessionStarted?: (sessionId: string, abortRun: () => void) => void
}

export interface ChatTurnResult {
  sessionId: string
  transcript: string
  modelLabel?: string
}

export interface PhaseRunRequest {
  taskId: string
  phase: string
  prompt: string
  workspacePath: string
  readOnly: boolean
  sessionId: string
  contextPack: ContextPackPayload
  /** Called when harness session is created — register abort to cancel the run. */
  onSessionStarted?: (sessionId: string, abortRun: () => void) => void
}

export interface PhaseRunResult {
  sessionId: string
  contextPackHash: string
  transcript: string
  /** Path to harness-owned transcript (e.g. Codex session JSONL). */
  transcriptRef?: string
  filesRead: string[]
  filesChanged: string[]
  commandsRun: string[]
  artifactContent?: string
  /** Label stored on phase_runs — adapter-owned, not env-specific. */
  modelLabel?: string
}

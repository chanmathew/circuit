export interface AgentActivityEvent {
  type: 'message' | 'tool_call' | 'file_read' | 'file_changed' | 'command'
  timestamp: string
  content: string
  metadata?: Record<string, unknown>
}

export interface PhaseRunRequest {
  taskId: string
  phase: string
  prompt: string
  workspacePath: string
  readOnly: boolean
}

export interface PhaseRunResult {
  transcript: string
  filesRead: string[]
  filesChanged: string[]
  commandsRun: string[]
  artifactContent?: string
}

export interface AgentAdapter {
  readonly name: string
  connect(): Promise<void>
  disconnect(): Promise<void>
  runPhase(
    request: PhaseRunRequest,
    onActivity: (event: AgentActivityEvent) => void,
  ): Promise<PhaseRunResult>
}

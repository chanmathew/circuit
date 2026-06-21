/** Agent roles surfaced in the agent stream. */
export type AgentRole = 'driver' | 'oracle' | 'scout' | 'builder'

export type UserMessageItem = {
  kind: 'user_message'
  id: string
  text: string
  createdAt: string
}

export type AgentMessageItem = {
  kind: 'agent_message'
  id: string
  role: AgentRole
  text: string
  createdAt: string
}

export type ActivityStatus = 'running' | 'success' | 'failed' | 'warning' | 'info'

export type ReasoningItem = {
  kind: 'reasoning'
  id: string
  text: string
  isStreaming?: boolean
  duration?: number
  collapsed?: boolean
  createdAt: string
}

export type ActivityGroupDisplay = 'flat' | 'summary'

export type ActivityGroupRow = {
  label: string
  status: ActivityStatus
  /** Secondary detail — line range, command tokens, etc. */
  detail?: string
  additions?: number
  deletions?: number
  /** Workspace-relative path when this row refers to a file. */
  filePath?: string
  /** How the workbench should open this path when clicked. */
  openAs?: 'file' | 'diff'
}

export type ActivityGroupItem = {
  kind: 'activity_group'
  id: string
  title: string
  items: ActivityGroupRow[]
  /** Flat rows for small bursts; summary + expand for larger batches. */
  display?: ActivityGroupDisplay
  /** Session-level diff totals for summary rows. */
  stats?: { additions?: number; deletions?: number }
  collapsed?: boolean
  /** Ephemeral in-progress tool trace. */
  live?: boolean
  createdAt: string
}

export type SubagentRunItem = {
  kind: 'subagent_run'
  id: string
  subagentType: string
  description: string
  status: ActivityStatus
  childSessionId?: string
  stepCount?: number
  trace?: ActivityGroupItem
  collapsed?: boolean
  live?: boolean
  createdAt: string
}

export type ActionCardSeverity = 'info' | 'warning' | 'blocked' | 'no_ship'

export type StreamAction = {
  id: string
  label: string
  action: string
  payload?: Record<string, unknown>
}

export type StreamOption = {
  id: string
  label: string
  description?: string
  recommended?: boolean
}

export type ActionCardItem = {
  kind: 'action_card'
  id: string
  title: string
  summary?: string
  /** Secondary hint below actions (e.g. chat revision guidance). */
  footer?: string
  severity?: ActionCardSeverity
  options?: StreamOption[]
  actions: StreamAction[]
  createdAt: string
  /** Source protocol event id, when derived from a feed event. */
  eventId?: string
}

export type ReferenceTarget =
  | { type: 'artifact'; artifactId: string }
  | { type: 'file'; path: string }
  | { type: 'diff'; diffId: string }
  | { type: 'check'; checkId: string }
  | { type: 'review'; reviewId: string }

export type ReferenceCardItem = {
  kind: 'reference_card'
  id: string
  title: string
  summary?: string
  target: ReferenceTarget
  actions?: StreamAction[]
  createdAt: string
  /** Source protocol event id, when derived from a feed event. */
  eventId?: string
}

/** Renderer-facing union for the agent stream. */
export type StreamItem =
  | UserMessageItem
  | AgentMessageItem
  | ReasoningItem
  | ActivityGroupItem
  | SubagentRunItem
  | ActionCardItem
  | ReferenceCardItem

/** Live adapter activity normalized into stream groups or messages. */
export type StreamActivityEvent = {
  type:
    | 'message'
    | 'reasoning'
    | 'tool_call'
    | 'subagent_run'
    | 'file_read'
    | 'file_changed'
    | 'command'
    | 'permission_request'
    | 'question_request'
  timestamp: string
  content: string
  metadata?: Record<string, unknown>
}

/** Ephemeral or derived user messages merged into the stream projection. */
export type StreamUserMessage = {
  id: string
  text: string
  createdAt: string
}

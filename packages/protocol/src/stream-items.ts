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

export type ActivityGroupItem = {
  kind: 'activity_group'
  id: string
  title: string
  items: Array<{
    label: string
    status: ActivityStatus
  }>
  collapsed?: boolean
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
  | ActivityGroupItem
  | ActionCardItem
  | ReferenceCardItem

/** Live adapter activity normalized into stream groups or messages. */
export type StreamActivityEvent = {
  type: 'message' | 'tool_call' | 'file_read' | 'file_changed' | 'command'
  timestamp: string
  content: string
  metadata?: Record<string, unknown>
}

/** Persisted user chat messages merged into the stream. */
export type StreamUserMessage = {
  id: string
  text: string
  createdAt: string
}

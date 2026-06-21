import type { AgentActivityEvent } from './types.js'
import type { OpenCodeSessionMessage } from './opencode-client.js'

export type ActivityRunStatus = 'running' | 'completed' | 'error'

const TOOL_VERBS: Record<string, string> = {
  read: 'Reading',
  write: 'Writing',
  edit: 'Editing',
  patch: 'Editing',
  grep: 'Searching',
  glob: 'Searching',
  bash: 'Running',
  shell: 'Running',
  command: 'Running',
  list: 'Listing',
  search: 'Searching',
}

function asRunStatus(value: unknown): ActivityRunStatus | undefined {
  if (value === 'running') return 'running'
  if (value === 'completed') return 'completed'
  if (value === 'error') return 'error'
  return undefined
}

/** Cursor-style label for a tool invocation. */
export function formatToolLabel(input: {
  tool: string
  title?: string
  status?: ActivityRunStatus
}): string {
  const tool = input.tool.trim().toLowerCase() || 'tool'
  const title = input.title?.trim()
  const verb = TOOL_VERBS[tool] ?? (tool.charAt(0).toUpperCase() + tool.slice(1))

  if (title) {
    return `${verb} ${title}`
  }

  if (input.status === 'running') {
    return `${verb}…`
  }

  return verb
}

export function formatFileReadLabel(path: string): string {
  const name = path.split('/').pop() ?? path
  return `Read ${name}`
}

export function formatFileChangedLabel(path: string): string {
  const name = path.split('/').pop() ?? path
  return `Edited ${name}`
}

/** Aggregate completed tool/file activities into a Cursor-style summary line. */
export function summarizeActivities(activities: AgentActivityEvent[]): string {
  let reads = 0
  let edits = 0
  let commands = 0
  let tools = 0
  let runningLabel: string | undefined

  for (const activity of activities) {
    const status = asRunStatus(activity.metadata?.status)
    if (status === 'running') {
      runningLabel = activity.content
      continue
    }

    switch (activity.type) {
      case 'file_read':
        reads += 1
        break
      case 'file_changed':
        edits += 1
        break
      case 'command':
        commands += 1
        break
      case 'tool_call': {
        const tool =
          typeof activity.metadata?.tool === 'string' ? activity.metadata.tool.toLowerCase() : ''
        if (tool === 'task') break
        if (tool === 'edit' || tool === 'write' || tool === 'patch') {
          edits += 1
        } else {
          reads += 1
        }
        break
      }
      default:
        break
    }
  }

  if (runningLabel) return runningLabel

  const parts: string[] = []
  if (reads > 0) {
    parts.push(`Explored ${reads} ${reads === 1 ? 'file' : 'files'}`)
  }
  if (edits > 0) {
    parts.push(`Edited ${edits} ${edits === 1 ? 'file' : 'files'}`)
  }
  if (commands > 0) {
    parts.push(`Ran ${commands} ${commands === 1 ? 'command' : 'commands'}`)
  }
  if (tools > 0 && reads === 0 && edits === 0) {
    parts.push(`${tools} ${tools === 1 ? 'tool' : 'tools'}`)
  }

  if (parts.length === 0) return 'Working'
  return parts.join(' · ')
}

type SessionPart = OpenCodeSessionMessage['parts'][number] & {
  id?: string
  callID?: string
  tool?: string
  filename?: string
  url?: string
  state?: {
    status?: string
    title?: string
    input?: Record<string, unknown>
    additions?: number
    deletions?: number
    detail?: string
    metadata?: Record<string, unknown>
  }
}

export type FileDiffEntry = {
  file: string
  additions: number
  deletions: number
}

function toolDiffMetadata(state?: SessionPart['state']): Record<string, unknown> {
  if (!state) return {}
  const meta: Record<string, unknown> = {}
  const sources = [state as Record<string, unknown>, state.metadata]
  for (const source of sources) {
    if (!source) continue
    if (typeof source.additions === 'number') meta.additions = source.additions
    if (typeof source.deletions === 'number') meta.deletions = source.deletions
    if (typeof source.detail === 'string') meta.detail = source.detail
  }
  return meta
}

function fileBasename(path: string): string {
  return path.split('/').pop() ?? path
}

function matchFileDiff(pathOrTitle: string, diffs: FileDiffEntry[]): FileDiffEntry | undefined {
  const trimmed = pathOrTitle.trim()
  if (!trimmed) return undefined

  const basename = fileBasename(trimmed)
  return (
    diffs.find((entry) => entry.file === trimmed) ??
    diffs.find((entry) => fileBasename(entry.file) === basename) ??
    diffs.find((entry) => entry.file.endsWith(`/${basename}`))
  )
}

function isEditActivity(activity: AgentActivityEvent): boolean {
  if (activity.type === 'file_changed') return true
  if (activity.type !== 'tool_call') return false
  const tool = typeof activity.metadata?.tool === 'string' ? activity.metadata.tool.toLowerCase() : ''
  return tool === 'edit' || tool === 'write' || tool === 'patch'
}

function taskToolInput(state?: SessionPart['state']): Record<string, unknown> | undefined {
  const input = state?.input
  return input && typeof input === 'object' ? input : undefined
}

function taskToolChildSessionId(state?: SessionPart['state']): string | undefined {
  const sessionId = state?.metadata?.sessionId
  return typeof sessionId === 'string' ? sessionId : undefined
}

/** Map OpenCode `task` tool parts to structured subagent runs. */
export function mapTaskToolToSubagentRun(input: {
  state?: SessionPart['state']
  timestamp: string
  callId?: string
  sessionID?: string
  messageID?: string
}): AgentActivityEvent {
  const toolInput = taskToolInput(input.state)
  const subagentType =
    typeof toolInput?.subagent_type === 'string' ? toolInput.subagent_type : 'agent'
  const description =
    typeof toolInput?.description === 'string'
      ? toolInput.description
      : typeof input.state?.title === 'string'
        ? input.state.title
        : 'Subagent task'
  const status = asRunStatus(input.state?.status) ?? 'running'
  const childSessionId = taskToolChildSessionId(input.state)

  return {
    type: 'subagent_run',
    timestamp: input.timestamp,
    content: description,
    metadata: {
      subagentType,
      description,
      status,
      childSessionId,
      callId: input.callId,
      tool: 'task',
      sessionID: input.sessionID,
      messageID: input.messageID,
    },
  }
}

function isTraceActivity(activity: AgentActivityEvent): boolean {
  return (
    activity.type === 'reasoning' ||
    activity.type === 'tool_call' ||
    activity.type === 'file_read' ||
    activity.type === 'file_changed' ||
    activity.type === 'command'
  )
}

/** Stable key for upserting live trace rows (OpenCode emits many updates per tool call). */
export function traceActivityUpsertKey(activity: AgentActivityEvent): string | undefined {
  const callId = activity.metadata?.callId
  if (typeof callId === 'string' && callId.length > 0) return callId

  if (activity.type === 'file_read') {
    const path = activity.metadata?.path
    if (typeof path === 'string') return `file_read:${path}`
  }

  if (activity.type === 'reasoning') {
    const messageID = activity.metadata?.messageID
    if (typeof messageID === 'string') return `reasoning:${messageID}`
  }

  return undefined
}

/** Replace an in-progress trace row instead of appending duplicate streaming updates. */
export function upsertTraceActivity(
  trace: AgentActivityEvent[],
  activity: AgentActivityEvent,
): void {
  const key = traceActivityUpsertKey(activity)
  if (key) {
    const index = trace.findIndex((entry) => traceActivityUpsertKey(entry) === key)
    if (index >= 0) {
      trace[index] = activity
      return
    }
  }
  trace.push(activity)
}

/** Fetch nested child-session activities for completed subagent spawns. */
export function attachChildSessionTraces(
  activities: AgentActivityEvent[],
  fetchChildActivities: (childSessionId: string) => AgentActivityEvent[],
): AgentActivityEvent[] {
  return activities.map((activity) => {
    if (activity.type !== 'subagent_run') return activity

    const childSessionId =
      typeof activity.metadata?.childSessionId === 'string'
        ? activity.metadata.childSessionId
        : undefined
    if (!childSessionId) return activity

    const existing = activity.metadata?.childActivities
    if (Array.isArray(existing) && existing.length > 0) return activity

    const childActivities = fetchChildActivities(childSessionId).filter(isTraceActivity)
    if (childActivities.length === 0) return activity

    return {
      ...activity,
      metadata: {
        ...activity.metadata,
        childActivities,
      },
    }
  })
}

/** Attach OpenCode session.diff line counts to edit tool activities. */
export function enrichActivitiesWithFileDiffs(
  activities: AgentActivityEvent[],
  diffs: FileDiffEntry[],
): AgentActivityEvent[] {
  if (diffs.length === 0) return activities

  return activities.map((activity) => {
    if (!isEditActivity(activity)) return activity
    if (
      typeof activity.metadata?.additions === 'number' ||
      typeof activity.metadata?.deletions === 'number'
    ) {
      return activity
    }

    const pathOrTitle =
      typeof activity.metadata?.title === 'string'
        ? activity.metadata.title
        : typeof activity.metadata?.path === 'string'
          ? activity.metadata.path
          : activity.content.replace(/^Edited\s+/i, '')

    const match = matchFileDiff(pathOrTitle, diffs)
    if (!match) return activity

    return {
      ...activity,
      metadata: {
        ...activity.metadata,
        path: match.file,
        additions: match.additions,
        deletions: match.deletions,
      },
    }
  })
}

export function mapSessionPartToActivity(
  part: SessionPart,
  timestamp: string,
): AgentActivityEvent | null {
  if (part.type === 'reasoning' || part.type === 'thinking') {
    const text = typeof part.text === 'string' ? part.text.trim() : ''
    if (!text) return null
    return {
      type: 'reasoning',
      timestamp,
      content: text,
      metadata: { status: 'completed', messageID: part.messageID },
    }
  }

  if (part.type === 'text') {
    const text = typeof part.text === 'string' ? part.text.trim() : ''
    if (!text) return null
    return {
      type: 'message',
      timestamp,
      content: text,
      metadata: { messageID: part.messageID },
    }
  }

  if (part.type === 'file') {
    const path = part.filename ?? part.url ?? 'file'
    return {
      type: 'file_read',
      timestamp,
      content: formatFileReadLabel(path),
      metadata: { path, status: 'completed' },
    }
  }

  if (part.type === 'tool') {
    const tool = part.tool ?? 'tool'
    if (tool === 'task') {
      return mapTaskToolToSubagentRun({
        state: part.state,
        timestamp,
        callId: part.callID ?? part.id,
        messageID: part.messageID,
      })
    }
    const status = asRunStatus(part.state?.status) ?? 'completed'
    const title = part.state?.title
    const isEdit = tool === 'edit' || tool === 'write' || tool === 'patch'
    const content =
      isEdit && status === 'completed' && title
        ? formatFileChangedLabel(title)
        : formatToolLabel({ tool, title, status })
    return {
      type: 'tool_call',
      timestamp,
      content,
      metadata: {
        tool,
        status,
        title,
        callId: part.callID ?? part.id,
        messageID: part.messageID,
        ...toolDiffMetadata(part.state),
      },
    }
  }

  return null
}

/** Map live OpenCode tool event fields to a normalized activity. */
export function mapOpenCodeToolPartToActivity(part: {
  tool?: string
  state: {
    status?: string
    title?: string
    input?: Record<string, unknown>
    metadata?: Record<string, unknown>
    additions?: number
    deletions?: number
    detail?: string
  }
  sessionID?: string
  messageID?: string
  callId?: string
}): AgentActivityEvent {
  const tool = part.tool ?? 'tool'
  if (tool === 'task') {
    return mapTaskToolToSubagentRun({
      state: part.state,
      timestamp: new Date().toISOString(),
      callId: part.callId,
      sessionID: part.sessionID,
      messageID: part.messageID,
    })
  }
  const status = asRunStatus(part.state.status) ?? 'running'
  const title = part.state.title
  const isEdit = tool === 'edit' || tool === 'write' || tool === 'patch'
  const content =
    isEdit && status === 'completed' && title
      ? formatFileChangedLabel(title)
      : formatToolLabel({ tool, title, status })
  return {
    type: 'tool_call',
    timestamp: new Date().toISOString(),
    content,
    metadata: {
      tool,
      status,
      title,
      callId: part.callId,
      sessionID: part.sessionID,
      messageID: part.messageID,
      ...toolDiffMetadata(part.state),
    },
  }
}

export interface SessionActivitiesOptions {
  /** Only parts from the latest user→assistant turn. Default true. */
  latestTurnOnly?: boolean
  timestamp?: string
}

/** Replay normalized activities from persisted OpenCode session.messages. */
export function sessionMessagesToActivities(
  messages: OpenCodeSessionMessage[],
  options: SessionActivitiesOptions = {},
): AgentActivityEvent[] {
  const latestTurnOnly = options.latestTurnOnly ?? true
  const timestamp = options.timestamp ?? new Date().toISOString()
  const slice = latestTurnOnly ? sliceLatestTurnMessages(messages) : messages

  const activities: AgentActivityEvent[] = []
  for (const message of slice) {
    if (message.info.role !== 'assistant') continue
    for (const part of message.parts) {
      const activity = mapSessionPartToActivity(part, timestamp)
      if (activity) activities.push(activity)
    }
  }

  return activities
}

function sliceLatestTurnMessages(messages: OpenCodeSessionMessage[]): OpenCodeSessionMessage[] {
  let lastUserIndex = -1
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.info.role === 'user') {
      lastUserIndex = index
      break
    }
  }

  if (lastUserIndex === -1) {
    const lastAssistant = [...messages].reverse().find((entry) => entry.info.role === 'assistant')
    return lastAssistant ? [lastAssistant] : []
  }

  return messages.slice(lastUserIndex + 1)
}

/** Apply display labels and ensure metadata.status on adapter events. */
export function normalizeActivityEvent(event: AgentActivityEvent): AgentActivityEvent {
  const status = asRunStatus(event.metadata?.status)

  if (event.type === 'file_read') {
    const path =
      typeof event.metadata?.path === 'string' ? event.metadata.path : event.content
    return {
      ...event,
      content: formatFileReadLabel(path),
      metadata: { ...event.metadata, path, status: status ?? 'completed' },
    }
  }

  if (event.type === 'file_changed') {
    const path =
      typeof event.metadata?.path === 'string' ? event.metadata.path : event.content
    return {
      ...event,
      content: formatFileChangedLabel(path),
      metadata: { ...event.metadata, path, status: status ?? 'completed' },
    }
  }

  if (event.type === 'tool_call') {
    const tool = typeof event.metadata?.tool === 'string' ? event.metadata.tool : 'tool'
    const title =
      typeof event.metadata?.title === 'string' ? event.metadata.title : undefined
    return {
      ...event,
      content: formatToolLabel({ tool, title, status: status ?? 'completed' }),
      metadata: { ...event.metadata, tool, status: status ?? 'completed', title },
    }
  }

  if (event.type === 'reasoning') {
    return {
      ...event,
      metadata: { ...event.metadata, status: status ?? 'completed' },
    }
  }

  return event
}

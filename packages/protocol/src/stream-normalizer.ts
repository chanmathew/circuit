import type {
  CircuitArtifactBlock,
  CircuitBlockerBlock,
  CircuitDiffBlock,
  CircuitValidationBlock,
} from './blocks.js'
import type { DecisionRequiredPayload, RevisionInferencePayload } from './decisions.js'
import type { CircuitEvent } from './events.js'
import type {
  ActionCardItem,
  ActivityGroupItem,
  ActivityStatus,
  AgentMessageItem,
  AgentRole,
  ReferenceCardItem,
  StreamActivityEvent,
  StreamItem,
  StreamUserMessage,
  UserMessageItem,
} from './stream-items.js'

export interface NormalizeStreamOptions {
  /** Default agent role for prose messages without explicit role metadata. */
  defaultAgentRole?: AgentRole
  /** When true, phase lifecycle markers become a collapsed activity group. */
  includePhaseLifecycle?: boolean
}

export interface NormalizeStreamInput {
  events: CircuitEvent[]
  userMessages?: StreamUserMessage[]
  activityEvents?: StreamActivityEvent[]
  options?: NormalizeStreamOptions
}

type Timestamped = { sortKey: string; item: StreamItem }

function eventId(event: CircuitEvent, index: number): string {
  return event.id ?? `${event.type}-${index}`
}

function userMessageToItem(message: StreamUserMessage): UserMessageItem {
  return {
    kind: 'user_message',
    id: message.id,
    text: message.text,
    createdAt: message.createdAt,
  }
}

function agentMessageFromActivity(
  activity: StreamActivityEvent,
  index: number,
  role: AgentRole,
): AgentMessageItem {
  return {
    kind: 'agent_message',
    id: `activity-message-${index}`,
    role,
    text: activity.content,
    createdAt: activity.timestamp,
  }
}

function activityStatusFromType(type: StreamActivityEvent['type']): ActivityStatus {
  switch (type) {
    case 'file_read':
    case 'file_changed':
    case 'command':
    case 'tool_call':
      return 'success'
    case 'message':
      return 'info'
  }
}

function labelFromActivity(activity: StreamActivityEvent): string {
  if (activity.type === 'file_read' || activity.type === 'file_changed') {
    const path =
      typeof activity.metadata?.path === 'string' ? activity.metadata.path : activity.content
    const verb = activity.type === 'file_read' ? 'Read' : 'Changed'
    return `${verb} ${path}`
  }

  if (activity.type === 'command') {
    return activity.content.trim() || 'Ran command'
  }

  if (activity.type === 'tool_call') {
    return activity.content.trim() || 'Tool call'
  }

  return activity.content.trim() || 'Activity'
}

function activityToGroupItem(
  activity: StreamActivityEvent,
  index: number,
): ActivityGroupItem['items'][number] {
  return {
    label: labelFromActivity(activity),
    status: activityStatusFromType(activity.type),
  }
}

function decisionToActionCard(event: CircuitEvent, id: string): ActionCardItem {
  const payload = event.payload as DecisionRequiredPayload
  return {
    kind: 'action_card',
    id,
    title: payload.title,
    summary: payload.description,
    severity: 'warning',
    options: payload.options,
    actions: [
      {
        id: 'resolve',
        label: 'Choose option',
        action: 'decision.resolve',
        payload: { decisionId: payload.decisionId },
      },
    ],
    createdAt: event.timestamp,
    eventId: event.id,
  }
}

function blockerToActionCard(event: CircuitEvent, id: string): ActionCardItem {
  const payload = event.payload as CircuitBlockerBlock
  return {
    kind: 'action_card',
    id,
    title: payload.title,
    summary: payload.description,
    severity: 'blocked',
    actions: [
      {
        id: 'acknowledge',
        label: 'Acknowledge',
        action: 'blocker.acknowledge',
        payload: { blockerId: payload.blockerId },
      },
    ],
    createdAt: event.timestamp,
    eventId: event.id,
  }
}

function revisionToActionCard(event: CircuitEvent, id: string): ActionCardItem {
  const payload = event.payload as RevisionInferencePayload
  return {
    kind: 'action_card',
    id,
    title: `Revise ${payload.affectedPhase}?`,
    summary: payload.message,
    severity: 'warning',
    options: payload.options,
    actions: payload.options.map((option) => ({
      id: option.id,
      label: option.label,
      action: 'revision.infer',
      payload: {
        affectedPhase: payload.affectedPhase,
        optionId: option.id,
        stalePhases: payload.stalePhases,
      },
    })),
    createdAt: event.timestamp,
    eventId: event.id,
  }
}

function artifactToReferenceCard(event: CircuitEvent, id: string): ReferenceCardItem {
  const payload = event.payload as CircuitArtifactBlock
  const artifactId = payload.path
  return {
    kind: 'reference_card',
    id,
    title: payload.title,
    summary: payload.path,
    target: { type: 'artifact', artifactId },
    actions: [
      {
        id: 'open',
        label: 'Open',
        action: 'reference.open',
        payload: { target: { type: 'artifact', artifactId } },
      },
    ],
    createdAt: event.timestamp,
    eventId: event.id,
  }
}

function diffToReferenceCard(event: CircuitEvent, id: string): ReferenceCardItem {
  const payload = event.payload as CircuitDiffBlock
  const diffId = payload.sliceId ?? id
  const fileCount = payload.paths.length
  return {
    kind: 'reference_card',
    id,
    title: payload.summary ?? 'Diff ready',
    summary: `${fileCount} file${fileCount === 1 ? '' : 's'} changed`,
    target: { type: 'diff', diffId },
    actions: [
      {
        id: 'open',
        label: 'Open diff',
        action: 'reference.open',
        payload: { target: { type: 'diff', diffId } },
      },
    ],
    createdAt: event.timestamp,
    eventId: event.id,
  }
}

function validationToReferenceCard(event: CircuitEvent, id: string): ReferenceCardItem {
  const payload = event.payload as CircuitValidationBlock
  const passed = event.type === 'validation:passed'
  const checkId = payload.command
  return {
    kind: 'reference_card',
    id,
    title: passed ? 'Checks passed' : 'Checks failed',
    summary: `${payload.command} · exit ${payload.exitCode}`,
    target: { type: 'check', checkId },
    actions: [
      {
        id: 'open',
        label: 'Open checks',
        action: 'reference.open',
        payload: { target: { type: 'check', checkId } },
      },
      ...(passed
        ? []
        : [
            {
              id: 'fix',
              label: 'Ask to fix',
              action: 'check.ask_fix',
              payload: { checkId },
            },
          ]),
    ],
    createdAt: event.timestamp,
    eventId: event.id,
  }
}

function eventToStreamItem(event: CircuitEvent, index: number): StreamItem | null {
  const id = eventId(event, index)

  switch (event.type) {
    case 'decision:required':
      return decisionToActionCard(event, id)
    case 'blocker:raised':
      return blockerToActionCard(event, id)
    case 'artifact:written':
    case 'artifact:updated':
    case 'artifact:revised':
      return artifactToReferenceCard(event, id)
    case 'diff:ready':
      return diffToReferenceCard(event, id)
    case 'validation:passed':
    case 'validation:failed':
      return validationToReferenceCard(event, id)
    case 'agent:activity': {
      const payload = event.payload as {
        role?: AgentRole
        text?: string
        activityType?: StreamActivityEvent['type']
      }
      if (payload.activityType && payload.activityType !== 'message') {
        return null
      }
      const text = payload.text ?? ''
      if (!text.trim()) return null
      return {
        kind: 'agent_message',
        id,
        role: payload.role ?? 'driver',
        text,
        createdAt: event.timestamp,
      }
    }
    default:
      return null
  }
}

function phaseLifecycleGroup(
  events: CircuitEvent[],
  phaseRunId: string,
  createdAt: string,
): ActivityGroupItem | null {
  const started = events.some(
    (event) => event.type === 'phase:started' && event.phaseRunId === phaseRunId,
  )
  const completed = events.some(
    (event) => event.type === 'phase:completed' && event.phaseRunId === phaseRunId,
  )
  if (!started && !completed) return null

  const items: ActivityGroupItem['items'] = []
  if (started) items.push({ label: 'Phase run started', status: 'info' })
  if (completed) items.push({ label: 'Phase run completed', status: 'success' })

  return {
    kind: 'activity_group',
    id: `phase-run-${phaseRunId}`,
    title: 'Activity',
    items,
    collapsed: true,
    createdAt,
  }
}

function groupActivityEvents(
  activities: StreamActivityEvent[],
  groupId: string,
  title: string,
): ActivityGroupItem | null {
  const toolActivities = activities.filter((activity) => activity.type !== 'message')
  if (toolActivities.length === 0) return null

  return {
    kind: 'activity_group',
    id: groupId,
    title,
    items: toolActivities.map(activityToGroupItem),
    collapsed: false,
    createdAt: toolActivities[0]?.timestamp ?? new Date().toISOString(),
  }
}

/** Merge protocol events, user chat, and live activity into renderer stream items. */
export function eventsToStreamItems(input: NormalizeStreamInput): StreamItem[] {
  const { events, userMessages = [], activityEvents = [], options = {} } = input
  const defaultRole = options.defaultAgentRole ?? 'driver'
  const timestamped: Timestamped[] = []

  for (const message of userMessages) {
    timestamped.push({
      sortKey: message.createdAt,
      item: userMessageToItem(message),
    })
  }

  for (const [index, event] of events.entries()) {
    const item = eventToStreamItem(event, index)
    if (item) {
      timestamped.push({ sortKey: event.timestamp, item })
    }
  }

  if (options.includePhaseLifecycle) {
    const phaseRunIds = [
      ...new Set(events.map((event) => event.phaseRunId).filter(Boolean) as string[]),
    ]
    for (const phaseRunId of phaseRunIds) {
      const group = phaseLifecycleGroup(events, phaseRunId, events[0]?.timestamp ?? '')
      if (group) {
        timestamped.push({ sortKey: group.createdAt, item: group })
      }
    }
  }

  let messageIndex = 0
  let pendingActivities: StreamActivityEvent[] = []
  let pendingGroupId = 0

  const flushActivities = (timestamp: string): void => {
    if (pendingActivities.length === 0) return
    const group = groupActivityEvents(
      pendingActivities,
      `activity-group-${pendingGroupId++}`,
      'Activity',
    )
    pendingActivities = []
    if (group) {
      timestamped.push({ sortKey: timestamp, item: group })
    }
  }

  for (const [index, activity] of activityEvents.entries()) {
    if (activity.type === 'message') {
      flushActivities(activity.timestamp)
      timestamped.push({
        sortKey: activity.timestamp,
        item: agentMessageFromActivity(activity, messageIndex++, defaultRole),
      })
      continue
    }

    pendingActivities.push(activity)
  }

  if (pendingActivities.length > 0) {
    const last = pendingActivities[pendingActivities.length - 1]
    flushActivities(last?.timestamp ?? new Date().toISOString())
  }

  return timestamped.sort((a, b) => a.sortKey.localeCompare(b.sortKey)).map((entry) => entry.item)
}

/** Map a revision-inference payload to a stream action card (chat steering flow). */
export function revisionInferenceToStreamItem(
  payload: RevisionInferencePayload,
  id: string,
  createdAt: string,
): ActionCardItem {
  return revisionToActionCard(
    {
      type: 'task:updated',
      taskId: '',
      timestamp: createdAt,
      payload,
    },
    id,
  )
}

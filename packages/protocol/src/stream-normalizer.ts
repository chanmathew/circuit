import type {
  CircuitArtifactBlock,
  CircuitBlockerBlock,
  CircuitDiffBlock,
  CircuitValidationBlock,
} from './blocks.js'
import type { DecisionRequiredPayload, RevisionInferencePayload } from './decisions.js'
import type { CircuitEvent } from './events.js'
import type { WorkflowRevisionRequestedPayload, WorkflowSteeringPayload } from './workflow-events.js'
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
import { isHarnessMetaMessage } from './parsers.js'

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
    case 'permission_request':
      return 'warning'
    case 'question_request':
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
        payload: { decisionId: payload.decisionId, phase: payload.phase },
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

type HarnessPermissionPendingPayload = {
  cardId: string
  permissionId: string
  sessionId?: string
  content?: string
}

type OpenCodeQuestionOption = {
  label: string
  description?: string
}

type OpenCodeQuestionInfo = {
  question: string
  header: string
  options: OpenCodeQuestionOption[]
}

type HarnessQuestionPendingPayload = {
  cardId: string
  requestId: string
  sessionId?: string
  content?: string
  questions?: OpenCodeQuestionInfo[]
}

function harnessPermissionPendingToActionCard(
  event: CircuitEvent,
  id: string,
): ActionCardItem {
  const payload = event.payload as HarnessPermissionPendingPayload
  const permissionId = payload.permissionId
  const sessionId = payload.sessionId

  return {
    kind: 'action_card',
    id: payload.cardId ?? id,
    title: 'Permission required',
    summary: payload.content?.trim() || 'The agent needs approval to continue.',
    severity: 'warning',
    actions: [
      {
        id: 'once',
        label: 'Allow once',
        action: 'permission.reply',
        payload: { permissionId, sessionId, response: 'once' },
      },
      {
        id: 'always',
        label: 'Always allow',
        action: 'permission.reply',
        payload: { sessionId, permissionId, response: 'always' },
      },
      {
        id: 'reject',
        label: 'Reject',
        action: 'permission.reply',
        payload: { sessionId, permissionId, response: 'reject' },
      },
    ],
    createdAt: event.timestamp,
    eventId: event.id,
  }
}

function harnessQuestionPendingToActionCards(
  event: CircuitEvent,
  id: string,
): ActionCardItem[] {
  const payload = event.payload as HarnessQuestionPendingPayload
  const requestId = payload.requestId
  const sessionId = payload.sessionId
  const questions = Array.isArray(payload.questions) ? payload.questions : []

  if (questions.length === 0) {
    return [
      {
        kind: 'action_card',
        id: payload.cardId ?? id,
        title: 'Agent question',
        summary: payload.content?.trim() || 'The agent needs clarification.',
        severity: 'info',
        actions: [
          {
            id: 'dismiss',
            label: 'Dismiss',
            action: 'question.reject',
            payload: { requestId, sessionId },
          },
        ],
        createdAt: event.timestamp,
        eventId: event.id,
      },
    ]
  }

  return questions.map((question, questionIndex) => ({
    kind: 'action_card' as const,
    id:
      questions.length > 1
        ? `${payload.cardId ?? id}-${questionIndex}`
        : (payload.cardId ?? id),
    title:
      question.header ||
      (questions.length > 1 ? `Question ${questionIndex + 1} of ${questions.length}` : 'Agent question'),
    summary: question.question,
    severity: 'info' as const,
    options: question.options.map((option) => ({
      id: option.label,
      label: option.label,
      description: option.description,
    })),
    actions: [
      {
        id: 'reply',
        label: 'Submit answer',
        action: 'question.reply',
        payload: {
          requestId,
          sessionId,
          questionIndex,
          questionCount: questions.length,
        },
      },
    ],
    createdAt: event.timestamp,
    eventId: event.id,
  }))
}

function resolvedHarnessCardIds(events: CircuitEvent[]): Set<string> {
  const resolved = new Set<string>()
  for (const event of events) {
    if (event.type !== 'harness:action_resolved') continue
    const payload = event.payload as { cardId?: string }
    if (typeof payload.cardId === 'string') {
      resolved.add(payload.cardId)
      // Multi-question cards use suffixed ids — resolve all parts.
      for (let index = 0; index < 8; index += 1) {
        resolved.add(`${payload.cardId}-${index}`)
      }
    }
  }
  return resolved
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
    case 'workflow:steering_received': {
      const payload = event.payload as WorkflowSteeringPayload
      if (!payload.rawText.trim()) return null
      return {
        kind: 'user_message',
        id,
        text: payload.rawText,
        createdAt: event.timestamp,
      }
    }
    case 'workflow:revision_requested': {
      const payload = event.payload as WorkflowRevisionRequestedPayload
      return {
        kind: 'user_message',
        id,
        text: `Requested revision on ${payload.phase}: ${payload.note}`,
        createdAt: event.timestamp,
      }
    }
    case 'workflow:revision_inference':
      return revisionToActionCard(event, id)
    case 'harness:permission_pending':
      return harnessPermissionPendingToActionCard(event, id)
    case 'harness:question_pending': {
      const cards = harnessQuestionPendingToActionCards(event, id)
      return cards[0] ?? null
    }
    case 'harness:action_resolved':
      return null
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
  const resolvedHarnessIds = resolvedHarnessCardIds(events)

  for (const message of userMessages) {
    timestamped.push({
      sortKey: message.createdAt,
      item: userMessageToItem(message),
    })
  }

  for (const [index, event] of events.entries()) {
    if (event.type === 'harness:question_pending') {
      const cards = harnessQuestionPendingToActionCards(event, eventId(event, index))
      for (const card of cards) {
        if (resolvedHarnessIds.has(card.id)) continue
        timestamped.push({ sortKey: event.timestamp, item: card })
      }
      continue
    }

    const item = eventToStreamItem(event, index)
    if (item?.kind === 'action_card' && resolvedHarnessIds.has(item.id)) {
      continue
    }
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
      if (isHarnessMetaMessage(activity.content)) continue
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

function sortStreamItems(items: StreamItem[]): StreamItem[] {
  return [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

/** Append live activity events without re-parsing the persisted feed. */
export function mergeLiveActivities(
  baseItems: StreamItem[],
  activityEvents: StreamActivityEvent[],
  options?: Pick<NormalizeStreamOptions, 'defaultAgentRole'>,
): StreamItem[] {
  if (activityEvents.length === 0) return baseItems

  const persistedAgentTexts = new Set(
    baseItems
      .filter((item): item is AgentMessageItem => item.kind === 'agent_message')
      .map((item) => item.text.trim()),
  )
  const persistedUserTexts = new Set(
    baseItems
      .filter((item): item is UserMessageItem => item.kind === 'user_message')
      .map((item) => item.text.trim()),
  )

  const streamActivities = activityEvents.filter((activity) => {
    if (activity.type === 'permission_request' || activity.type === 'question_request') {
      return false
    }
    if (activity.type === 'message') {
      const text = activity.content.trim()
      if (isHarnessMetaMessage(text)) return false
      if (persistedUserTexts.has(text)) return false
      if (persistedAgentTexts.has(text)) return false
    }
    return true
  })
  const permissionCards = activityEvents
    .filter((activity) => activity.type === 'permission_request')
    .map((activity, index) => permissionRequestToActionCard(activity, index))
  const questionCards = activityEvents.flatMap((activity, index) =>
    activity.type === 'question_request' ? questionRequestToActionCards(activity, index) : [],
  )

  const tail =
    streamActivities.length > 0 ? eventsToStreamItems({ events: [], activityEvents: streamActivities, options }) : []

  return sortStreamItems([...baseItems, ...tail, ...permissionCards, ...questionCards])
}

function permissionRequestToActionCard(
  activity: StreamActivityEvent,
  index: number,
): ActionCardItem {
  const permissionId =
    typeof activity.metadata?.permissionId === 'string' ? activity.metadata.permissionId : `perm-${index}`
  const sessionId =
    typeof activity.metadata?.sessionId === 'string' ? activity.metadata.sessionId : undefined

  return {
    kind: 'action_card',
    id: `permission-${permissionId}`,
    title: 'Permission required',
    summary: activity.content.trim() || 'The agent needs approval to continue.',
    severity: 'warning',
    actions: [
      {
        id: 'once',
        label: 'Allow once',
        action: 'permission.reply',
        payload: { permissionId, sessionId, response: 'once' },
      },
      {
        id: 'always',
        label: 'Always allow',
        action: 'permission.reply',
        payload: { sessionId, permissionId, response: 'always' },
      },
      {
        id: 'reject',
        label: 'Reject',
        action: 'permission.reply',
        payload: { sessionId, permissionId, response: 'reject' },
      },
    ],
    createdAt: activity.timestamp,
  }
}

function questionRequestToActionCards(
  activity: StreamActivityEvent,
  activityIndex: number,
): ActionCardItem[] {
  const requestId =
    typeof activity.metadata?.requestId === 'string'
      ? activity.metadata.requestId
      : `question-${activityIndex}`
  const sessionId =
    typeof activity.metadata?.sessionId === 'string' ? activity.metadata.sessionId : undefined
  const questions = Array.isArray(activity.metadata?.questions)
    ? (activity.metadata.questions as OpenCodeQuestionInfo[])
    : []

  if (questions.length === 0) {
    return [
      {
        kind: 'action_card',
        id: `question-${requestId}`,
        title: 'Agent question',
        summary: activity.content.trim() || 'The agent needs clarification.',
        severity: 'info',
        actions: [
          {
            id: 'dismiss',
            label: 'Dismiss',
            action: 'question.reject',
            payload: { requestId, sessionId },
          },
        ],
        createdAt: activity.timestamp,
      },
    ]
  }

  const question = questions[0]!
  const questionCount = questions.length

  return questions.map((entry, questionIndex) => ({
    kind: 'action_card' as const,
    id: questionCount > 1 ? `question-${requestId}-${questionIndex}` : `question-${requestId}`,
    title:
      entry.header ||
      (questionCount > 1 ? `Question ${questionIndex + 1} of ${questionCount}` : 'Agent question'),
    summary: entry.question,
    severity: 'info' as const,
    options: entry.options.map((option) => ({
      id: option.label,
      label: option.label,
      description: option.description,
    })),
    actions: [
      {
        id: 'reply',
        label: 'Submit answer',
        action: 'question.reply',
        payload: { requestId, sessionId, questionIndex, questionCount },
      },
    ],
    createdAt: activity.timestamp,
  }))
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

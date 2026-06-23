import type {
  CircuitArtifactBlock,
  CircuitBlockerBlock,
  CircuitDiffBlock,
  CircuitValidationBlock,
} from './blocks.js'
import type { DecisionRequiredPayload, RevisionInferencePayload } from './decisions.js'
import type { CircuitEvent } from './events.js'
import type {
  WorkflowRevisionRequestedPayload,
  WorkflowSteeringPayload,
  WorkflowEnabledPayload,
  PhaseLifecyclePayload,
} from './workflow-events.js'
import type {
  ActionCardItem,
  ActivityGroupItem,
  ActivityStatus,
  AgentMessageItem,
  AgentRole,
  ReasoningItem,
  ReferenceCardItem,
  StreamActivityEvent,
  StreamItem,
  StreamUserMessage,
  SubagentRunItem,
  UserMessageItem,
} from './stream-items.js'
import { parseFileTargetFromLabel } from './activity-file-target.js'
import { isHarnessMetaMessage, isPhaseHarnessPrompt } from './parsers.js'

function isSuppressedHarnessMessage(content: string): boolean {
  return isHarnessMetaMessage(content) || isPhaseHarnessPrompt(content)
}

export interface NormalizeStreamOptions {
  /** Default agent role for prose messages without explicit role metadata. */
  defaultAgentRole?: AgentRole
  /** When true, phase lifecycle markers become a collapsed activity group. */
  includePhaseLifecycle?: boolean
  /** When set, phase:completed cards only appear for phases in needs_review. */
  phaseStatuses?: Record<string, string>
  /** Human-readable artifact titles keyed by phase (for artifact-ready cards). */
  artifactTitlesByPhase?: Record<string, string>
  /** Contextual proceed CTA labels keyed by phase (from workflow definitions). */
  nextStepLabelsByPhase?: Record<string, string>
}

export interface NormalizeStreamInput {
  events: CircuitEvent[]
  userMessages?: StreamUserMessage[]
  activityEvents?: StreamActivityEvent[]
  options?: NormalizeStreamOptions
}

type Timestamped = { sortKey: string; sequence: number; item: StreamItem }

type ActivityAppendState = {
  messageIndex: number
  reasoningIndex: number
  pendingGroupId: number
  pendingActivities: StreamActivityEvent[]
  knownAgentTexts: Set<string>
  sequence: number
  harnessCardIndex: number
}

function pushTimestamped(
  timestamped: Timestamped[],
  sortKey: string,
  item: StreamItem,
  state: ActivityAppendState,
): void {
  timestamped.push({ sortKey, sequence: state.sequence++, item })
}

function trimPostReplyReasoning(activities: StreamActivityEvent[]): StreamActivityEvent[] {
  let lastMessageIndex = -1
  for (let index = activities.length - 1; index >= 0; index -= 1) {
    const activity = activities[index]
    if (
      activity?.type === 'message' &&
      !isSuppressedHarnessMessage(activity.content) &&
      activity.content.trim()
    ) {
      lastMessageIndex = index
      break
    }
  }
  if (lastMessageIndex === -1) return activities
  return activities.filter(
    (activity, index) => index <= lastMessageIndex || activity.type !== 'reasoning',
  )
}

function turnActivitySortKey(baseKey: string, index: number): string {
  return `${baseKey}#${String(index).padStart(5, '0')}`
}

function turnReplySortKey(baseKey: string): string {
  return `${baseKey}#reply`
}

/** Sort after turn activities and the assistant reply for the same phase run. */
function phaseCompletedSortKey(baseKey: string): string {
  return `${baseKey}#zzz`
}

function phaseRunIdsWithTurnActivities(events: CircuitEvent[]): Set<string> {
  const ids = new Set<string>()
  for (const event of events) {
    if (event.type === 'harness:turn_activities' && event.phaseRunId) {
      ids.add(event.phaseRunId)
    }
  }
  return ids
}

function phaseRunStartTimestamp(events: CircuitEvent[], phaseRunId: string): string | undefined {
  return events.find((entry) => entry.phaseRunId === phaseRunId && entry.type === 'phase:started')
    ?.timestamp
}

function appendActivitiesToStream(
  timestamped: Timestamped[],
  activities: StreamActivityEvent[],
  sortKey: string,
  state: ActivityAppendState,
  defaultRole: AgentRole,
): void {
  const ordered = trimPostReplyReasoning(activities)

  const flushActivities = (itemSortKey: string): void => {
    if (state.pendingActivities.length === 0) return
    const group = groupActivityEvents(
      state.pendingActivities,
      `activity-group-${state.pendingGroupId++}`,
    )
    state.pendingActivities = []
    if (group) {
      pushTimestamped(timestamped, itemSortKey, group, state)
    }
  }

  for (const [activityIndex, activity] of ordered.entries()) {
    const itemSortKey = turnActivitySortKey(sortKey, activityIndex)

    if (activity.type === 'reasoning') {
      flushActivities(itemSortKey)
      pushTimestamped(
        timestamped,
        itemSortKey,
        reasoningToItem(activity, state.reasoningIndex++),
        state,
      )
      continue
    }

    if (activity.type === 'message') {
      flushActivities(itemSortKey)
      // Agent reply comes from harness transcript; keep message here as fallback only.
      if (isSuppressedHarnessMessage(activity.content)) continue
      const text = activity.content.trim()
      if (!state.knownAgentTexts.has(text)) {
        pushTimestamped(
          timestamped,
          turnReplySortKey(sortKey),
          agentMessageFromActivity(activity, state.messageIndex++, defaultRole),
          state,
        )
        state.knownAgentTexts.add(text)
      }
      continue
    }

    if (activity.type === 'subagent_run') {
      flushActivities(itemSortKey)
      pushTimestamped(
        timestamped,
        itemSortKey,
        subagentRunToItem(activity, state.reasoningIndex++),
        state,
      )
      continue
    }

    if (activity.type === 'permission_request') {
      flushActivities(itemSortKey)
      pushTimestamped(
        timestamped,
        itemSortKey,
        permissionRequestToActionCard(activity, state.harnessCardIndex++),
        state,
      )
      continue
    }

    if (activity.type === 'question_request') {
      flushActivities(itemSortKey)
      const cards = questionRequestToActionCards(activity, state.harnessCardIndex++)
      for (const card of cards) {
        pushTimestamped(timestamped, itemSortKey, card, state)
      }
      continue
    }

    state.pendingActivities.push(activity)
  }

  if (state.pendingActivities.length > 0) {
    flushActivities(turnActivitySortKey(sortKey, ordered.length))
  }
}

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
  options?: { isStreaming?: boolean },
): AgentMessageItem {
  const messageId =
    typeof activity.metadata?.messageID === 'string' ? activity.metadata.messageID : undefined
  return {
    kind: 'agent_message',
    id: messageId ? `message-${messageId}` : `activity-message-${index}`,
    role,
    text: activity.content,
    createdAt: activity.timestamp,
    ...(options?.isStreaming ? { isStreaming: true } : {}),
  }
}

function activityStatusFromActivity(activity: StreamActivityEvent): ActivityStatus {
  const runStatus = activity.metadata?.status
  if (runStatus === 'running') return 'running'
  if (runStatus === 'error') return 'failed'
  if (runStatus === 'completed') return 'success'

  switch (activity.type) {
    case 'file_read':
    case 'file_changed':
    case 'command':
    case 'tool_call':
      return 'success'
    case 'message':
    case 'reasoning':
      return 'info'
    case 'permission_request':
      return 'warning'
    case 'question_request':
      return 'info'
    case 'subagent_run':
      return 'success'
  }
}

const FLAT_ACTIVITY_THRESHOLD = 3

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function computeGroupStats(items: ActivityGroupItem['items']): ActivityGroupItem['stats'] {
  let additions = 0
  let deletions = 0
  let hasAdditions = false
  let hasDeletions = false

  for (const item of items) {
    if (item.additions !== undefined) {
      additions += item.additions
      hasAdditions = true
    }
    if (item.deletions !== undefined) {
      deletions += item.deletions
      hasDeletions = true
    }
  }

  if (!hasAdditions && !hasDeletions) return undefined
  return {
    additions: hasAdditions ? additions : undefined,
    deletions: hasDeletions ? deletions : undefined,
  }
}

function summarizeStreamActivities(activities: StreamActivityEvent[]): string {
  let reads = 0
  let edits = 0
  let searches = 0
  let fetches = 0
  let commands = 0
  let runningLabel: string | undefined

  for (const activity of activities) {
    if (activity.metadata?.status === 'running') {
      runningLabel = labelFromActivity(activity)
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
        if (tool === 'edit' || tool === 'write' || tool === 'patch') {
          edits += 1
        } else if (tool === 'grep' || tool === 'glob' || tool === 'search' || tool === 'list') {
          searches += 1
        } else if (tool === 'fetch' || tool === 'web') {
          fetches += 1
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
  if (edits > 0) parts.push(`Edited ${edits} ${edits === 1 ? 'file' : 'files'}`)
  if (reads > 0) parts.push(`Explored ${reads} ${reads === 1 ? 'file' : 'files'}`)
  if (searches > 0) parts.push(`${searches} ${searches === 1 ? 'search' : 'searches'}`)
  if (fetches > 0) parts.push(`${fetches} ${fetches === 1 ? 'fetch' : 'fetches'}`)
  if (commands > 0) parts.push(`Ran ${commands} ${commands === 1 ? 'command' : 'commands'}`)
  return parts.length > 0 ? parts.join(', ') : 'Working'
}

function humanizeSubagentType(value: string): string {
  const labels: Record<string, string> = {
    explore: 'Explore',
    generalPurpose: 'Agent',
    shell: 'Shell',
  }
  return labels[value] ?? value.charAt(0).toUpperCase() + value.slice(1)
}

function childActivitiesFromMetadata(metadata?: Record<string, unknown>): StreamActivityEvent[] {
  if (!Array.isArray(metadata?.childActivities)) return []
  return metadata.childActivities as StreamActivityEvent[]
}

function subagentRunToItem(activity: StreamActivityEvent, index: number): SubagentRunItem {
  const subagentType =
    typeof activity.metadata?.subagentType === 'string' ? activity.metadata.subagentType : 'agent'
  const description =
    typeof activity.metadata?.description === 'string'
      ? activity.metadata.description
      : activity.content.trim() || 'Subagent task'
  const runStatus = activity.metadata?.status
  const status: ActivityStatus =
    runStatus === 'running' ? 'running' : runStatus === 'error' ? 'failed' : 'success'
  const childSessionId =
    typeof activity.metadata?.childSessionId === 'string'
      ? activity.metadata.childSessionId
      : undefined
  const callId =
    typeof activity.metadata?.callId === 'string' ? activity.metadata.callId : undefined
  const childActivities = childActivitiesFromMetadata(activity.metadata)
  const trace = buildActivityGroup(
    childActivities.filter(
      (entry) =>
        entry.type !== 'message' && entry.type !== 'subagent_run' && entry.type !== 'reasoning',
    ),
    `subagent-trace-${callId ?? index}`,
    { live: status === 'running', title: humanizeSubagentType(subagentType) },
  )

  return {
    kind: 'subagent_run',
    id: callId ?? `subagent-${index}-${activity.timestamp}`,
    subagentType: humanizeSubagentType(subagentType),
    description,
    status,
    childSessionId,
    stepCount: trace?.items.length,
    trace: trace ?? undefined,
    collapsed: status !== 'running',
    live: status === 'running',
    createdAt: activity.timestamp,
  }
}

function reasoningToItem(activity: StreamActivityEvent, index: number): ReasoningItem {
  const messageId =
    typeof activity.metadata?.messageID === 'string' ? activity.metadata.messageID : undefined
  const isRunning = activity.metadata?.status === 'running'
  return {
    kind: 'reasoning',
    id: messageId ? `reasoning-${messageId}` : `reasoning-${index}-${activity.timestamp}`,
    text: activity.content,
    isStreaming: isRunning,
    collapsed: !isRunning,
    createdAt: activity.timestamp,
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

function inferOpenAsFromActivity(activity: StreamActivityEvent): 'file' | 'diff' | undefined {
  if (
    readNumber(activity.metadata?.additions) != null ||
    readNumber(activity.metadata?.deletions) != null
  ) {
    return 'diff'
  }

  return parseFileTargetFromLabel(labelFromActivity(activity)).openAs
}

function resolveActivityFileTarget(activity: StreamActivityEvent): {
  filePath?: string
  openAs?: 'file' | 'diff'
} {
  const path =
    typeof activity.metadata?.path === 'string'
      ? activity.metadata.path
      : typeof activity.metadata?.title === 'string'
        ? activity.metadata.title
        : undefined

  if (activity.type === 'file_read') {
    return { filePath: path, openAs: 'file' }
  }
  if (activity.type === 'file_changed') {
    return { filePath: path, openAs: 'diff' }
  }
  if (activity.type === 'tool_call') {
    const tool =
      typeof activity.metadata?.tool === 'string' ? activity.metadata.tool.toLowerCase() : ''
    if (tool === 'edit' || tool === 'write' || tool === 'patch') {
      return { filePath: path, openAs: 'diff' }
    }
    if (tool === 'read') {
      return { filePath: path, openAs: 'file' }
    }
  }

  return parseFileTargetFromLabel(labelFromActivity(activity))
}

function activityToGroupItem(
  activity: StreamActivityEvent,
  _index: number,
): ActivityGroupItem['items'][number] {
  const fileTarget = resolveActivityFileTarget(activity)
  const openAs = fileTarget.openAs ?? inferOpenAsFromActivity(activity)
  return {
    label: labelFromActivity(activity),
    status: activityStatusFromActivity(activity),
    detail: typeof activity.metadata?.detail === 'string' ? activity.metadata.detail : undefined,
    additions: readNumber(activity.metadata?.additions),
    deletions: readNumber(activity.metadata?.deletions),
    ...(fileTarget.filePath ? { filePath: fileTarget.filePath } : {}),
    ...(openAs ? { openAs } : {}),
  }
}

function buildActivityGroup(
  toolActivities: StreamActivityEvent[],
  groupId: string,
  options: { live?: boolean; title?: string },
): ActivityGroupItem | null {
  if (toolActivities.length === 0) return null

  const items = toolActivities.map(activityToGroupItem)
  const display = items.length <= FLAT_ACTIVITY_THRESHOLD ? 'flat' : 'summary'
  const hasRunning = items.some((entry) => entry.status === 'running')

  return {
    kind: 'activity_group',
    id: groupId,
    title: options.title ?? summarizeStreamActivities(toolActivities),
    items,
    display,
    stats: computeGroupStats(items),
    collapsed: false,
    live: options.live,
    createdAt: toolActivities[0]?.timestamp ?? new Date().toISOString(),
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
    title: 'Apply to workflow?',
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

const CHAT_PHASE = 'chat'

function formatPhaseLabel(phase: string): string {
  return phase
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function isWorkflowPhase(phase: string | undefined): phase is string {
  return Boolean(phase && phase !== CHAT_PHASE)
}

function workflowEnabledToActionCard(event: CircuitEvent, id: string): ActionCardItem {
  const payload = event.payload as WorkflowEnabledPayload
  return {
    kind: 'action_card',
    id,
    title: 'Workflow attached',
    summary: payload.workflowType
      ? `Template: ${formatPhaseLabel(payload.workflowType)}`
      : 'Structured workflow is ready in the panel.',
    severity: 'info',
    actions: [
      {
        id: 'open-overview',
        label: 'Open overview',
        action: 'workflow.openOverview',
      },
    ],
    createdAt: event.timestamp,
    eventId: event.id,
  }
}

function phaseCompletedToActionCard(
  event: CircuitEvent,
  id: string,
  options: NormalizeStreamOptions,
): ActionCardItem | null {
  const payload = event.payload as PhaseLifecyclePayload
  if (!isWorkflowPhase(payload.phase)) return null

  const phaseLabel = formatPhaseLabel(payload.phase)
  const artifactTitle =
    options.artifactTitlesByPhase?.[payload.phase] ?? `${phaseLabel.toLowerCase()} artifact`
  const nextStepLabel = options.nextStepLabelsByPhase?.[payload.phase] ?? `Run ${phaseLabel}`

  return {
    kind: 'action_card',
    id,
    title: `${phaseLabel} ready`,
    summary: `${artifactTitle} is ready. Review the output, then proceed when it looks good.`,
    footer: 'Need changes? Tell the agent in chat.',
    severity: 'info',
    actions: [
      {
        id: 'view',
        label: 'View',
        action: 'phase.open',
        payload: { phase: payload.phase },
      },
      {
        id: 'proceed',
        label: nextStepLabel,
        action: 'phase.approve',
        payload: { phase: payload.phase },
      },
    ],
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

function harnessPermissionPendingToActionCard(event: CircuitEvent, id: string): ActionCardItem {
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

function harnessQuestionPendingToActionCards(event: CircuitEvent, id: string): ActionCardItem[] {
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
    id: questions.length > 1 ? `${payload.cardId ?? id}-${questionIndex}` : (payload.cardId ?? id),
    title:
      question.header ||
      (questions.length > 1
        ? `Question ${questionIndex + 1} of ${questions.length}`
        : 'Agent question'),
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

function eventToStreamItem(
  event: CircuitEvent,
  index: number,
  options: NormalizeStreamOptions = {},
): StreamItem | null {
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
    case 'workflow:enabled':
      return workflowEnabledToActionCard(event, id)
    case 'workflow:completed':
    case 'workflow:cancelled':
    case 'workflow:follow_up_started':
      return null
    case 'phase:completed':
      return phaseCompletedToActionCard(event, id, options)
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
  title?: string,
): ActivityGroupItem | null {
  const toolActivities = activities.filter(
    (activity) =>
      activity.type !== 'message' &&
      activity.type !== 'reasoning' &&
      activity.type !== 'subagent_run' &&
      activity.type !== 'permission_request' &&
      activity.type !== 'question_request',
  )
  return buildActivityGroup(toolActivities, groupId, { title })
}

/** Merge protocol events, user chat, and live activity into renderer stream items. */
export function eventsToStreamItems(input: NormalizeStreamInput): StreamItem[] {
  const { events, userMessages = [], activityEvents = [], options = {} } = input
  const defaultRole = options.defaultAgentRole ?? 'driver'
  const timestamped: Timestamped[] = []
  const resolvedHarnessIds = resolvedHarnessCardIds(events)
  const activityState: ActivityAppendState = {
    messageIndex: 0,
    reasoningIndex: 0,
    pendingGroupId: 0,
    pendingActivities: [],
    knownAgentTexts: new Set<string>(),
    sequence: 0,
    harnessCardIndex: 0,
  }
  const turnActivityRunIds = phaseRunIdsWithTurnActivities(events)

  for (const message of userMessages) {
    pushTimestamped(timestamped, message.createdAt, userMessageToItem(message), activityState)
  }

  for (const [index, event] of events.entries()) {
    if (event.type === 'harness:turn_activities') {
      const payload = event.payload as { activities?: StreamActivityEvent[] }
      const activities = payload.activities ?? []
      if (activities.length > 0) {
        const runStart = event.phaseRunId
          ? phaseRunStartTimestamp(events, event.phaseRunId)
          : undefined
        appendActivitiesToStream(
          timestamped,
          activities,
          runStart ?? event.timestamp,
          activityState,
          defaultRole,
        )
      }
      continue
    }

    if (event.type === 'agent:activity' && event.phaseRunId) {
      const item = eventToStreamItem(event, index, options)
      if (item?.kind === 'agent_message') {
        const text = item.text.trim()
        if (!activityState.knownAgentTexts.has(text)) {
          const runStart = phaseRunStartTimestamp(events, event.phaseRunId) ?? event.timestamp
          const sortKey = turnActivityRunIds.has(event.phaseRunId)
            ? turnReplySortKey(runStart)
            : event.timestamp
          pushTimestamped(timestamped, sortKey, item, activityState)
          activityState.knownAgentTexts.add(text)
        }
        continue
      }
    }

    if (event.type === 'harness:question_pending') {
      const cards = harnessQuestionPendingToActionCards(event, eventId(event, index))
      for (const card of cards) {
        if (resolvedHarnessIds.has(card.id)) continue
        pushTimestamped(timestamped, event.timestamp, card, activityState)
      }
      continue
    }

    if (event.type === 'phase:completed') {
      const payload = event.payload as PhaseLifecyclePayload
      if (!isWorkflowPhase(payload.phase)) continue
      const statuses = options.phaseStatuses
      if (statuses && statuses[payload.phase] !== 'needs_review') continue

      const completedCard = phaseCompletedToActionCard(event, eventId(event, index), options)
      if (completedCard) {
        const runStart = event.phaseRunId
          ? phaseRunStartTimestamp(events, event.phaseRunId)
          : undefined
        const sortKey =
          runStart && event.phaseRunId && turnActivityRunIds.has(event.phaseRunId)
            ? phaseCompletedSortKey(runStart)
            : event.timestamp
        pushTimestamped(timestamped, sortKey, completedCard, activityState)
      }
      continue
    }

    const item = eventToStreamItem(event, index, options)
    if (item?.kind === 'action_card' && resolvedHarnessIds.has(item.id)) {
      continue
    }
    if (item) {
      if (item.kind === 'agent_message') {
        activityState.knownAgentTexts.add(item.text.trim())
      }
      pushTimestamped(timestamped, event.timestamp, item, activityState)
    }
  }

  if (options.includePhaseLifecycle) {
    const phaseRunIds = [
      ...new Set(events.map((event) => event.phaseRunId).filter(Boolean) as string[]),
    ]
    for (const phaseRunId of phaseRunIds) {
      const group = phaseLifecycleGroup(events, phaseRunId, events[0]?.timestamp ?? '')
      if (group) {
        pushTimestamped(timestamped, group.createdAt, group, activityState)
      }
    }
  }

  if (activityEvents.length > 0) {
    appendActivitiesToStream(
      timestamped,
      activityEvents,
      activityEvents[0]?.timestamp ?? new Date().toISOString(),
      activityState,
      defaultRole,
    )
  }

  return timestamped
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey) || a.sequence - b.sequence)
    .map((entry) => entry.item)
}

function sortStreamItems(items: StreamItem[]): StreamItem[] {
  return [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

function isArtifactReadyCard(item: StreamItem): boolean {
  if (item.kind !== 'action_card') return false
  const hasView = item.actions.some((action) => action.action === 'phase.open')
  const hasProceed = item.actions.some((action) => action.action === 'phase.approve')
  return hasView && hasProceed
}

/** Pin live harness output at the stream tail, before trailing artifact-ready cards. */
function liveActivityInsertIndex(items: StreamItem[]): number {
  let insertAt = items.length
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (isArtifactReadyCard(items[index]!)) {
      insertAt = index
      continue
    }
    break
  }
  return insertAt
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

  const messageActivities: StreamActivityEvent[] = []
  const reasoningActivities: StreamActivityEvent[] = []
  const subagentActivities: StreamActivityEvent[] = []
  const toolActivities: StreamActivityEvent[] = []

  for (const activity of activityEvents) {
    if (activity.type === 'permission_request' || activity.type === 'question_request') {
      continue
    }
    if (activity.type === 'message') {
      const text = activity.content.trim()
      if (isSuppressedHarnessMessage(text)) continue
      if (persistedUserTexts.has(text) || persistedAgentTexts.has(text)) continue
      messageActivities.push(activity)
      continue
    }
    if (activity.type === 'reasoning') {
      reasoningActivities.push(activity)
      continue
    }
    if (activity.type === 'subagent_run') {
      subagentActivities.push(activity)
      continue
    }
    toolActivities.push(activity)
  }

  const permissionCards = activityEvents
    .filter((activity) => activity.type === 'permission_request')
    .map((activity, index) => permissionRequestToActionCard(activity, index))
  const questionCards = activityEvents.flatMap((activity, index) =>
    activity.type === 'question_request' ? questionRequestToActionCards(activity, index) : [],
  )

  const messageTail =
    messageActivities.length > 0
      ? eventsToStreamItems({ events: [], activityEvents: messageActivities, options }).map(
          (item) => (item.kind === 'agent_message' ? { ...item, isStreaming: true } : item),
        )
      : []

  const sorted = sortStreamItems([...baseItems, ...messageTail])

  const latestReasoningByKey = new Map<string, StreamActivityEvent>()
  for (const activity of reasoningActivities) {
    const key =
      typeof activity.metadata?.messageID === 'string'
        ? activity.metadata.messageID
        : activity.timestamp
    latestReasoningByKey.set(key, activity)
  }

  const hasLiveMessageText = messageTail.some(
    (item) => item.kind === 'agent_message' && item.text.trim().length > 0,
  )

  const liveReasoning = [...latestReasoningByKey.values()].map((activity, index) => {
    const item = reasoningToItem(activity, index)
    if (!hasLiveMessageText) return item
    return { ...item, isStreaming: false, collapsed: true }
  })
  const liveSubagents = mergeLiveSubagentRuns(subagentActivities)
  const liveGroup = buildLiveActivityGroup(toolActivities)

  const insertAt = liveActivityInsertIndex(sorted)
  const inlineLive = [
    ...sorted.slice(0, insertAt),
    ...liveReasoning,
    ...liveSubagents,
    ...(liveGroup ? [liveGroup] : []),
    ...sorted.slice(insertAt),
  ]

  return [...inlineLive, ...permissionCards, ...questionCards]
}

function mergeLiveSubagentRuns(activities: StreamActivityEvent[]): SubagentRunItem[] {
  const byCallId = new Map<string, StreamActivityEvent>()

  for (const activity of activities) {
    const callId =
      typeof activity.metadata?.callId === 'string'
        ? activity.metadata.callId
        : `${activity.timestamp}-${activity.content}`
    byCallId.set(callId, activity)
  }

  return [...byCallId.values()].map((activity, index) =>
    subagentRunToItem(
      {
        ...activity,
        metadata: {
          ...activity.metadata,
          status: activity.metadata?.status ?? 'running',
        },
      },
      index,
    ),
  )
}

function buildLiveActivityGroup(toolActivities: StreamActivityEvent[]): ActivityGroupItem | null {
  if (toolActivities.length === 0) return null

  const items = toolActivities.map((activity, index) => {
    const entry = activityToGroupItem(activity, index)
    const isLast = index === toolActivities.length - 1
    const running = activity.metadata?.status === 'running' || isLast
    return {
      ...entry,
      status: running ? ('running' as ActivityStatus) : ('success' as ActivityStatus),
    }
  })

  const group = buildActivityGroup(toolActivities, 'live-activity', { live: true })
  if (!group) return null

  return { ...group, items }
}

function permissionRequestToActionCard(
  activity: StreamActivityEvent,
  index: number,
): ActionCardItem {
  const permissionId =
    typeof activity.metadata?.permissionId === 'string'
      ? activity.metadata.permissionId
      : `perm-${index}`
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

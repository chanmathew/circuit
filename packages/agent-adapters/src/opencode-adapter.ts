import type {
  ReplyPermissionRequest,
  ReplyQuestionRequest,
  RejectQuestionRequest,
  AbortSessionRequest,
} from './adapter.js'
import {
  createOpenCodeClient,
  createSessionAbortedError,
  eventBelongsToSession,
  extractEventSessionId,
  extractArtifactContentFromMessages,
  formatLastAssistantTurn,
  formatOpenCodeSdkError,
  formatSessionTranscript,
  isSessionAbortedError,
  knownMessageIdsFromSession,
  mapOpenCodeEventToActivity,
  resolveOpenCodeModel,
  type OpenCodeClientOptions,
} from './opencode-client.js'
import {
  enrichActivitiesWithFileDiffs,
  sessionMessagesToActivities,
  upsertTraceActivity,
} from './activity-normalizer.js'
import type { AgentActivityEvent, ChatTurnRequest, ChatTurnResult, PhaseRunRequest, PhaseRunResult } from './types.js'

import type { AgentAdapter, HarnessSessionMessage, SendMessageRequest } from './adapter.js'
import { OPENCODE_CAPABILITIES } from './capabilities.js'
import type { Event } from '@opencode-ai/sdk'

const EVENT_LOOP_DRAIN_MS = 5_000
const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000

interface SessionTurnOptions {
  workspacePath: string
  sessionId: string
  prompt: string
  onSessionStarted?: (sessionId: string, abortRun: () => void) => void
  onActivity: (event: AgentActivityEvent) => void
  /** Skip replay of messages already in session (chat turns). */
  filterPromptEcho?: string
  /** Emit session banner before prompt. */
  sessionBanner?: string
}

export class OpenCodeAdapter implements AgentAdapter {
  readonly name = 'opencode'
  readonly capabilities = OPENCODE_CAPABILITIES

  private client: ReturnType<typeof createOpenCodeClient> | null = null
  private readonly options: OpenCodeClientOptions

  constructor(options: OpenCodeClientOptions = {}) {
    this.options = options
  }

  async connect(): Promise<void> {
    this.client = createOpenCodeClient(this.options)
    const health = await this.client.session.list()
    if (health.error) {
      throw new Error(
        health.error instanceof Error
          ? health.error.message
          : 'Failed to connect to OpenCode server',
      )
    }
  }

  async disconnect(): Promise<void> {
    this.client = null
  }

  async runPhase(
    request: PhaseRunRequest,
    onActivity: (event: AgentActivityEvent) => void,
  ): Promise<PhaseRunResult> {
    const client = this.requireClient()

    const created = await client.session.create({
      query: { directory: request.workspacePath },
      body: { title: `${request.phase} phase` },
    })
    if (created.error || !created.data) {
      throw new Error(
        created.error instanceof Error ? created.error.message : 'Failed to create OpenCode session',
      )
    }

    const sessionId = created.data.id
    const model = resolveOpenCodeModel(this.options)
    const trimmedPrompt = request.prompt.trim()
    const knownMessageIds = new Set<string>()

    const emitActivity = (event: AgentActivityEvent): void => {
      if (event.type === 'message') {
        const messageId =
          typeof event.metadata?.messageID === 'string' ? event.metadata.messageID : undefined
        if (messageId && knownMessageIds.has(messageId)) return
        if (messageId) knownMessageIds.add(messageId)

        const trimmedContent = event.content.trim()
        if (
          trimmedContent === trimmedPrompt ||
          (trimmedContent.length > 0 && trimmedPrompt.startsWith(trimmedContent))
        ) {
          return
        }
      }
      onActivity(event)
    }

    await this.runSessionTurn({
      workspacePath: request.workspacePath,
      sessionId,
      prompt: request.prompt,
      onSessionStarted: request.onSessionStarted,
      onActivity: emitActivity,
      sessionBanner: model
        ? `OpenCode session ${sessionId.slice(0, 8)} · ${model.providerID}/${model.modelID}`
        : `OpenCode session ${sessionId.slice(0, 8)} · context ${request.contextPack.hash.slice(0, 8)}`,
    })

    const messages = await client.session.messages({
      path: { id: sessionId },
      query: { directory: request.workspacePath },
    })
    if (messages.error || !messages.data) {
      throw new Error(
        messages.error instanceof Error
          ? messages.error.message
          : 'Failed to fetch OpenCode session messages',
      )
    }

    const transcript = formatSessionTranscript(messages.data)
    const artifactContent = extractArtifactContentFromMessages(messages.data, request.phase)
    const diff = await client.session.diff({
      path: { id: sessionId },
      query: { directory: request.workspacePath },
    })

    const fileDiffs =
      diff.data?.map((entry) => ({
        file: entry.file,
        additions: entry.additions,
        deletions: entry.deletions,
      })) ?? []

    const filesChanged = fileDiffs.map((entry) => entry.file).filter(Boolean)

    const activities = enrichActivitiesWithFileDiffs(
      await this.enrichSubagentTracesAsync(
        request.workspacePath,
        sessionMessagesToActivities(messages.data, {
          latestTurnOnly: false,
          timestamp: new Date().toISOString(),
        }),
      ),
      fileDiffs,
    )

    return {
      sessionId,
      contextPackHash: request.contextPack.hash,
      transcript,
      artifactContent,
      filesRead: [],
      filesChanged,
      commandsRun: [],
      modelLabel: model ? `${model.providerID}/${model.modelID}` : 'opencode-default',
      activities,
    }
  }

  async runChatTurn(
    request: ChatTurnRequest,
    onActivity: (event: AgentActivityEvent) => void,
  ): Promise<ChatTurnResult> {
    const client = this.requireClient()
    const model = resolveOpenCodeModel(this.options)

    let sessionId = request.sessionId
    if (!sessionId) {
      const created = await client.session.create({
        query: { directory: request.workspacePath },
        body: { title: `Chat · ${request.taskId.slice(0, 8)}` },
      })
      if (created.error || !created.data) {
        throw new Error(
          created.error instanceof Error ? created.error.message : 'Failed to create OpenCode session',
        )
      }
      sessionId = created.data.id
    }

    const existingMessages = await client.session.messages({
      path: { id: sessionId },
      query: { directory: request.workspacePath },
    })
    const knownMessageIds =
      existingMessages.data && !existingMessages.error
        ? knownMessageIdsFromSession(existingMessages.data)
        : new Set<string>()

    const emitActivity = (event: AgentActivityEvent): void => {
      if (event.type === 'message') {
        const messageId =
          typeof event.metadata?.messageID === 'string' ? event.metadata.messageID : undefined
        if (messageId && knownMessageIds.has(messageId)) return
        if (messageId) knownMessageIds.add(messageId)
        if (event.content.trim() === request.prompt.trim()) return
      }
      onActivity(event)
    }

    await this.runSessionTurn({
      workspacePath: request.workspacePath,
      sessionId,
      prompt: request.prompt,
      onSessionStarted: request.onSessionStarted,
      onActivity: emitActivity,
      filterPromptEcho: request.prompt,
    })

    const messages = await client.session.messages({
      path: { id: sessionId },
      query: { directory: request.workspacePath },
    })
    if (messages.error || !messages.data) {
      throw new Error(
        messages.error instanceof Error
          ? messages.error.message
          : 'Failed to fetch OpenCode session messages',
      )
    }

    const diff = await client.session.diff({
      path: { id: sessionId },
      query: { directory: request.workspacePath },
    })

    const fileDiffs =
      diff.data?.map((entry) => ({
        file: entry.file,
        additions: entry.additions,
        deletions: entry.deletions,
      })) ?? []

    const activities = enrichActivitiesWithFileDiffs(
      await this.enrichSubagentTracesAsync(
        request.workspacePath,
        sessionMessagesToActivities(messages.data, {
          timestamp: new Date().toISOString(),
        }),
      ),
      fileDiffs,
    )

    return {
      sessionId,
      transcript: formatLastAssistantTurn(messages.data),
      modelLabel: model ? `${model.providerID}/${model.modelID}` : 'opencode-default',
      activities,
    }
  }

  async sendMessage(request: SendMessageRequest): Promise<void> {
    const client = this.requireClient()
    const result = await client.session.prompt({
      path: { id: request.sessionId },
      query: { directory: request.workspacePath },
      body: {
        parts: [{ type: 'text', text: request.text }],
        noReply: true,
      },
    })

    if (result.error) {
      throw new Error(
        result.error instanceof Error ? result.error.message : 'Failed to send OpenCode message',
      )
    }
  }

  async replyPermission(request: ReplyPermissionRequest): Promise<void> {
    const client = this.requireClient()
    const result = await client.postSessionIdPermissionsPermissionId({
      path: {
        id: request.sessionId,
        permissionID: request.permissionId,
      },
      query: { directory: request.workspacePath },
      body: { response: request.response },
    })

    if (result.error) {
      throw new Error(
        result.error instanceof Error
          ? result.error.message
          : 'Failed to reply to OpenCode permission',
      )
    }
  }

  async replyQuestion(request: ReplyQuestionRequest): Promise<void> {
    const baseUrl = this.options.baseUrl ?? process.env.CIRCUIT_OPENCODE_URL ?? 'http://localhost:4096'
    const url = new URL(`/question/${request.requestId}/reply`, baseUrl)
    url.searchParams.set('directory', request.workspacePath)

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: request.answers }),
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(
        body.trim() || `Failed to reply to OpenCode question (${response.status})`,
      )
    }
  }

  async rejectQuestion(request: RejectQuestionRequest): Promise<void> {
    const baseUrl = this.options.baseUrl ?? process.env.CIRCUIT_OPENCODE_URL ?? 'http://localhost:4096'
    const url = new URL(`/question/${request.requestId}/reject`, baseUrl)
    url.searchParams.set('directory', request.workspacePath)

    const response = await fetch(url, { method: 'POST' })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(
        body.trim() || `Failed to reject OpenCode question (${response.status})`,
      )
    }
  }

  async abortSession(request: AbortSessionRequest): Promise<void> {
    const client = this.requireClient()
    const result = await client.session.abort({
      path: { id: request.sessionId },
      query: { directory: request.workspacePath },
    })

    if (result.error) {
      throw formatOpenCodeSdkError(result.error, 'Failed to abort OpenCode session')
    }
  }

  async fetchSessionMessages(sessionId: string): Promise<HarnessSessionMessage[]> {
    const client = this.requireClient()
    const messages = await client.session.messages({
      path: { id: sessionId },
      query: this.options.directory ? { directory: this.options.directory } : undefined,
    })

    if (messages.error || !messages.data) {
      throw new Error(
        messages.error instanceof Error
          ? messages.error.message
          : 'Failed to fetch OpenCode session messages',
      )
    }

    return messages.data.map((entry, index) => ({
      id: `${sessionId}-${index}`,
      role:
        entry.info.role === 'user'
          ? 'user'
          : entry.info.role === 'assistant'
            ? 'assistant'
            : 'system',
      text: entry.parts
        .filter((part): part is Extract<typeof part, { type: 'text' }> => part.type === 'text')
        .map((part) => part.text)
        .join('\n'),
      timestamp: new Date(
        'time' in entry.info && entry.info.time?.created ? entry.info.time.created : Date.now(),
      ).toISOString(),
    }))
  }

  private async enrichSubagentTracesAsync(
    workspacePath: string,
    activities: AgentActivityEvent[],
  ): Promise<AgentActivityEvent[]> {
    const client = this.requireClient()
    const result: AgentActivityEvent[] = []

    for (const activity of activities) {
      if (activity.type !== 'subagent_run') {
        result.push(activity)
        continue
      }

      const childSessionId =
        typeof activity.metadata?.childSessionId === 'string'
          ? activity.metadata.childSessionId
          : undefined
      if (!childSessionId) {
        result.push(activity)
        continue
      }

      const existing = activity.metadata?.childActivities
      if (Array.isArray(existing) && existing.length > 0) {
        result.push(activity)
        continue
      }

      const childMessages = await client.session.messages({
        path: { id: childSessionId },
        query: { directory: workspacePath },
      })
      if (childMessages.error || !childMessages.data) {
        result.push(activity)
        continue
      }

      const childActivities = sessionMessagesToActivities(childMessages.data, {
        latestTurnOnly: false,
        timestamp: activity.timestamp,
      }).filter(
        (entry) =>
          entry.type === 'reasoning' ||
          entry.type === 'tool_call' ||
          entry.type === 'file_read' ||
          entry.type === 'file_changed' ||
          entry.type === 'command',
      )

      result.push({
        ...activity,
        metadata: {
          ...activity.metadata,
          childActivities,
        },
      })
    }

    return result
  }

  private requireClient(): ReturnType<typeof createOpenCodeClient> {
    if (!this.client) {
      throw new Error('OpenCode adapter not connected — call connect() first')
    }
    return this.client
  }

  private async runSessionTurn(options: SessionTurnOptions): Promise<void> {
    const client = this.requireClient()
    const model = resolveOpenCodeModel(this.options)
    const agent = this.options.agent ?? process.env.CIRCUIT_OPENCODE_AGENT

    const abortError = createSessionAbortedError()
    let rejectRun: ((error: Error) => void) | undefined
    let aborted = false
    const abortPromise = new Promise<never>((_, reject) => {
      rejectRun = (error = abortError) => {
        aborted = true
        reject(error)
      }
    })

    options.onSessionStarted?.(options.sessionId, () => {
      rejectRun?.(abortError)
    })

    if (options.sessionBanner) {
      options.onActivity({
        type: 'message',
        timestamp: new Date().toISOString(),
        content: options.sessionBanner,
        metadata: { harnessSessionId: options.sessionId },
      })
    }

    let finished = false
    let resolveIdle: (() => void) | undefined
    const idlePromise = new Promise<void>((resolve) => {
      resolveIdle = resolve
    })

    const eventLoop = this.consumeEvents(
      options.workspacePath,
      options.sessionId,
      options.onActivity,
      () => finished,
      () => resolveIdle?.(),
    )

    try {
      const prompt = await Promise.race([
        client.session.promptAsync({
          path: { id: options.sessionId },
          query: { directory: options.workspacePath },
          body: {
            parts: [{ type: 'text', text: options.prompt }],
            ...(model ? { model } : {}),
            ...(agent ? { agent } : {}),
          },
        }),
        abortPromise,
      ])

      if (prompt.error) {
        if (aborted) {
          throw abortError
        }
        throw formatOpenCodeSdkError(prompt.error, 'OpenCode prompt failed')
      }

      await Promise.race([
        idlePromise,
        abortPromise,
        new Promise<void>((_, reject) => {
          setTimeout(
            () => reject(new Error('OpenCode session timed out waiting for idle')),
            SESSION_IDLE_TIMEOUT_MS,
          )
        }),
      ])
    } catch (error) {
      if (aborted || isSessionAbortedError(error)) {
        throw abortError
      }
      throw error
    } finally {
      finished = true
      resolveIdle?.()
      await Promise.race([
        eventLoop.catch(() => undefined),
        new Promise<void>((resolve) => setTimeout(resolve, EVENT_LOOP_DRAIN_MS)),
      ])
    }
  }

  private async consumeEvents(
    directory: string,
    sessionId: string,
    onActivity: (event: AgentActivityEvent) => void,
    isFinished: () => boolean,
    onSessionIdle: () => void,
  ): Promise<void> {
    const client = this.requireClient()
    const subscription = await client.event.subscribe({ query: { directory } })
    const childSessionIds = new Set<string>()
    const childTraceBySession = new Map<string, AgentActivityEvent[]>()
    const subagentMetaByChildSession = new Map<string, Record<string, unknown>>()

    const belongsToWatchedSession = (event: Event): boolean => {
      if (eventBelongsToSession(event, sessionId)) return true
      const eventSessionId = extractEventSessionId(event)
      return eventSessionId ? childSessionIds.has(eventSessionId) : false
    }

    const emitSubagentUpdate = (childSessionId: string, status = 'running'): void => {
      const meta = subagentMetaByChildSession.get(childSessionId)
      if (!meta) return
      const childActivities = childTraceBySession.get(childSessionId) ?? []
      onActivity({
        type: 'subagent_run',
        timestamp: new Date().toISOString(),
        content:
          typeof meta.description === 'string' ? meta.description : 'Subagent task',
        metadata: {
          ...meta,
          childSessionId,
          status,
          childActivities,
        },
      })
    }

    try {
      for await (const event of subscription.stream as AsyncIterable<Event>) {
        if (isFinished()) break
        if (!belongsToWatchedSession(event)) continue

        if (event.type === 'session.idle' && eventBelongsToSession(event, sessionId)) {
          onSessionIdle()
        }

        const activity = mapOpenCodeEventToActivity(event)
        if (!activity) continue

        const eventSessionId = extractEventSessionId(event)

        if (activity.type === 'subagent_run') {
          const childId =
            typeof activity.metadata?.childSessionId === 'string'
              ? activity.metadata.childSessionId
              : undefined
          if (childId) {
            childSessionIds.add(childId)
            subagentMetaByChildSession.set(childId, activity.metadata ?? {})
            if (!childTraceBySession.has(childId)) {
              childTraceBySession.set(childId, [])
            }
          }
          onActivity(activity)
          continue
        }

        if (eventSessionId && childSessionIds.has(eventSessionId)) {
          if (activity.type === 'message') continue
          const trace = childTraceBySession.get(eventSessionId) ?? []
          upsertTraceActivity(trace, activity)
          childTraceBySession.set(eventSessionId, trace)
          emitSubagentUpdate(eventSessionId)
          continue
        }

        onActivity(activity)
      }
    } catch {
      if (!isFinished()) throw new Error('OpenCode event stream disconnected')
    }
  }
}

/** Returns mock adapter when OpenCode server is unavailable. */
export async function createOpenCodeAdapterOrFallback(
  options: OpenCodeClientOptions = {},
): Promise<AgentAdapter> {
  const adapter = new OpenCodeAdapter(options)
  try {
    await adapter.connect()
    return adapter
  } catch {
    const { MockAgentAdapter } = await import('./mock-adapter.js')
    return new MockAgentAdapter()
  }
}

export function isOpenCodeAdapterEnabled(): boolean {
  return (process.env.CIRCUIT_AGENT_ADAPTER ?? 'mock').toLowerCase() === 'opencode'
}

import type { Event } from '@opencode-ai/sdk'

import type { AgentAdapter, HarnessSessionMessage, SendMessageRequest } from './adapter.js'
import { OPENCODE_CAPABILITIES } from './capabilities.js'
import {
  createOpenCodeClient,
  eventBelongsToSession,
  extractArtifactContentFromMessages,
  formatSessionTranscript,
  mapOpenCodeEventToActivity,
  resolveOpenCodeModel,
  type OpenCodeClientOptions,
} from './opencode-client.js'
import type { AgentActivityEvent, PhaseRunRequest, PhaseRunResult } from './types.js'

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
    const agent = this.options.agent ?? process.env.CIRCUIT_OPENCODE_AGENT

    onActivity({
      type: 'message',
      timestamp: new Date().toISOString(),
      content: model
        ? `OpenCode session ${sessionId.slice(0, 8)} · ${model.providerID}/${model.modelID}`
        : `OpenCode session ${sessionId.slice(0, 8)} · context ${request.contextPack.hash.slice(0, 8)}`,
    })

    let finished = false
    const eventLoop = this.consumeEvents(
      request.workspacePath,
      sessionId,
      onActivity,
      () => finished,
    )

    try {
      const prompt = await client.session.prompt({
        path: { id: sessionId },
        query: { directory: request.workspacePath },
        body: {
          parts: [{ type: 'text', text: request.prompt }],
          ...(model ? { model } : {}),
          ...(agent ? { agent } : {}),
        },
      })

      if (prompt.error) {
        throw new Error(
          prompt.error instanceof Error ? prompt.error.message : 'OpenCode prompt failed',
        )
      }
    } finally {
      finished = true
      await eventLoop.catch(() => undefined)
    }

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

    const filesChanged =
      diff.data?.flatMap((entry) => entry.file).filter((path): path is string => Boolean(path)) ??
      []

    return {
      sessionId,
      contextPackHash: request.contextPack.hash,
      transcript,
      artifactContent,
      filesRead: [],
      filesChanged,
      commandsRun: [],
      modelLabel: model ? `${model.providerID}/${model.modelID}` : 'opencode-default',
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

  private requireClient(): ReturnType<typeof createOpenCodeClient> {
    if (!this.client) {
      throw new Error('OpenCode adapter not connected — call connect() first')
    }
    return this.client
  }

  private async consumeEvents(
    directory: string,
    sessionId: string,
    onActivity: (event: AgentActivityEvent) => void,
    isFinished: () => boolean,
  ): Promise<void> {
    const client = this.requireClient()
    const subscription = await client.event.subscribe({ query: { directory } })

    for await (const event of subscription.stream as AsyncIterable<Event>) {
      if (isFinished()) break
      if (!eventBelongsToSession(event, sessionId)) continue

      const activity = mapOpenCodeEventToActivity(event)
      if (activity) onActivity(activity)
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

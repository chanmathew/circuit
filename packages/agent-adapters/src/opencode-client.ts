import { stripCircuitBlocks } from '@circuit/protocol'
import { createOpencodeClient, type Event, type OpencodeClient } from '@opencode-ai/sdk'

import type { AgentActivityEvent } from './types.js'

import {
  mapOpenCodeToolPartToActivity,
  mapQuestionToolPartToActivity,
  normalizeActivityEvent,
  sessionMessagesToActivities,
} from './activity-normalizer.js'
import {
  createOpenCodeStreamAccumulator,
  mapOpenCodeStreamEvent,
  partStreamKey,
} from './opencode-stream-state.js'

export {
  createOpenCodeStreamAccumulator,
  mapOpenCodeStreamEvent,
  partStreamKey,
} from './opencode-stream-state.js'

type OpenCodeQuestionOption = {
  label: string
  description: string
}

type OpenCodeQuestionInfo = {
  question: string
  header: string
  options: OpenCodeQuestionOption[]
  custom?: boolean
}

type OpenCodeQuestionAskedEvent = {
  type: 'question.asked' | 'question.v2.asked'
  properties: {
    id?: string
    sessionID: string
    questions: OpenCodeQuestionInfo[]
    tool?: { callID?: string; messageID?: string }
  }
}

function parseQuestionAskedProperties(event: Event): OpenCodeQuestionAskedEvent['properties'] | null {
  const typed = event as unknown as OpenCodeQuestionAskedEvent
  if (typed.type !== 'question.asked' && typed.type !== 'question.v2.asked') {
    return null
  }
  return typed.properties
}

export type OpenCodeSessionMessage = {
  info: { role: string; id?: string }
  parts: Array<{
    type: string
    text?: string
    messageID?: string
    tool?: string
    filename?: string
    url?: string
    state?: { status?: string; title?: string }
  }>
}

export interface OpenCodeClientOptions {
  baseUrl?: string
  directory?: string
  /** OpenCode model in `providerID/modelID` form, e.g. `anthropic/claude-sonnet-4-20250514`. */
  model?: string
  agent?: string
}

export function parseOpenCodeModel(
  value: string | undefined,
): { providerID: string; modelID: string } | undefined {
  if (!value?.trim()) return undefined

  const separator = value.indexOf('/')
  if (separator <= 0 || separator === value.length - 1) return undefined

  return {
    providerID: value.slice(0, separator),
    modelID: value.slice(separator + 1),
  }
}

export function resolveOpenCodeModel(
  options: OpenCodeClientOptions = {},
): { providerID: string; modelID: string } | undefined {
  return parseOpenCodeModel(options.model ?? process.env.CIRCUIT_OPENCODE_MODEL)
}

/** Matches desktop `isPhaseRunAborted` — keep in sync. */
export const SESSION_ABORTED_BY_USER = 'Session aborted by user'

export function createSessionAbortedError(): Error {
  return new Error(SESSION_ABORTED_BY_USER)
}

export function isSessionAbortedError(error: unknown): boolean {
  return error instanceof Error && error.message === SESSION_ABORTED_BY_USER
}

/** Surface OpenCode SDK error bodies that are not `Error` instances. */
export function formatOpenCodeSdkError(error: unknown, fallback: string): Error {
  if (error instanceof Error) return error

  if (typeof error === 'object' && error !== null) {
    const obj = error as Record<string, unknown>
    const data = obj.data
    const dataMessage =
      typeof data === 'object' &&
      data !== null &&
      'message' in data &&
      typeof data.message === 'string'
        ? data.message
        : undefined
    const message =
      dataMessage ||
      (typeof obj.message === 'string' ? obj.message : undefined) ||
      (typeof obj.name === 'string' ? obj.name : undefined) ||
      JSON.stringify(error)
    return new Error(message)
  }

  if (typeof error === 'string' && error.trim()) {
    return new Error(error)
  }

  return new Error(fallback)
}

export function createOpenCodeClient(options: OpenCodeClientOptions = {}): OpencodeClient {
  const baseUrl = options.baseUrl ?? process.env.CIRCUIT_OPENCODE_URL ?? 'http://localhost:4096'
  return createOpencodeClient({
    baseUrl,
    directory: options.directory,
  })
}

export function extractTextFromParts(
  parts: Array<{ type: string; text?: string }>,
): string {
  return parts
    .filter((part) => part.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text!)
    .join('\n')
}

export function mapOpenCodeEventToActivity(event: Event): AgentActivityEvent | null {
  return mapOpenCodeStreamEvent(event, createOpenCodeStreamAccumulator(), streamEventDeps)
}

/** Per-turn stream mapper — accumulates text/reasoning deltas across SSE events. */
export function createOpenCodeStreamMapper(): (event: Event) => AgentActivityEvent | null {
  const stream = createOpenCodeStreamAccumulator()
  return (event) => mapOpenCodeStreamEvent(event, stream, streamEventDeps)
}

const streamEventDeps = {
  mapToolPart: mapOpenCodeToolPartToActivity,
  mapQuestionToolPart: mapQuestionToolPartToActivity,
  normalize: normalizeActivityEvent,
}

export { sessionMessagesToActivities } from './activity-normalizer.js'

/** Derive phase artifact markdown from the last assistant turn. */
export function extractArtifactContentFromMessages(
  messages: OpenCodeSessionMessage[],
  phase: string,
): string | undefined {
  const assistantTexts = messages
    .filter((entry) => entry.info.role === 'assistant')
    .map((entry) => extractTextFromParts(entry.parts))
    .filter((text) => text.trim())

  if (assistantTexts.length === 0) return undefined

  const lastAssistant = assistantTexts[assistantTexts.length - 1]!
  const prose = stripCircuitBlocks(lastAssistant).trim()
  if (!prose) return undefined

  return prose.match(/^#\s+\S/) ? prose : `# ${phase}\n\n${prose}`
}

export function formatSessionTranscript(
  messages: OpenCodeSessionMessage[],
): string {
  return messages
    .map((entry) => {
      const role = entry.info.role === 'user' ? 'User' : 'Assistant'
      const text = extractTextFromParts(entry.parts)
      if (!text.trim()) return ''
      return `**${role}:**\n${text}`
    })
    .filter(Boolean)
    .join('\n\n')
}

/** Single-turn assistant reply for chat phase_run storage (avoids replaying full session). */
export function formatLastAssistantTurn(messages: OpenCodeSessionMessage[]): string {
  const assistantTexts = messages
    .filter((entry) => entry.info.role === 'assistant')
    .map((entry) => extractTextFromParts(entry.parts).trim())
    .filter(Boolean)

  const last = assistantTexts[assistantTexts.length - 1]
  if (!last) return ''
  return `**Assistant:**\n${last}`
}

/** Message IDs already in the session before a new prompt — skip replay during live stream. */
export function knownMessageIdsFromSession(messages: OpenCodeSessionMessage[]): Set<string> {
  const ids = new Set<string>()

  for (const entry of messages) {
    if (typeof entry.info.id === 'string') {
      ids.add(entry.info.id)
    }
    for (const part of entry.parts) {
      if (typeof part.messageID === 'string') {
        ids.add(part.messageID)
      }
    }
  }

  return ids
}

export function eventBelongsToSession(event: Event, sessionId: string): boolean {
  const eventSessionId = extractEventSessionId(event)
  if (!eventSessionId) return false
  return eventSessionId === sessionId
}

export function extractEventSessionId(event: Event): string | undefined {
  const properties = event.properties as Record<string, unknown>

  const directSessionId =
    typeof properties.sessionID === 'string'
      ? properties.sessionID
      : typeof properties.sessionId === 'string'
        ? properties.sessionId
        : undefined

  if (directSessionId) return directSessionId

  if (event.type === 'message.part.updated') {
    return event.properties.part.sessionID
  }

  if ((event.type as string) === 'message.part.delta') {
    const properties = event.properties as { sessionID?: string }
    return properties.sessionID
  }

  if ((event.type as string).startsWith('session.next.')) {
    const properties = event.properties as { sessionID?: string }
    return properties.sessionID
  }

  if (event.type === 'session.created' || event.type === 'session.updated') {
    return event.properties.info.id
  }

  if (event.type === 'session.error') {
    return event.properties.sessionID
  }

  if (event.type === 'session.idle') {
    return event.properties.sessionID
  }

  if (event.type === 'permission.updated') {
    return event.properties.sessionID
  }

  const questionProperties = parseQuestionAskedProperties(event)
  if (questionProperties) {
    return questionProperties.sessionID
  }

  if (event.type === 'file.edited' || event.type === 'command.executed') {
    return typeof properties.sessionID === 'string' ? properties.sessionID : undefined
  }

  return undefined
}

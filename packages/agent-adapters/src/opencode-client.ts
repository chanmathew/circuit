import { stripCircuitBlocks } from '@circuit/protocol'
import { createOpencodeClient, type Event, type OpencodeClient } from '@opencode-ai/sdk'

import type { AgentActivityEvent } from './types.js'

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
    id: string
    sessionID: string
    questions: OpenCodeQuestionInfo[]
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
  parts: Array<{ type: string; text?: string; messageID?: string }>
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
  const timestamp = new Date().toISOString()

  if (event.type === 'message.part.updated') {
    const part = event.properties.part
    if (part.type === 'text' && part.text.trim()) {
      return {
        type: 'message',
        timestamp,
        content: part.text,
        metadata: { sessionID: part.sessionID, messageID: part.messageID },
      }
    }
    if (part.type === 'file') {
      const path = part.filename ?? part.url
      return {
        type: 'file_read',
        timestamp,
        content: path,
        metadata: { path },
      }
    }
    if (part.type === 'tool') {
      const toolName = part.tool || 'tool'
      const status = part.state.status
      const title = 'title' in part.state ? part.state.title?.trim() : undefined
      let label: string
      if (title && title !== toolName) {
        label = status === 'running' ? `${toolName}: ${title}` : `${toolName} — ${title}`
      } else if (status === 'running') {
        label = `Running ${toolName}`
      } else if (status === 'completed') {
        label = `Completed ${toolName}`
      } else if (status === 'error') {
        label = `Failed ${toolName}`
      } else {
        label = toolName
      }
      return {
        type: 'tool_call',
        timestamp,
        content: label,
        metadata: { tool: part.tool, status: part.state.status },
      }
    }
    return null
  }

  if (event.type === 'file.edited') {
    return {
      type: 'file_changed',
      timestamp,
      content: event.properties.file,
      metadata: { path: event.properties.file },
    }
  }

  if (event.type === 'command.executed') {
    return {
      type: 'command',
      timestamp,
      content: `${event.properties.name} ${event.properties.arguments}`.trim(),
      metadata: { sessionID: event.properties.sessionID },
    }
  }

  if (event.type === 'permission.updated') {
    const permission = event.properties
    return {
      type: 'permission_request',
      timestamp,
      content: permission.title,
      metadata: {
        permissionId: permission.id,
        sessionId: permission.sessionID,
        permissionType: permission.type,
        pattern: permission.pattern,
      },
    }
  }

  const questionProperties = parseQuestionAskedProperties(event)
  if (questionProperties) {
    const { id: requestId, sessionID: sessionId, questions } = questionProperties
    const first = questions[0]
    return {
      type: 'question_request',
      timestamp,
      content: first?.question ?? 'The agent has a question',
      metadata: {
        requestId,
        sessionId,
        questions,
      },
    }
  }

  if (event.type === 'session.error') {
    const error = event.properties.error
    const message =
      typeof error === 'string'
        ? error
        : error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
          ? error.message
          : 'OpenCode session error'
    return {
      type: 'message',
      timestamp,
      content: message,
      metadata: { severity: 'error', sessionID: event.properties.sessionID },
    }
  }

  return null
}

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
  const properties = event.properties as Record<string, unknown>

  const directSessionId =
    typeof properties.sessionID === 'string'
      ? properties.sessionID
      : typeof properties.sessionId === 'string'
        ? properties.sessionId
        : undefined

  if (directSessionId) return directSessionId === sessionId

  if (event.type === 'message.part.updated') {
    return event.properties.part.sessionID === sessionId
  }

  if (event.type === 'session.created' || event.type === 'session.updated') {
    return event.properties.info.id === sessionId
  }

  if (event.type === 'session.error') {
    return event.properties.sessionID === sessionId
  }

  if (event.type === 'session.idle') {
    return event.properties.sessionID === sessionId
  }

  if (event.type === 'permission.updated') {
    return event.properties.sessionID === sessionId
  }

  const questionProperties = parseQuestionAskedProperties(event)
  if (questionProperties) {
    return questionProperties.sessionID === sessionId
  }

  if (event.type === 'file.edited' || event.type === 'command.executed') {
    const sessionFromEvent =
      typeof properties.sessionID === 'string' ? properties.sessionID : undefined
    return sessionFromEvent ? sessionFromEvent === sessionId : false
  }

  return false
}

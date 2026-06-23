import type { Event } from '@opencode-ai/sdk'

import type {
  mapOpenCodeToolPartToActivity,
  mapQuestionToolPartToActivity,
  normalizeActivityEvent,
} from './activity-normalizer.js'
import type { AgentActivityEvent } from './types.js'

export type OpenCodeStreamEventDeps = {
  mapToolPart: typeof mapOpenCodeToolPartToActivity
  mapQuestionToolPart: typeof mapQuestionToolPartToActivity
  normalize: typeof normalizeActivityEvent
}

export interface OpenCodeStreamAccumulator {
  append(key: string, delta: string): void
  syncText(key: string, text: string): void
  getText(key: string): string
  markComplete(key: string): void
  isComplete(key: string): boolean
}

export function createOpenCodeStreamAccumulator(): OpenCodeStreamAccumulator {
  const buffers = new Map<string, string>()
  const complete = new Set<string>()

  return {
    append(key, delta) {
      if (!delta) return
      buffers.set(key, `${buffers.get(key) ?? ''}${delta}`)
    },
    syncText(key, text) {
      const current = buffers.get(key) ?? ''
      if (text.length >= current.length) {
        buffers.set(key, text)
      }
    },
    getText(key) {
      return buffers.get(key) ?? ''
    },
    markComplete(key) {
      complete.add(key)
    },
    isComplete(key) {
      return complete.has(key)
    },
  }
}

export function partStreamKey(part: { id?: string; messageID?: string; type?: string }): string {
  if (typeof part.id === 'string' && part.id.length > 0) return part.id
  return `${part.messageID ?? 'unknown'}:${part.type ?? 'unknown'}`
}

function streamStatus(stream: OpenCodeStreamAccumulator, key: string): 'running' | 'completed' {
  return stream.isComplete(key) ? 'completed' : 'running'
}

function parseQuestionAskedProperties(event: Event): {
  sessionID: string
} | null {
  const typed = event as unknown as { type?: string; properties?: { sessionID?: string } }
  if (typed.type !== 'question.asked' && typed.type !== 'question.v2.asked') {
    return null
  }
  if (typeof typed.properties?.sessionID !== 'string') return null
  return { sessionID: typed.properties.sessionID }
}

/** Map OpenCode SSE events to activities, accumulating text/reasoning deltas. */
export function mapOpenCodeStreamEvent(
  event: Event,
  stream: OpenCodeStreamAccumulator,
  deps: OpenCodeStreamEventDeps,
): AgentActivityEvent | null {
  const timestamp = new Date().toISOString()
  const eventType = event.type as string

  if (eventType === 'message.part.delta') {
    const properties = event.properties as {
      sessionID?: string
      messageID?: string
      partID?: string
      field?: string
      delta?: string
    }
    const field = properties.field ?? 'text'
    if (field !== 'text' && field !== 'reasoning') return null
    const key =
      properties.partID ??
      `${properties.messageID ?? 'unknown'}:${field === 'reasoning' ? 'reasoning' : 'text'}`
    if (typeof properties.delta === 'string') {
      stream.append(key, properties.delta)
    }
    const text = stream.getText(key)
    if (!text.trim()) return null
    if (field === 'reasoning') {
      return deps.normalize({
        type: 'reasoning',
        timestamp,
        content: text,
        metadata: {
          sessionID: properties.sessionID,
          messageID: properties.messageID,
          status: streamStatus(stream, key),
        },
      })
    }
    return deps.normalize({
      type: 'message',
      timestamp,
      content: text,
      metadata: {
        sessionID: properties.sessionID,
        messageID: properties.messageID,
        status: streamStatus(stream, key),
      },
    })
  }

  if (eventType === 'session.next.text.delta') {
    const properties = event.properties as {
      sessionID?: string
      assistantMessageID?: string
      textID?: string
      delta?: string
    }
    const key = `${properties.assistantMessageID ?? 'unknown'}:text:${properties.textID ?? 'default'}`
    if (typeof properties.delta === 'string') {
      stream.append(key, properties.delta)
    }
    const text = stream.getText(key)
    if (!text.trim()) return null
    return deps.normalize({
      type: 'message',
      timestamp,
      content: text,
      metadata: {
        sessionID: properties.sessionID,
        messageID: properties.assistantMessageID,
        status: streamStatus(stream, key),
      },
    })
  }

  if (eventType === 'session.next.reasoning.delta') {
    const properties = event.properties as {
      sessionID?: string
      assistantMessageID?: string
      reasoningID?: string
      delta?: string
    }
    const key = `${properties.assistantMessageID ?? 'unknown'}:reasoning:${properties.reasoningID ?? 'default'}`
    if (typeof properties.delta === 'string') {
      stream.append(key, properties.delta)
    }
    const text = stream.getText(key)
    if (!text.trim()) return null
    return deps.normalize({
      type: 'reasoning',
      timestamp,
      content: text,
      metadata: {
        sessionID: properties.sessionID,
        messageID: properties.assistantMessageID,
        status: streamStatus(stream, key),
      },
    })
  }

  if (eventType === 'session.next.text.ended') {
    const properties = event.properties as {
      assistantMessageID?: string
      textID?: string
      text?: string
    }
    const key = `${properties.assistantMessageID ?? 'unknown'}:text:${properties.textID ?? 'default'}`
    if (typeof properties.text === 'string') {
      stream.syncText(key, properties.text)
    }
    stream.markComplete(key)
    return null
  }

  if (eventType === 'session.next.reasoning.ended') {
    const properties = event.properties as {
      assistantMessageID?: string
      reasoningID?: string
      reasoning?: string
    }
    const key = `${properties.assistantMessageID ?? 'unknown'}:reasoning:${properties.reasoningID ?? 'default'}`
    if (typeof properties.reasoning === 'string') {
      stream.syncText(key, properties.reasoning)
    }
    stream.markComplete(key)
    return null
  }

  if (event.type === 'message.part.updated') {
    const properties = event.properties as {
      part: {
        id?: string
        sessionID?: string
        messageID?: string
        type?: string
        text?: string
        tool?: string
        filename?: string
        url?: string
        state?: { status?: string; title?: string }
        time?: { start?: number; end?: number }
      }
      delta?: string
    }
    const part = properties.part
    const key = partStreamKey(part)

    if (typeof properties.delta === 'string') {
      stream.append(key, properties.delta)
    }
    if (typeof part.text === 'string') {
      stream.syncText(key, part.text)
    }
    if (part.time?.end != null) {
      stream.markComplete(key)
    }

    const accumulated = stream.getText(key)

    if (part.type === 'text') {
      const text = accumulated || part.text || ''
      if (!text.trim()) return null
      return deps.normalize({
        type: 'message',
        timestamp,
        content: text,
        metadata: {
          sessionID: part.sessionID,
          messageID: part.messageID,
          status: streamStatus(stream, key),
        },
      })
    }

    if (part.type === 'reasoning' || part.type === 'thinking') {
      const text = accumulated || part.text || ''
      if (!text.trim()) return null
      return deps.normalize({
        type: 'reasoning',
        timestamp,
        content: text,
        metadata: {
          sessionID: part.sessionID,
          messageID: part.messageID,
          status: streamStatus(stream, key),
        },
      })
    }

    if (part.type === 'file') {
      const path = part.filename ?? part.url
      return deps.normalize({
        type: 'file_read',
        timestamp,
        content: path ?? 'file',
        metadata: { path, status: 'completed' },
      })
    }

    if (part.type === 'tool') {
      if (part.tool === 'question') {
        const activity = deps.mapQuestionToolPart({
          callId: (part as { callID?: string }).callID,
          sessionID: part.sessionID,
          messageID: part.messageID,
          state: part.state ?? {},
          timestamp,
        })
        if (activity) return deps.normalize(activity)
      }
      return deps.normalize(
        deps.mapToolPart({
          tool: part.tool,
          state: part.state ?? {},
          sessionID: part.sessionID,
          messageID: part.messageID,
          callId: (part as { callID?: string }).callID,
        }),
      )
    }

    return null
  }

  if (event.type === 'file.edited') {
    return deps.normalize({
      type: 'file_changed',
      timestamp,
      content: event.properties.file,
      metadata: { path: event.properties.file, status: 'completed' },
    })
  }

  if (event.type === 'command.executed') {
    return deps.normalize({
      type: 'command',
      timestamp,
      content: `${event.properties.name} ${event.properties.arguments}`.trim(),
      metadata: { sessionID: event.properties.sessionID, status: 'completed' },
    })
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
    const typed = event as unknown as {
      properties: {
        id?: string
        sessionID: string
        questions: Array<{ question?: string }>
        tool?: { callID?: string }
      }
    }
    const requestId =
      typeof typed.properties.id === 'string'
        ? typed.properties.id
        : typeof typed.properties.tool?.callID === 'string'
          ? typed.properties.tool.callID
          : undefined
    const first = typed.properties.questions[0]
    return {
      type: 'question_request',
      timestamp,
      content: first?.question ?? 'The agent has a question',
      metadata: {
        requestId,
        sessionId: typed.properties.sessionID,
        questions: typed.properties.questions,
      },
    }
  }

  if (event.type === 'session.error') {
    const error = event.properties.error
    const message =
      typeof error === 'string'
        ? error
        : error &&
            typeof error === 'object' &&
            'message' in error &&
            typeof error.message === 'string'
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

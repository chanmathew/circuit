import type { CircuitBlock, CircuitBlockPayloadMap, CircuitBlockType } from './blocks.js'
import type { CircuitEvent, CircuitEventType } from './events.js'
import { validateBlockPayload } from './validators.js'

const BLOCK_FENCE_RE = /^```(circuit-[a-z-]+)\s*\n([\s\S]*?)```$/gm

const BLOCK_TYPES = new Set<CircuitBlockType>([
  'circuit-decision',
  'circuit-artifact',
  'circuit-validation',
  'circuit-blocker',
  'circuit-diff',
])

function isBlockType(value: string): value is CircuitBlockType {
  return BLOCK_TYPES.has(value as CircuitBlockType)
}

function parseBlockPayload<T extends CircuitBlockType>(
  type: T,
  raw: string,
): CircuitBlockPayloadMap[T] | undefined {
  const trimmed = raw.trim()
  if (!trimmed) return undefined

  try {
    const parsed: unknown = JSON.parse(trimmed)
    return validateBlockPayload(type, parsed)
  } catch {
    return undefined
  }
}

/** Extract structured Circuit blocks from agent markdown output. */
export function parseCircuitBlocks(content: string): CircuitBlock[] {
  const blocks: CircuitBlock[] = []

  for (const match of content.matchAll(BLOCK_FENCE_RE)) {
    const typeRaw = match[1]
    const body = match[2]
    if (!typeRaw || body === undefined || !isBlockType(typeRaw)) continue

    const data = parseBlockPayload(typeRaw, body)
    if (data === undefined) continue

    blocks.push({ type: typeRaw, data })
  }

  return blocks
}

/** Strip structured blocks from content, leaving prose for raw transcript display. */
export function stripCircuitBlocks(content: string): string {
  return content
    .replace(BLOCK_FENCE_RE, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

const BLOCK_EVENT_MAP: Partial<Record<CircuitBlockType, CircuitEventType>> = {
  'circuit-decision': 'decision:required',
  'circuit-artifact': 'artifact:written',
  'circuit-validation': 'validation:passed',
  'circuit-blocker': 'blocker:raised',
  'circuit-diff': 'diff:ready',
}

function eventId(block: CircuitBlock, index: number): string {
  return `${block.type}-${index}`
}

/** Normalize parsed blocks into Circuit protocol events. */
export function blocksToEvents(
  blocks: CircuitBlock[],
  context: { taskId: string; phaseRunId?: string; timestamp?: string },
): CircuitEvent[] {
  const timestamp = context.timestamp ?? new Date().toISOString()
  const events: CircuitEvent[] = []

  for (const [index, block] of blocks.entries()) {
    const id = eventId(block, index)

    if (block.type === 'circuit-validation') {
      const validation = block.data as CircuitBlockPayloadMap['circuit-validation']
      events.push({
        id,
        type: validation.passed ? 'validation:passed' : 'validation:failed',
        taskId: context.taskId,
        phaseRunId: context.phaseRunId,
        timestamp,
        payload: validation,
      })
      continue
    }

    const type = BLOCK_EVENT_MAP[block.type]
    if (!type) continue

    events.push({
      id,
      type,
      taskId: context.taskId,
      phaseRunId: context.phaseRunId,
      timestamp,
      payload: block.data,
    })
  }

  return events
}

/** Parse transcript content into blocks and normalized events in one step. */
export function parseTranscript(
  content: string,
  context: { taskId: string; phaseRunId?: string; timestamp?: string },
): { blocks: CircuitBlock[]; events: CircuitEvent[]; prose: string } {
  const blocks = parseCircuitBlocks(content)
  const events = blocksToEvents(blocks, context)
  const prose = stripCircuitBlocks(content)

  return { blocks, events, prose }
}

const HARNESS_SESSION_META_RE = /^OpenCode (?:chat|session) [a-zA-Z0-9_-]+ · /i

/** Session/model status lines from the adapter — not user-visible chat content. */
export function isHarnessMetaMessage(content: string): boolean {
  return HARNESS_SESSION_META_RE.test(content.trim())
}

/** Phase run prompt built from ticket + approved artifacts — harness-only, not chat. */
export function isPhaseHarnessPrompt(content: string): boolean {
  const trimmed = content.trim()
  if (!trimmed) return false
  return (
    /^#\s+\S+\s+phase\b/i.test(trimmed) &&
    (/\b## Context pack\b/i.test(trimmed) ||
      /\bRun the \S+ phase using the context above\./i.test(trimmed))
  )
}

export interface HarnessTranscriptMessage {
  role: 'user' | 'assistant'
  text: string
}

/** Parse OpenCode session export (`**User:**` / `**Assistant:**` blocks). */
export function parseHarnessSessionTranscript(transcript: string): HarnessTranscriptMessage[] {
  const messages: HarnessTranscriptMessage[] = []
  const pattern = /\*\*(User|Assistant):\*\*\n([\s\S]*?)(?=\n\n\*\*(?:User|Assistant):\*\*|$)/g

  for (const match of transcript.matchAll(pattern)) {
    const roleRaw = match[1]
    const text = match[2]?.trim() ?? ''
    if (!text) continue

    messages.push({
      role: roleRaw === 'User' ? 'user' : 'assistant',
      text,
    })
  }

  return messages
}

/** Project harness chat transcript into feed events (latest assistant line only per run). */
export function harnessTranscriptToEvents(
  transcript: string,
  context: { taskId: string; phaseRunId: string; startedAt: string },
): CircuitEvent[] {
  const assistantMessages = parseHarnessSessionTranscript(transcript).filter(
    (message) => message.role === 'assistant',
  )
  const last = assistantMessages[assistantMessages.length - 1]
  if (!last || isHarnessMetaMessage(last.text)) return []

  return [
    {
      type: 'agent:activity',
      taskId: context.taskId,
      phaseRunId: context.phaseRunId,
      timestamp: context.startedAt,
      payload: {
        role: 'driver',
        text: last.text,
        activityType: 'message',
      },
    },
  ]
}

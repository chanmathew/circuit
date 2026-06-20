import { describe, expect, it } from 'vitest'

import type { Event } from '@opencode-ai/sdk'

import {
  eventBelongsToSession,
  extractArtifactContentFromMessages,
  parseOpenCodeModel,
} from './opencode-client.js'

describe('parseOpenCodeModel', () => {
  it('parses provider/model pairs', () => {
    expect(parseOpenCodeModel('opencode/deepseek-v4-flash-free')).toEqual({
      providerID: 'opencode',
      modelID: 'deepseek-v4-flash-free',
    })
  })

  it('rejects invalid values', () => {
    expect(parseOpenCodeModel('invalid')).toBeUndefined()
    expect(parseOpenCodeModel('/missing-provider')).toBeUndefined()
  })
})

describe('extractArtifactContentFromMessages', () => {
  it('uses the last assistant turn as artifact markdown', () => {
    const content = extractArtifactContentFromMessages(
      [
        {
          info: { role: 'user' },
          parts: [{ type: 'text', text: 'Run plan phase' }],
        },
        {
          info: { role: 'assistant' },
          parts: [{ type: 'text', text: '## Approach\n\nUse labels for routing.' }],
        },
      ],
      'plan',
    )

    expect(content).toBe('# plan\n\n## Approach\n\nUse labels for routing.')
  })

  it('returns undefined when no assistant prose exists', () => {
    expect(
      extractArtifactContentFromMessages(
        [{ info: { role: 'assistant' }, parts: [{ type: 'tool', text: 'ignored' }] }],
        'plan',
      ),
    ).toBeUndefined()
  })
})

describe('eventBelongsToSession', () => {
  const sessionId = 'ses_abc'

  it('matches message parts for the active session', () => {
    const event = {
      type: 'message.part.updated',
      properties: {
        part: {
          type: 'text',
          text: 'hello',
          sessionID: sessionId,
          messageID: 'msg_1',
        },
      },
    } as Event

    expect(eventBelongsToSession(event, sessionId)).toBe(true)
    expect(eventBelongsToSession(event, 'ses_other')).toBe(false)
  })

  it('ignores events without session metadata', () => {
    const event = {
      type: 'server.connected',
      properties: {},
    } as Event

    expect(eventBelongsToSession(event, sessionId)).toBe(false)
  })
})

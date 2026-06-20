import { describe, expect, it } from 'vitest'

import type { Event } from '@opencode-ai/sdk'

import {
  eventBelongsToSession,
  extractArtifactContentFromMessages,
  formatLastAssistantTurn,
  knownMessageIdsFromSession,
  mapOpenCodeEventToActivity,
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

describe('knownMessageIdsFromSession', () => {
  it('collects message and part ids', () => {
    const ids = knownMessageIdsFromSession([
      {
        info: { role: 'user', id: 'msg_1' },
        parts: [{ type: 'text', text: 'hi', messageID: 'msg_1' }],
      },
    ])
    expect(ids.has('msg_1')).toBe(true)
  })
})

describe('formatLastAssistantTurn', () => {
  it('returns only the latest assistant block', () => {
    expect(
      formatLastAssistantTurn([
        { info: { role: 'user' }, parts: [{ type: 'text', text: 'hello' }] },
        { info: { role: 'assistant' }, parts: [{ type: 'text', text: 'first' }] },
        { info: { role: 'user' }, parts: [{ type: 'text', text: 'again' }] },
        { info: { role: 'assistant' }, parts: [{ type: 'text', text: 'second reply' }] },
      ]),
    ).toBe('**Assistant:**\nsecond reply')
  })
})

describe('mapOpenCodeEventToActivity', () => {
  it('maps permission.updated to permission_request activity', () => {
    const activity = mapOpenCodeEventToActivity({
      type: 'permission.updated',
      properties: {
        id: 'perm_1',
        type: 'write',
        sessionID: 'ses_abc',
        messageID: 'msg_1',
        title: 'Write file src/index.ts',
        metadata: {},
        time: { created: Date.now() },
      },
    } as Event)

    expect(activity).toEqual({
      type: 'permission_request',
      timestamp: expect.any(String),
      content: 'Write file src/index.ts',
      metadata: {
        permissionId: 'perm_1',
        sessionId: 'ses_abc',
        permissionType: 'write',
        pattern: undefined,
      },
    })
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

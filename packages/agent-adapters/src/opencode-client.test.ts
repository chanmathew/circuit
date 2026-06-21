import { describe, expect, it } from 'vitest'

import {
  createSessionAbortedError,
  formatOpenCodeSdkError,
  isSessionAbortedError,
  mapOpenCodeEventToActivity,
  SESSION_ABORTED_BY_USER,
} from './opencode-client.js'

describe('formatOpenCodeSdkError', () => {
  it('passes through Error instances', () => {
    const error = new Error('model not found')
    expect(formatOpenCodeSdkError(error, 'fallback')).toBe(error)
  })

  it('extracts message fields from OpenCode error objects', () => {
    const error = formatOpenCodeSdkError(
      { name: 'ModelError', data: { message: 'deepseek-v4-flash-free unavailable' } },
      'OpenCode prompt failed',
    )
    expect(error.message).toBe('deepseek-v4-flash-free unavailable')
  })
})

describe('session abort helpers', () => {
  it('recognizes the shared abort error message', () => {
    const error = createSessionAbortedError()
    expect(error.message).toBe(SESSION_ABORTED_BY_USER)
    expect(isSessionAbortedError(error)).toBe(true)
  })
})

describe('mapOpenCodeEventToActivity', () => {
  it('maps question tool part updates to question_request activities', () => {
    const activity = mapOpenCodeEventToActivity({
      type: 'message.part.updated',
      properties: {
        part: {
          type: 'tool',
          tool: 'question',
          callID: 'call_q1',
          sessionID: 'ses-1',
          state: {
            status: 'running',
            input: {
              questions: [
                {
                  header: 'Scope',
                  question: 'Include admin users?',
                  options: [{ label: 'Yes' }, { label: 'No' }],
                },
              ],
            },
          },
        },
      },
    } as never)

    expect(activity).toMatchObject({
      type: 'question_request',
      content: 'Include admin users?',
      metadata: {
        requestId: 'call_q1',
        sessionId: 'ses-1',
      },
    })
  })

  it('maps question.asked events without top-level id using tool callID', () => {
    const activity = mapOpenCodeEventToActivity({
      type: 'question.asked',
      properties: {
        sessionID: 'ses-1',
        questions: [{ header: 'Auth', question: 'OAuth or SAML?', options: [{ label: 'OAuth' }] }],
        tool: { callID: 'call_q2', messageID: 'msg-1' },
      },
    } as never)

    expect(activity).toMatchObject({
      type: 'question_request',
      metadata: {
        requestId: 'call_q2',
        sessionId: 'ses-1',
      },
    })
  })
})

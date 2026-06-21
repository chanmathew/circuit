import { describe, expect, it } from 'vitest'

import {
  createSessionAbortedError,
  formatOpenCodeSdkError,
  isSessionAbortedError,
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

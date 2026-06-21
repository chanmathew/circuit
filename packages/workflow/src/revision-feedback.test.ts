import { describe, expect, it } from 'vitest'

import { isRevisionFeedback } from './revision-feedback.js'

describe('isRevisionFeedback', () => {
  it('treats non-questions as revision feedback', () => {
    expect(isRevisionFeedback('Use a different folder layout')).toBe(true)
    expect(isRevisionFeedback('Please revise the design.')).toBe(true)
  })

  it('treats questions as chat', () => {
    expect(isRevisionFeedback('Why did you choose this approach?')).toBe(false)
    expect(isRevisionFeedback('What is the tradeoff?')).toBe(false)
  })

  it('rejects empty input', () => {
    expect(isRevisionFeedback('')).toBe(false)
    expect(isRevisionFeedback('   ')).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'

import { inferRevisionFromSteering } from './steering-inference.js'

describe('inferRevisionFromSteering', () => {
  const structuredPhases = [
    { name: 'questions', status: 'approved' as const },
    { name: 'research', status: 'approved' as const },
    { name: 'design', status: 'approved' as const },
    { name: 'structure', status: 'needs_review' as const },
    { name: 'plan', status: 'ready' as const },
    { name: 'implement', status: 'locked' as const },
    { name: 'review', status: 'locked' as const },
  ]

  it('infers design revision when user steers routing strategy', () => {
    const result = inferRevisionFromSteering({
      text: 'Actually, use folder routing instead.',
      workflowType: 'structured_change',
      phases: structuredPhases,
    })

    expect(result).toMatchObject({
      source: 'chat',
      affectedPhase: 'design',
      stalePhases: ['structure'],
    })
    expect(result?.message).toContain('Structure')
  })

  it('returns null when steering lacks a material signal', () => {
    expect(
      inferRevisionFromSteering({
        text: 'What is the current design?',
        workflowType: 'structured_change',
        phases: structuredPhases,
      }),
    ).toBeNull()
  })
})

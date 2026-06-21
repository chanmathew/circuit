import { describe, expect, it } from 'vitest'

import { getPhaseRunLabel } from './phase-next-step.js'

describe('getPhaseRunLabel', () => {
  it('returns run label for middle phases in structured_change', () => {
    expect(getPhaseRunLabel('questions', 'structured_change')).toBe('Run Research')
    expect(getPhaseRunLabel('implement', 'structured_change')).toBe('Run Review')
  })

  it('returns complete workflow for the terminal phase', () => {
    expect(getPhaseRunLabel('review', 'structured_change')).toBe('Complete workflow')
    expect(getPhaseRunLabel('review', 'quick_fix')).toBe('Complete workflow')
  })

  it('returns run implementation after plan approval', () => {
    expect(getPhaseRunLabel('plan', 'structured_change')).toBe('Run Implement')
  })

  it('handles investigation workflow phases', () => {
    expect(getPhaseRunLabel('hypotheses', 'investigation')).toBe('Run Reproduce')
    expect(getPhaseRunLabel('fix_plan', 'investigation')).toBe('Run Implement')
  })
})

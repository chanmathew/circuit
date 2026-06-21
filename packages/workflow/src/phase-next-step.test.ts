import { describe, expect, it } from 'vitest'

import { getPhaseNextStepLabel } from './phase-next-step.js'

describe('getPhaseNextStepLabel', () => {
  it('returns proceed label for middle phases in structured_change', () => {
    expect(getPhaseNextStepLabel('questions', 'structured_change')).toBe('Proceed to Research')
    expect(getPhaseNextStepLabel('implement', 'structured_change')).toBe('Proceed to Review')
  })

  it('returns complete workflow for the terminal phase', () => {
    expect(getPhaseNextStepLabel('review', 'structured_change')).toBe('Complete workflow')
    expect(getPhaseNextStepLabel('review', 'quick_fix')).toBe('Complete workflow')
  })

  it('returns unlock implementation for plan', () => {
    expect(getPhaseNextStepLabel('plan', 'structured_change')).toBe('Unlock implementation')
  })

  it('handles investigation workflow phases', () => {
    expect(getPhaseNextStepLabel('hypotheses', 'investigation')).toBe('Proceed to Reproduce')
    expect(getPhaseNextStepLabel('fix_plan', 'investigation')).toBe('Proceed to Implement')
  })
})

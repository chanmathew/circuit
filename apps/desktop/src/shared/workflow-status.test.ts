import { describe, expect, it } from 'vitest'

import {
  canEnableWorkflow,
  formatWorkflowSubtitle,
  hasStartedPhase,
  isAwaitingFirstPhase,
  isWorkflowActive,
} from './workflow-status.js'

const basePhases = [
  { name: 'questions', status: 'ready' },
  { name: 'research', status: 'pending' },
  { name: 'design', status: 'pending' },
]

describe('formatWorkflowSubtitle', () => {
  it('returns Chat when workflow not started', () => {
    expect(
      formatWorkflowSubtitle({
        workflowStatus: 'not_started',
        workflowType: 'freeform',
        currentPhase: 'chat',
        phases: basePhases,
      }),
    ).toBe('Chat')
  })

  it('returns ready to start when workflow active but no phase run yet', () => {
    expect(
      formatWorkflowSubtitle({
        workflowStatus: 'active',
        workflowType: 'structured_change',
        currentPhase: 'questions',
        phases: basePhases,
      }),
    ).toBe('Workflow active · ready to start')
  })

  it('derives running and review copy from phase status', () => {
    expect(
      formatWorkflowSubtitle({
        workflowStatus: 'active',
        workflowType: 'structured_change',
        currentPhase: 'questions',
        phases: [
          { name: 'questions', status: 'running' },
          { name: 'research', status: 'pending' },
        ],
      }),
    ).toBe('Questions running')

    expect(
      formatWorkflowSubtitle({
        workflowStatus: 'active',
        workflowType: 'structured_change',
        currentPhase: 'design',
        phases: [
          { name: 'questions', status: 'approved' },
          { name: 'design', status: 'needs_review' },
        ],
      }),
    ).toBe('Design · ready for review')
  })

  it('returns terminal workflow copy', () => {
    expect(
      formatWorkflowSubtitle({
        workflowStatus: 'completed',
        workflowType: 'structured_change',
        currentPhase: 'review',
        phases: [],
      }),
    ).toBe('Workflow complete')

    expect(
      formatWorkflowSubtitle({
        workflowStatus: 'cancelled',
        workflowType: 'structured_change',
        currentPhase: 'research',
        phases: [],
      }),
    ).toBe('Workflow cancelled')
  })
})

describe('workflow status helpers', () => {
  it('detects started phases', () => {
    expect(hasStartedPhase([{ status: 'pending' }])).toBe(false)
    expect(hasStartedPhase([{ status: 'running' }])).toBe(true)
    expect(hasStartedPhase([{ status: 'approved' }])).toBe(true)
  })

  it('gates enable and active checks', () => {
    expect(canEnableWorkflow('not_started')).toBe(true)
    expect(canEnableWorkflow('none')).toBe(true)
    expect(canEnableWorkflow('active')).toBe(false)
    expect(canEnableWorkflow('completed')).toBe(true)
    expect(canEnableWorkflow('cancelled')).toBe(true)
    expect(isWorkflowActive('active')).toBe(true)
    expect(isWorkflowActive('not_started')).toBe(false)
  })

  it('detects pre-first-phase state', () => {
    expect(isAwaitingFirstPhase('active', [{ status: 'ready' }])).toBe(true)
    expect(isAwaitingFirstPhase('active', [{ status: 'running' }])).toBe(false)
    expect(isAwaitingFirstPhase('not_started', [])).toBe(false)
  })
})

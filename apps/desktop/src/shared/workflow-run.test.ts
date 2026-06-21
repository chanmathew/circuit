import { describe, expect, it } from 'vitest'

import { deriveTaskWorkflowStatus } from '../main/services/sync-task-workflow-status.js'
import { canDiscardWorkflowDraft } from './workflow-run.js'

describe('deriveTaskWorkflowStatus', () => {
  it('returns not_started when no runs', () => {
    expect(deriveTaskWorkflowStatus([])).toBe('not_started')
  })

  it('returns active when an active run exists', () => {
    expect(
      deriveTaskWorkflowStatus([
        {
          id: '1',
          taskId: 't',
          status: 'active',
          workflowType: 'structured_change',
          title: 'Run',
          startedAt: '2026-01-01',
          completedAt: null,
          cancelledAt: null,
          currentPhaseId: null,
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
        },
      ]),
    ).toBe('active')
  })

  it('returns completed from latest terminal run', () => {
    expect(
      deriveTaskWorkflowStatus([
        {
          id: '2',
          taskId: 't',
          status: 'cancelled',
          workflowType: 'structured_change',
          title: 'Old',
          startedAt: '2026-01-01',
          completedAt: null,
          cancelledAt: '2026-01-02',
          currentPhaseId: null,
          createdAt: '2026-01-01',
          updatedAt: '2026-01-02',
        },
        {
          id: '3',
          taskId: 't',
          status: 'completed',
          workflowType: 'structured_change',
          title: 'New',
          startedAt: '2026-01-03',
          completedAt: '2026-01-04',
          cancelledAt: null,
          currentPhaseId: null,
          createdAt: '2026-01-03',
          updatedAt: '2026-01-04',
        },
      ]),
    ).toBe('completed')
  })
})

describe('canDiscardWorkflowDraft', () => {
  it('allows discard only for ticket-only active runs', () => {
    const run = {
      id: 'r1',
      taskId: 't1',
      status: 'active' as const,
      workflowType: 'structured_change',
      title: 'Draft',
      startedAt: '2026-01-01',
    }

    expect(canDiscardWorkflowDraft(run, [{ status: 'ready' }])).toBe(true)
    expect(canDiscardWorkflowDraft(run, [{ status: 'running' }])).toBe(false)
    expect(canDiscardWorkflowDraft(undefined, [])).toBe(false)
  })
})

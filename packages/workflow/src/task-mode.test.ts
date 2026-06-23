import { describe, expect, it } from 'vitest'

import {
  getEffectiveTaskMode,
  isTaskModeEditable,
  resolvePreviewWorkflowType,
  resolveWorkflowTypeFromTaskMode,
} from './task-mode.js'

describe('resolveWorkflowTypeFromTaskMode', () => {
  it('uses autoSelectWorkflow for auto mode', () => {
    expect(resolveWorkflowTypeFromTaskMode('auto', 'fix typo in readme')).toBe('quick_fix')
  })

  it('returns explicit mode for guided build', () => {
    expect(resolveWorkflowTypeFromTaskMode('structured_change', 'anything')).toBe(
      'structured_change',
    )
  })
})

describe('resolvePreviewWorkflowType', () => {
  it('marks explicit modes as not inferred', () => {
    const preview = resolvePreviewWorkflowType('structured_change', 'Add billing')
    expect(preview?.label).toBe('Guided Build')
    expect(preview?.inferred).toBe(false)
    expect(preview?.phases.length).toBeGreaterThan(0)
  })

  it('marks auto as inferred', () => {
    const preview = resolvePreviewWorkflowType('auto', 'Add OAuth login flow')
    expect(preview?.inferred).toBe(true)
    expect(preview?.workflowType).toBe('structured_change')
  })
})

describe('getEffectiveTaskMode', () => {
  it('locks to attached workflow type when active', () => {
    expect(
      getEffectiveTaskMode({
        taskMode: 'auto',
        workflowStatus: 'active',
        workflowType: 'quick_fix',
      }),
    ).toBe('quick_fix')
  })

  it('locks to attached workflow type when paused', () => {
    expect(
      getEffectiveTaskMode({
        taskMode: 'auto',
        workflowStatus: 'paused',
        workflowType: 'structured_change',
      }),
    ).toBe('structured_change')
  })

  it('uses stored mode when not started', () => {
    expect(
      getEffectiveTaskMode({
        taskMode: 'investigation',
        workflowStatus: 'not_started',
        workflowType: 'freeform',
      }),
    ).toBe('investigation')
  })
})

describe('isTaskModeEditable', () => {
  it('is false for active or paused workflows', () => {
    expect(isTaskModeEditable('active')).toBe(false)
    expect(isTaskModeEditable('paused')).toBe(false)
    expect(isTaskModeEditable('not_started')).toBe(true)
    expect(isTaskModeEditable('completed')).toBe(true)
  })
})

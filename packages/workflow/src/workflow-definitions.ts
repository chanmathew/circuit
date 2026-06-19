import type { WorkflowType } from './types.js'

export interface WorkflowDefinition {
  type: WorkflowType
  label: string
  phases: string[]
}

export const QUICK_FIX: WorkflowDefinition = {
  type: 'quick_fix',
  label: 'Quick Fix',
  phases: ['plan', 'implement', 'review'],
}

export const STRUCTURED_CHANGE: WorkflowDefinition = {
  type: 'structured_change',
  label: 'Structured Change',
  phases: ['questions', 'research', 'design', 'structure', 'plan', 'implement', 'review'],
}

export const INVESTIGATION: WorkflowDefinition = {
  type: 'investigation',
  label: 'Investigation',
  phases: ['questions', 'research', 'hypotheses', 'reproduce', 'fix_plan', 'implement', 'review'],
}

export const WORKFLOW_DEFINITIONS: Record<
  Exclude<WorkflowType, 'pr_review' | 'freeform'>,
  WorkflowDefinition
> = {
  quick_fix: QUICK_FIX,
  structured_change: STRUCTURED_CHANGE,
  investigation: INVESTIGATION,
}

export function getWorkflowDefinition(type: WorkflowType): WorkflowDefinition | undefined {
  if (type === 'pr_review' || type === 'freeform') return undefined
  return WORKFLOW_DEFINITIONS[type]
}

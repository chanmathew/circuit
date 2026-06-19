import type { WorkflowType, WorkspaceStrategy } from './types.js'

export interface WorkflowSelection {
  workflowType: WorkflowType
  workspaceStrategy: WorkspaceStrategy
  confidence: number
  reason: string
}

export function autoSelectWorkflow(_description: string): WorkflowSelection {
  // Stub: defaults to structured change until inference is implemented.
  return {
    workflowType: 'structured_change',
    workspaceStrategy: 'git-worktree',
    confidence: 0,
    reason: 'Auto-selection not yet implemented; using Structured Change defaults.',
  }
}

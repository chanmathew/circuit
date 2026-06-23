import type { WorkflowType, WorkspaceStrategy } from './types.js'

export interface WorkflowSelection {
  workflowType: WorkflowType
  workspaceStrategy: WorkspaceStrategy
  confidence: number
  reason: string
}

const INVESTIGATION_PATTERNS = [
  /\binvestigat/i,
  /\bdebug/i,
  /\broot cause/i,
  /\bwhy does/i,
  /\breproduce/i,
  /\bduplicate/i,
  /\bbug\b/i,
]

const QUICK_FIX_PATTERNS = [/\bquick fix/i, /\bhotfix/i, /\bsmall fix/i, /\btypo/i]

export function autoSelectWorkflow(description: string): WorkflowSelection {
  const text = description.trim()
  if (!text) {
    return {
      workflowType: 'structured_change',
      workspaceStrategy: 'git-worktree',
      confidence: 0,
      reason: 'Empty description; defaulting to Guided Build.',
    }
  }

  if (QUICK_FIX_PATTERNS.some((pattern) => pattern.test(text))) {
    return {
      workflowType: 'quick_fix',
      workspaceStrategy: 'current',
      confidence: 0.7,
      reason: 'Matched quick-fix keywords.',
    }
  }

  if (INVESTIGATION_PATTERNS.some((pattern) => pattern.test(text))) {
    return {
      workflowType: 'investigation',
      workspaceStrategy: 'git-worktree',
      confidence: 0.75,
      reason: 'Matched investigation / debug keywords.',
    }
  }

  return {
    workflowType: 'structured_change',
    workspaceStrategy: 'git-worktree',
    confidence: 0.5,
    reason: 'Default guided build workflow.',
  }
}

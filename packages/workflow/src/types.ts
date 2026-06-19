export type TaskStatus =
  | 'draft'
  | 'running'
  | 'needs_review'
  | 'needs_decision'
  | 'blocked'
  | 'implementing'
  | 'diff_ready'
  | 'done'
  | 'archived'

export type WorkflowType =
  | 'quick_fix'
  | 'structured_change'
  | 'investigation'
  | 'pr_review'
  | 'freeform'

export type WorkspaceStrategy = 'current' | 'git-worktree' | 'cow-worktree' | 'full-copy'

export type PhaseStatus =
  | 'locked'
  | 'ready'
  | 'running'
  | 'needs_review'
  | 'approved'
  | 'needs_revision'
  | 'stale'
  | 'failed'
  | 'skipped'

/** How an artifact revision affects downstream phases. */
export type RevisionKind = 'minor' | 'material' | 'alternate'

export type ArtifactStatus = 'draft' | 'needs_review' | 'approved' | 'rejected' | 'stale'

export type PhaseRunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

export interface Task {
  id: string
  repoId: string
  title: string
  slug: string
  description: string
  workflowType: WorkflowType
  status: TaskStatus
  currentPhase: string
  branchName: string
  workspacePath: string
  workspaceStrategy: WorkspaceStrategy
  createdAt: string
  updatedAt: string
}

export interface Phase {
  id: string
  taskId: string
  name: string
  status: PhaseStatus
  order: number
  /** Artifact currently associated with this phase. */
  currentArtifactId: string | null
  /** Upstream artifact versions this phase was generated from. */
  dependsOnArtifactIds: string[]
  /** Set when status is stale — why downstream work needs refresh. */
  staleReason: string | null
}

export interface Artifact {
  id: string
  taskId: string
  phase: string
  path: string
  title: string
  content: string
  version: number
  status: ArtifactStatus
  createdAt: string
  updatedAt: string
}

export interface PhaseRun {
  id: string
  taskId: string
  phase: string
  agent: string
  model: string
  status: PhaseRunStatus
  inputPrompt: string
  transcript: string
  filesRead: string[]
  filesChanged: string[]
  commandsRun: string[]
  startedAt: string
  completedAt: string | null
}

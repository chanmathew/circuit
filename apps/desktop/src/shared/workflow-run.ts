export type WorkflowRunStatus = 'active' | 'completed' | 'cancelled'

export interface WorkflowRunDto {
  id: string
  taskId: string
  status: WorkflowRunStatus
  workflowType: string
  title: string
  startedAt: string
  completedAt?: string
  cancelledAt?: string
  currentPhaseId?: string
  /** Completion summary artifact id when run completed. */
  completionSummaryArtifactId?: string
}

export interface WorkflowRunDetailDto extends WorkflowRunDto {
  phases: import('./api.js').PhaseDto[]
  artifacts: import('./api.js').ArtifactDto[]
}

/** True when active run has ticket only — no phase harness started yet. */
export function canDiscardWorkflowDraft(
  run: WorkflowRunDto | undefined,
  phases: Array<{ status: string }>,
): boolean {
  if (!run || run.status !== 'active') return false
  return !hasStartedWorkflowPhase(phases)
}

const STARTED_PHASE_STATUSES = new Set([
  'running',
  'needs_review',
  'needs_revision',
  'approved',
  'skipped',
  'failed',
])

export function hasStartedWorkflowPhase(phases: Array<{ status: string }>): boolean {
  return phases.some((phase) => STARTED_PHASE_STATUSES.has(phase.status))
}

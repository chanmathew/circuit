import { getPhaseLabel } from '@circuit/workflow'

import type { WorkflowRunDto } from './workflow-run.js'
import { hasStartedWorkflowPhase } from './workflow-run.js'

/** Lifecycle of the structured workflow attached to a task (ADR 002/003). */
export type WorkflowStatus = 'not_started' | 'active' | 'completed' | 'cancelled'

export interface WorkflowSubtitleInput {
  workflowStatus: string
  workflowType: string
  currentPhase: string
  phases: Array<{ name: string; status: string }>
  activeWorkflowRun?: WorkflowRunDto
  pastWorkflowRuns?: WorkflowRunDto[]
}

function currentPhaseRow(input: WorkflowSubtitleInput) {
  return input.phases.find((phase) => phase.name === input.currentPhase)
}

export function hasStartedPhase(phases: Array<{ status: string }>): boolean {
  return hasStartedWorkflowPhase(phases)
}

/** Sidebar / header subtitle derived from workflow + phase status. */
export function formatWorkflowSubtitle(input: WorkflowSubtitleInput): string {
  const { workflowStatus, currentPhase, phases, activeWorkflowRun } = input

  if (activeWorkflowRun?.status === 'active') {
    const phase = currentPhaseRow(input)
    const phaseLabel = getPhaseLabel(currentPhase)

    if (phase?.status === 'running') {
      return `${phaseLabel} running`
    }

    if (phase?.status === 'needs_review') {
      return `${phaseLabel} · ready for review`
    }

    if (phase?.status === 'needs_revision') {
      return `${phaseLabel} · revision requested`
    }

    if (!hasStartedPhase(phases)) {
      return 'Workflow active · ready to start'
    }

    return `Workflow · ${phaseLabel}`
  }

  if (workflowStatus === 'not_started' || workflowStatus === 'none') {
    return 'Chat'
  }

  if (workflowStatus === 'completed') {
    return 'Workflow complete'
  }

  if (workflowStatus === 'cancelled' || workflowStatus === 'archived') {
    return 'Workflow cancelled'
  }

  if (workflowStatus === 'paused') {
    const label = getPhaseLabel(currentPhase)
    return `Workflow active · paused at ${label}`
  }

  if (workflowStatus !== 'active') {
    return workflowStatus.replace(/_/g, ' ')
  }

  const phase = currentPhaseRow(input)
  const phaseLabel = getPhaseLabel(currentPhase)

  if (phase?.status === 'running') {
    return `${phaseLabel} running`
  }

  if (phase?.status === 'needs_review') {
    return `${phaseLabel} · ready for review`
  }

  if (phase?.status === 'needs_revision') {
    return `${phaseLabel} · revision requested`
  }

  if (!hasStartedPhase(phases)) {
    return 'Workflow active · ready to start'
  }

  return `Workflow · ${phaseLabel}`
}

/** Whether a task has an attached workflow in progress. */
export function isWorkflowActive(workflowStatus: string): boolean {
  return workflowStatus === 'active' || workflowStatus === 'paused'
}

/** Whether workflow can be enabled from the panel (no active run). */
export function canEnableWorkflow(workflowStatus: string): boolean {
  return !isWorkflowActive(workflowStatus)
}

/** Active workflow attached but no phase harness has run yet (ADR 002 pre-first-phase). */
export function isAwaitingFirstPhase(
  workflowStatus: string,
  phases: Array<{ status: string }>,
): boolean {
  return isWorkflowActive(workflowStatus) && !hasStartedPhase(phases)
}

export function hasPastWorkflowRuns(pastWorkflowRuns?: WorkflowRunDto[]): boolean {
  return (pastWorkflowRuns?.length ?? 0) > 0
}

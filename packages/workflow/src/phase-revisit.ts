import { getWorkflowDefinition } from './workflow-definitions.js'
import type { Phase, RevisionKind, Task, WorkflowType } from './types.js'

const IMPLEMENTATION_PHASES = new Set(['implement', 'review'])

const REVISIT_WARNING_PHASES = new Set(['design', 'structure', 'plan'])

export interface RevisitWarning {
  phase: string
  message: string
}

export interface DownstreamInvalidation {
  phases: Phase[]
  stalePhaseNames: string[]
  implementationLocked: boolean
}

/** Phases downstream of the given phase name within a workflow. */
export function getDownstreamPhaseNames(workflowType: WorkflowType, phaseName: string): string[] {
  const definition = getWorkflowDefinition(workflowType)
  if (!definition) return []

  const index = definition.phases.indexOf(phaseName)
  if (index === -1) return []

  return definition.phases.slice(index + 1)
}

/** Whether revisiting this phase should warn because implementation may already exist. */
export function getRevisitWarning(task: Task, phaseName: string): RevisitWarning | undefined {
  if (!REVISIT_WARNING_PHASES.has(phaseName)) return undefined
  if (!IMPLEMENTATION_PHASES.has(task.currentPhase) && task.status !== 'implementing') {
    return undefined
  }

  return {
    phase: phaseName,
    message:
      'Implementation has already started. Revising this phase may invalidate existing code in the workspace.',
  }
}

/** Mark downstream phases stale after a material upstream revision. */
export function invalidateDownstreamPhases(
  phases: Phase[],
  workflowType: WorkflowType,
  revisedPhaseName: string,
  reason: string,
): DownstreamInvalidation {
  const downstreamNames = new Set(getDownstreamPhaseNames(workflowType, revisedPhaseName))

  const updated = phases.map((phase) => {
    if (!downstreamNames.has(phase.name)) return phase
    if (phase.status === 'skipped' || phase.status === 'locked') return phase

    return {
      ...phase,
      status: 'stale' as const,
      staleReason: reason,
    }
  })

  const stalePhaseNames = updated
    .filter((p) => downstreamNames.has(p.name) && p.status === 'stale')
    .map((p) => p.name)

  const implementationLocked = stalePhaseNames.some((name) => IMPLEMENTATION_PHASES.has(name))

  return { phases: updated, stalePhaseNames, implementationLocked }
}

/** Apply a revision to a phase and optionally invalidate downstream work. */
export function applyPhaseRevision(
  phases: Phase[],
  workflowType: WorkflowType,
  phaseName: string,
  revisionKind: RevisionKind,
  reason: string,
): Phase[] {
  if (revisionKind === 'alternate') {
    throw new Error('Alternate path revisions are deferred until after MVP.')
  }

  const phaseIndex = phases.findIndex((p) => p.name === phaseName)
  if (phaseIndex === -1) return phases

  const revisedPhase = phases[phaseIndex]!

  if (revisionKind === 'minor') {
    return phases.map((phase, index) =>
      index === phaseIndex ? { ...phase, status: 'running' as const, staleReason: null } : phase,
    )
  }

  const { phases: withStaleDownstream } = invalidateDownstreamPhases(
    phases.map((phase, index) =>
      index === phaseIndex
        ? { ...revisedPhase, status: 'needs_revision' as const, staleReason: null }
        : phase,
    ),
    workflowType,
    phaseName,
    reason,
  )

  return withStaleDownstream
}

/** True when implementation must stay locked until stale phases are refreshed. */
export function isImplementationLocked(phases: Phase[]): boolean {
  return phases.some((phase) => IMPLEMENTATION_PHASES.has(phase.name) && phase.status === 'stale')
}

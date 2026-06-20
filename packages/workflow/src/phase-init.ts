import { getPhaseLabel } from './phase-labels.js'
import { getWorkflowDefinition } from './workflow-definitions.js'
import type { PhaseStatus, WorkflowType } from './types.js'

export interface InitialPhase {
  name: string
  label: string
  order: number
  status: PhaseStatus
}

/** Build initial phase rows for a new task. First phase is ready; others are locked. */
export function buildInitialPhases(workflowType: WorkflowType): InitialPhase[] {
  const definition = getWorkflowDefinition(workflowType)
  if (!definition) return []

  return definition.phases.map((name, order) => ({
    name,
    label: getPhaseLabel(name),
    order,
    status: order === 0 ? 'ready' : 'locked',
  }))
}

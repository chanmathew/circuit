import { getPhaseLabel } from './phase-labels.js'
import { getWorkflowDefinition } from './workflow-definitions.js'
import type { WorkflowType } from './types.js'

/** Primary CTA label when approving a phase artifact — names the harness that will run next. */
export function getPhaseRunLabel(currentPhase: string, workflowType: WorkflowType): string {
  const definition = getWorkflowDefinition(workflowType)
  if (!definition) {
    return `Run ${getPhaseLabel(currentPhase)}`
  }

  const index = definition.phases.indexOf(currentPhase)
  if (index === -1) {
    return `Run ${getPhaseLabel(currentPhase)}`
  }

  const nextPhase = definition.phases[index + 1]
  if (!nextPhase) return 'Complete workflow'

  return `Run ${getPhaseLabel(nextPhase)}`
}

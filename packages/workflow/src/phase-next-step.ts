import { getPhaseLabel } from './phase-labels.js'
import { getWorkflowDefinition } from './workflow-definitions.js'
import type { WorkflowType } from './types.js'

/** Contextual primary CTA label when a phase artifact is ready for review. */
export function getPhaseNextStepLabel(currentPhase: string, workflowType: WorkflowType): string {
  if (currentPhase === 'plan') return 'Unlock implementation'

  const definition = getWorkflowDefinition(workflowType)
  if (!definition) {
    return `Proceed with ${getPhaseLabel(currentPhase).toLowerCase()}`
  }

  const index = definition.phases.indexOf(currentPhase)
  if (index === -1) {
    return `Proceed with ${getPhaseLabel(currentPhase).toLowerCase()}`
  }

  const nextPhase = definition.phases[index + 1]
  if (!nextPhase) return 'Complete workflow'

  return `Proceed to ${getPhaseLabel(nextPhase)}`
}

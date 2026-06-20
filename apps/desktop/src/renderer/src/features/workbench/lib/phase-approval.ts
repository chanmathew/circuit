import type { DecisionRequiredPayload } from '@circuit/protocol'
import {
  approveBlockedReason,
  getPhaseLabel,
  getProceedLabel as workflowProceedLabel,
} from '@circuit/workflow'

export interface DecisionResolutionLike {
  decisionId: string
  phase: string
}

export function getApproveBlockedReason(
  requiredDecisions: DecisionRequiredPayload[],
  resolutions: DecisionResolutionLike[],
): string | null {
  const resolvedIds = new Set(resolutions.map((r) => r.decisionId))
  return approveBlockedReason(requiredDecisions, resolvedIds)
}

export function canApprovePhase(
  requiredDecisions: DecisionRequiredPayload[],
  resolutions: DecisionResolutionLike[],
): boolean {
  return getApproveBlockedReason(requiredDecisions, resolutions) === null
}

export function getProceedLabel(phaseName: string): string {
  return workflowProceedLabel(phaseName, getPhaseLabel)
}

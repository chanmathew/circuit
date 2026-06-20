import { getPhaseLabel } from '@circuit/workflow'

import { decisionsFromFeed } from './decisions.js'

export interface DecisionResolutionLike {
  decisionId: string
  phase: string
}

export function getApproveBlockedReason(
  feedEvents: { type: string; payload: unknown }[],
  resolutions: DecisionResolutionLike[],
  phaseName: string,
): string | null {
  const required = decisionsFromFeed(feedEvents, phaseName)
  const unresolved = required.filter(
    (decision) => !resolutions.some((r) => r.decisionId === decision.decisionId),
  )

  if (unresolved.length > 0) {
    return `${unresolved.length} decision${unresolved.length === 1 ? '' : 's'} need a selection`
  }

  return null
}

export function canApprovePhase(
  feedEvents: { type: string; payload: unknown }[],
  resolutions: DecisionResolutionLike[],
  phaseName: string,
): boolean {
  return getApproveBlockedReason(feedEvents, resolutions, phaseName) === null
}

export function getProceedLabel(phaseName: string): string {
  if (phaseName === 'plan') return 'Unlock implementation'
  if (phaseName === 'review') return 'Approve review'

  const order = [
    'questions',
    'research',
    'design',
    'structure',
    'plan',
    'implement',
    'review',
  ] as const

  const idx = order.indexOf(phaseName as (typeof order)[number])
  const next = idx >= 0 ? order[idx + 1] : undefined
  if (!next) return `Approve ${getPhaseLabel(phaseName).toLowerCase()}`

  return `Proceed to ${getPhaseLabel(next).toLowerCase()}`
}

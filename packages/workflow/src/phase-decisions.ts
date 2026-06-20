export interface DecisionLike {
  decisionId: string
}

export function getUnresolvedDecisions<T extends DecisionLike>(
  required: T[],
  resolvedDecisionIds: Set<string>,
): T[] {
  return required.filter((decision) => !resolvedDecisionIds.has(decision.decisionId))
}

export function approveBlockedReason(
  required: DecisionLike[],
  resolvedDecisionIds: Set<string>,
): string | null {
  const unresolved = getUnresolvedDecisions(required, resolvedDecisionIds)
  if (unresolved.length === 0) return null
  return `${unresolved.length} decision${unresolved.length === 1 ? '' : 's'} need a selection`
}

export function getProceedLabel(phaseName: string, getLabel: (name: string) => string): string {
  const order = [
    'questions',
    'research',
    'design',
    'structure',
    'plan',
    'implement',
    'review',
  ] as const

  if (phaseName === 'plan') return 'Unlock implementation'
  if (phaseName === 'review') return 'Approve review'

  const idx = order.indexOf(phaseName as (typeof order)[number])
  const next = idx >= 0 ? order[idx + 1] : undefined
  if (!next) return `Approve ${getLabel(phaseName).toLowerCase()}`

  return `Proceed to ${getLabel(next).toLowerCase()}`
}

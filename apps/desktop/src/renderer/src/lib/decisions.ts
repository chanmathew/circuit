import type { DecisionOption, DecisionRequiredPayload } from '@circuit/protocol'

export function isDecisionRequiredPayload(payload: unknown): payload is DecisionRequiredPayload {
  if (typeof payload !== 'object' || payload === null) return false
  const p = payload as Record<string, unknown>
  return typeof p.decisionId === 'string' && typeof p.title === 'string' && Array.isArray(p.options)
}

export function decisionsFromFeed(
  events: { type: string; payload: unknown }[],
  phaseName?: string,
): DecisionRequiredPayload[] {
  return events
    .filter((event) => event.type === 'decision:required')
    .map((event) => event.payload)
    .filter(isDecisionRequiredPayload)
    .filter((decision) => !decision.phase || !phaseName || decision.phase === phaseName)
}

export type { DecisionOption, DecisionRequiredPayload }

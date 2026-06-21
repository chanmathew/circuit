import type { CircuitEvent, DecisionRequiredPayload } from '@circuit/protocol'
import { parseTranscript } from '@circuit/protocol'

export function requiredDecisionsFromTranscript(
  transcript: string,
  taskId: string,
  phaseRunId: string,
  timestamp: string,
  phaseName?: string,
): DecisionRequiredPayload[] {
  const parsed = parseTranscript(transcript, { taskId, phaseRunId, timestamp })
  return parsed.events
    .filter((event) => event.type === 'decision:required')
    .map((event) => event.payload as DecisionRequiredPayload)
    .filter((decision) => !decision.phase || !phaseName || decision.phase === phaseName)
}

export function requiredDecisionsForPhaseFromRuns(
  taskId: string,
  phaseName: string,
  runs: { id: string; phase: string; transcript: string; startedAt: string }[],
): DecisionRequiredPayload[] {
  const phaseRuns = runs.filter((run) => run.phase === phaseName)
  if (phaseRuns.length === 0) return []

  const latest = phaseRuns[phaseRuns.length - 1]!
  return requiredDecisionsFromTranscript(
    latest.transcript,
    taskId,
    latest.id,
    latest.startedAt,
    phaseName,
  )
}

export function findRequiredDecision(
  taskId: string,
  decisionId: string,
  runs: { id: string; phase: string; transcript: string; startedAt: string }[],
): { decision: DecisionRequiredPayload; phase: string } | undefined {
  for (let index = runs.length - 1; index >= 0; index -= 1) {
    const run = runs[index]
    if (!run) continue

    const decisions = requiredDecisionsFromTranscript(
      run.transcript,
      taskId,
      run.id,
      run.startedAt,
      run.phase,
    )
    const decision = decisions.find((item) => item.decisionId === decisionId)
    if (decision) {
      return { decision, phase: decision.phase ?? run.phase }
    }
  }

  return undefined
}

export function decisionResolvedEvents(
  taskId: string,
  resolutions: {
    decisionId: string
    optionId: string
    resolvedAt: string
  }[],
): CircuitEvent[] {
  return resolutions.map((resolution) => ({
    type: 'decision:resolved' as const,
    taskId,
    timestamp: resolution.resolvedAt,
    payload: {
      decisionId: resolution.decisionId,
      selectedOptionId: resolution.optionId,
    },
  }))
}

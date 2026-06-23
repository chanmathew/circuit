import { harnessTranscriptToEvents, parseTranscript, type CircuitEvent } from '@circuit/protocol'

export function buildFeedEvents(
  taskId: string,
  phaseRuns: {
    id: string
    phase: string
    transcript: string
    startedAt: string
    completedAt?: string | null
  }[],
): CircuitEvent[] {
  const events: CircuitEvent[] = []

  for (const run of phaseRuns) {
    const parsed = parseTranscript(run.transcript, {
      taskId,
      phaseRunId: run.id,
      timestamp: run.startedAt,
    })

    events.push({
      type: 'phase:started',
      taskId,
      phaseRunId: run.id,
      timestamp: run.startedAt,
      payload: { phaseRunId: run.id, phase: run.phase },
    })

    for (const event of parsed.events) {
      events.push(event)
    }

    if (run.phase === 'chat') {
      events.push(
        ...harnessTranscriptToEvents(run.transcript, {
          taskId,
          phaseRunId: run.id,
          startedAt: run.completedAt ?? run.startedAt,
        }),
      )
    }

    events.push({
      type: 'phase:completed',
      taskId,
      phaseRunId: run.id,
      timestamp: run.completedAt ?? run.startedAt,
      payload: { phaseRunId: run.id, phase: run.phase },
    })
  }

  return events.sort((a, b) => a.timestamp.localeCompare(b.timestamp))
}

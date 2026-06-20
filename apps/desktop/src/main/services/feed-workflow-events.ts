import type { CircuitEvent, WorkflowEventActor } from '@circuit/protocol'

import type { WorkflowEventRow } from '@circuit/db'

export function workflowEventsToFeedEvents(
  taskId: string,
  rows: WorkflowEventRow[],
): CircuitEvent[] {
  return rows.map((row) => ({
    id: row.id,
    type: row.type as CircuitEvent['type'],
    taskId,
    phaseRunId: row.phaseRunId ?? undefined,
    timestamp: row.createdAt,
    payload: JSON.parse(row.payloadJson) as unknown,
  }))
}

export function toWorkflowEventRow(input: {
  id: string
  taskId: string
  phaseRunId?: string
  actor: WorkflowEventActor
  type: string
  summary?: string
  payload: unknown
  externalSessionId?: string
  externalMessageId?: string
  createdAt: string
}): {
  id: string
  taskId: string
  phaseRunId: string | null
  actor: string
  type: string
  summary: string | null
  payloadJson: string
  externalSessionId: string | null
  externalMessageId: string | null
  createdAt: string
} {
  return {
    id: input.id,
    taskId: input.taskId,
    phaseRunId: input.phaseRunId ?? null,
    actor: input.actor,
    type: input.type,
    summary: input.summary ?? null,
    payloadJson: JSON.stringify(input.payload),
    externalSessionId: input.externalSessionId ?? null,
    externalMessageId: input.externalMessageId ?? null,
    createdAt: input.createdAt,
  }
}

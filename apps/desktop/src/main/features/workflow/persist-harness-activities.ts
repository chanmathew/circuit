import { createId } from '@circuit/shared'
import { insertWorkflowEvent } from '@circuit/db'
import type { AgentActivityEvent } from '@circuit/agent-adapters'

import { getDb } from '../../db.js'
import { toWorkflowEventRow } from '../../services/feed-workflow-events.js'

/** Persist normalized harness activities for inline stream replay. */
export function persistHarnessTurnActivities(
  taskId: string,
  phaseRunId: string,
  activities: AgentActivityEvent[],
): void {
  if (activities.length === 0) return

  insertWorkflowEvent(
    getDb(),
    toWorkflowEventRow({
      id: createId(),
      taskId,
      phaseRunId,
      actor: 'circuit',
      type: 'harness:turn_activities',
      summary: 'Harness activities',
      payload: { phaseRunId, activities },
      createdAt: new Date().toISOString(),
    }),
  )
}

import { insertWorkflowEvent } from '@circuit/db'
import type { StreamActivityEvent } from '@circuit/protocol'
import { createId } from '@circuit/shared'

import { getDb } from '../../db.js'
import { toWorkflowEventRow } from '../../services/feed-workflow-events.js'

function insertHarnessEvent(
  taskId: string,
  type: string,
  payload: unknown,
  externalSessionId?: string,
): void {
  insertWorkflowEvent(
    getDb(),
    toWorkflowEventRow({
      id: createId(),
      taskId,
      actor: 'circuit',
      type,
      payload,
      externalSessionId,
      createdAt: new Date().toISOString(),
    }),
  )
}

/** Persist permission/question cards so they survive page reload. */
export function persistHarnessActivity(taskId: string, activity: StreamActivityEvent): void {
  if (activity.type === 'permission_request') {
    const permissionId =
      typeof activity.metadata?.permissionId === 'string'
        ? activity.metadata.permissionId
        : activity.timestamp
    const sessionId =
      typeof activity.metadata?.sessionId === 'string' ? activity.metadata.sessionId : undefined

    insertHarnessEvent(
      taskId,
      'harness:permission_pending',
      {
        cardId: `permission-${permissionId}`,
        permissionId,
        sessionId,
        content: activity.content,
        timestamp: activity.timestamp,
      },
      sessionId,
    )
    return
  }

  if (activity.type === 'question_request') {
    const requestId =
      typeof activity.metadata?.requestId === 'string'
        ? activity.metadata.requestId
        : activity.timestamp
    const sessionId =
      typeof activity.metadata?.sessionId === 'string' ? activity.metadata.sessionId : undefined

    insertHarnessEvent(
      taskId,
      'harness:question_pending',
      {
        cardId: `question-${requestId}`,
        requestId,
        sessionId,
        content: activity.content,
        questions: activity.metadata?.questions,
        timestamp: activity.timestamp,
      },
      sessionId,
    )
  }
}

export function recordHarnessActionResolved(taskId: string, cardId: string): void {
  insertHarnessEvent(taskId, 'harness:action_resolved', { cardId })
}

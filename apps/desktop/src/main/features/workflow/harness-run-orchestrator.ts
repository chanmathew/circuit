import type { StreamActivityEvent } from '@circuit/protocol'

import { broadcastTaskStreamUpdate } from '../../ipc/task-stream-broadcast.js'
import { persistHarnessActivity } from './persist-harness-action.js'
import { registerSessionAbort, unregisterSessionAbort } from './phase-run-registry.js'

export function failureMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}

export interface HarnessActivityHandler {
  (event: {
    type: string
    timestamp: string
    content: string
    metadata?: Record<string, unknown>
  }): void
}

export function createHarnessActivityBroadcaster(
  taskId: string,
  workspacePath: string,
): (event: Parameters<HarnessActivityHandler>[0]) => void {
  return (event) => {
    const activity: StreamActivityEvent = {
      type: event.type as StreamActivityEvent['type'],
      timestamp: event.timestamp,
      content: event.content,
      metadata: event.metadata,
    }

    broadcastTaskStreamUpdate({ taskId, type: 'activity', activity })

    if (activity.type === 'permission_request' || activity.type === 'question_request') {
      persistHarnessActivity(taskId, activity)
    }

    const harnessSessionId =
      typeof event.metadata?.harnessSessionId === 'string'
        ? event.metadata.harnessSessionId
        : typeof event.metadata?.sessionId === 'string'
          ? event.metadata.sessionId
          : undefined

    if (harnessSessionId) {
      broadcastTaskStreamUpdate({
        taskId,
        type: 'harness_session_active',
        sessionId: harnessSessionId,
        workspacePath,
      })
    }
  }
}

export function createSessionStartedHandler(
  taskId: string,
  workspacePath: string,
): {
  onSessionStarted: (harnessSessionId: string, abortRun: () => void) => void
  getActiveSessionId: () => string | undefined
  cleanup: () => void
} {
  let activeHarnessSessionId: string | undefined

  return {
    onSessionStarted: (harnessSessionId, abortRun) => {
      activeHarnessSessionId = harnessSessionId
      registerSessionAbort(harnessSessionId, taskId, abortRun)
      broadcastTaskStreamUpdate({
        taskId,
        type: 'harness_session_active',
        sessionId: harnessSessionId,
        workspacePath,
      })
    },
    getActiveSessionId: () => activeHarnessSessionId,
    cleanup: () => {
      if (activeHarnessSessionId) {
        unregisterSessionAbort(activeHarnessSessionId)
        activeHarnessSessionId = undefined
      }
    },
  }
}

export function broadcastHarnessRunStarted(
  taskId: string,
  phaseName: string,
  phaseRunId: string,
): void {
  broadcastTaskStreamUpdate({
    taskId,
    type: 'phase_run_started',
    phaseName,
    phaseRunId,
  })
}

export function broadcastHarnessRunCompleted(
  taskId: string,
  phaseName: string,
  phaseRunId: string,
): void {
  broadcastTaskStreamUpdate({
    taskId,
    type: 'phase_run_completed',
    phaseName,
    phaseRunId,
  })
  broadcastTaskStreamUpdate({ taskId, type: 'harness_session_cleared' })
}

export function broadcastHarnessRunFailed(
  taskId: string,
  phaseName: string,
  phaseRunId: string,
  error: string,
): void {
  broadcastTaskStreamUpdate({
    taskId,
    type: 'phase_run_failed',
    phaseName,
    phaseRunId,
    error,
  })
  broadcastTaskStreamUpdate({ taskId, type: 'harness_session_cleared' })
}

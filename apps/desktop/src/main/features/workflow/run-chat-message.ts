import { getTaskById, insertPhaseRun, listPhaseRunsForTask, updateTask } from '@circuit/db'
import { createId, NotFoundError, ValidationError } from '@circuit/shared'

import { getDb } from '../../db.js'
import { broadcastTaskStreamUpdate } from '../../ipc/task-stream-broadcast.js'
import { getTaskDetail, type TaskDetail } from '../../services/tasks.js'
import { workflowAdapter } from './adapter.js'
import {
  broadcastHarnessRunCompleted,
  broadcastHarnessRunFailed,
  broadcastHarnessRunStarted,
  createHarnessActivityBroadcaster,
  createSessionStartedHandler,
  failureMessage,
} from './harness-run-orchestrator.js'
import { persistHarnessTurnActivities } from './persist-harness-activities.js'
import { isPhaseRunAborted } from './phase-run-errors.js'
import { acquirePhaseRunLock, releasePhaseRunLock } from './phase-run-lock.js'

const CHAT_PHASE = 'chat'

function getChatSessionId(taskId: string): string | undefined {
  const runs = listPhaseRunsForTask(getDb(), taskId)
    .filter((run) => run.phase === CHAT_PHASE && run.sessionId)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))

  return runs[0]?.sessionId ?? undefined
}

export async function runChatMessage(taskId: string, text: string): Promise<TaskDetail> {
  const trimmed = text.trim()
  if (!trimmed) {
    throw new ValidationError('Chat message cannot be empty')
  }

  if (!acquirePhaseRunLock(taskId)) {
    throw new ValidationError('A chat run is already in progress for this task')
  }

  try {
    await workflowAdapter.connect()

    const db = getDb()
    const task = getTaskById(db, taskId)
    if (!task) throw new NotFoundError('Task', taskId)

    if (!workflowAdapter.runChatTurn) {
      throw new ValidationError('Active adapter does not support chat')
    }

    const existingSessionId = getChatSessionId(taskId)
    const runId = createId()
    const startedAt = new Date().toISOString()
    const previousTaskStatus = task.status

    updateTask(db, taskId, { status: 'running', updatedAt: startedAt })

    broadcastHarnessRunStarted(taskId, CHAT_PHASE, runId)

    const sessionHandler = createSessionStartedHandler(taskId, task.workspacePath)
    const onActivity = createHarnessActivityBroadcaster(taskId, task.workspacePath)

    try {
      const result = await workflowAdapter.runChatTurn(
        {
          taskId,
          workspacePath: task.workspacePath,
          prompt: trimmed,
          sessionId: existingSessionId,
          onSessionStarted: sessionHandler.onSessionStarted,
        },
        onActivity,
      )

      insertPhaseRun(db, {
        id: runId,
        taskId,
        phase: CHAT_PHASE,
        agent: workflowAdapter.name,
        model: result.modelLabel ?? workflowAdapter.name,
        status: 'completed',
        inputPrompt: trimmed,
        transcript: result.transcript,
        filesRead: JSON.stringify([]),
        filesChanged: JSON.stringify([]),
        commandsRun: JSON.stringify([]),
        sessionId: result.sessionId,
        contextPackHash: null,
        startedAt,
        completedAt: new Date().toISOString(),
      })

      updateTask(db, taskId, {
        status: previousTaskStatus,
        updatedAt: new Date().toISOString(),
      })

      if (result.activities?.length) {
        persistHarnessTurnActivities(taskId, runId, result.activities)
      }

      broadcastHarnessRunCompleted(taskId, CHAT_PHASE, runId)

      return getTaskDetail(taskId)
    } catch (error) {
      const failedAt = new Date().toISOString()
      const aborted = isPhaseRunAborted(error)

      updateTask(db, taskId, { status: previousTaskStatus, updatedAt: failedAt })

      if (aborted) {
        broadcastTaskStreamUpdate({ taskId, type: 'harness_session_cleared' })
        return getTaskDetail(taskId)
      }

      const message = failureMessage(error)

      insertPhaseRun(db, {
        id: runId,
        taskId,
        phase: CHAT_PHASE,
        agent: workflowAdapter.name,
        model: workflowAdapter.name,
        status: 'failed',
        inputPrompt: trimmed,
        transcript: message,
        filesRead: JSON.stringify([]),
        filesChanged: JSON.stringify([]),
        commandsRun: JSON.stringify([]),
        sessionId: sessionHandler.getActiveSessionId() ?? existingSessionId ?? null,
        contextPackHash: null,
        startedAt,
        completedAt: failedAt,
      })

      broadcastHarnessRunFailed(taskId, CHAT_PHASE, runId, message)

      throw error
    } finally {
      sessionHandler.cleanup()
    }
  } finally {
    releasePhaseRunLock(taskId)
  }
}

import { writeFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'

import {
  getArtifactByTaskAndPhase,
  getPhaseByTaskAndName,
  getTaskById,
  getTicketArtifactForTask,
  insertPhaseRun,
  listArtifactsForTask,
  updateArtifact,
  updatePhase,
  updateTask,
} from '@circuit/db'
import { createId, NotFoundError, ValidationError } from '@circuit/shared'
import type { PhaseStatus } from '@circuit/workflow'
import {
  buildContextPack,
  buildPhasePrompt,
  serializeContextPackForPrompt,
} from '@circuit/workflow/context-pack'

import { getDb } from '../../db.js'
import { getTaskDetail, type TaskDetail } from '../../services/tasks.js'
import { RUNNABLE_PHASE_STATUSES, workflowAdapter } from './adapter.js'
import {
  broadcastHarnessRunCompleted,
  broadcastHarnessRunFailed,
  broadcastHarnessRunStarted,
  createHarnessActivityBroadcaster,
  createSessionStartedHandler,
  failureMessage,
} from './harness-run-orchestrator.js'
import { isPhaseRunAborted } from './phase-run-errors.js'
import { acquirePhaseRunLock, releasePhaseRunLock } from './phase-run-lock.js'

export async function runPhase(taskId: string, phaseName?: string): Promise<TaskDetail> {
  if (!acquirePhaseRunLock(taskId)) {
    throw new ValidationError('A phase run is already in progress for this task')
  }

  try {
    await workflowAdapter.connect()

    const db = getDb()
    const task = getTaskById(db, taskId)
    if (!task) throw new NotFoundError('Task', taskId)

    const targetName = phaseName ?? task.currentPhase
    const phase = getPhaseByTaskAndName(db, taskId, targetName)
    if (!phase) throw new NotFoundError('Phase', targetName)

    if (!RUNNABLE_PHASE_STATUSES.has(phase.status as PhaseStatus)) {
      throw new ValidationError(`Phase "${targetName}" is not runnable (status: ${phase.status})`)
    }

    const artifact = getArtifactByTaskAndPhase(db, taskId, targetName)
    if (!artifact) throw new NotFoundError('Artifact', targetName)

    const ticket = getTicketArtifactForTask(db, taskId)
    const approvedArtifacts = listArtifactsForTask(db, taskId).filter(
      (item) => item.status === 'approved' && item.phase !== targetName,
    )

    const contextPack = buildContextPack({
      ticketPath: ticket?.path ?? '.Circuit/tasks/ticket/00-ticket.md',
      ticketContent: ticket?.content ?? '',
      approvedArtifacts: approvedArtifacts.map((item) => ({
        phase: item.phase,
        path: item.path,
        title: item.title,
        content: item.content,
      })),
    })

    const contextSection = serializeContextPackForPrompt(contextPack)
    const inputPrompt = buildPhasePrompt(targetName, contextSection)
    const sessionId = workflowAdapter.capabilities.ownsSessionId ? '' : randomUUID()

    const now = new Date().toISOString()
    const runId = createId()
    const startedAt = now
    const previousPhaseStatus = phase.status as PhaseStatus
    const previousTaskStatus = task.status

    updatePhase(db, phase.id, { status: 'running' })
    updateTask(db, taskId, { status: 'running', currentPhase: targetName, updatedAt: now })

    broadcastHarnessRunStarted(taskId, targetName, runId)

    const sessionHandler = createSessionStartedHandler(taskId, task.workspacePath)
    const onActivity = createHarnessActivityBroadcaster(taskId, task.workspacePath)

    try {
      const result = await workflowAdapter.runPhase(
        {
          taskId,
          phase: targetName,
          prompt: inputPrompt,
          workspacePath: task.workspacePath,
          readOnly: targetName !== 'implement',
          sessionId,
          contextPack: {
            hash: contextPack.hash,
            files: contextPack.files,
          },
          onSessionStarted: sessionHandler.onSessionStarted,
        },
        onActivity,
      )

      const artifactContent = result.artifactContent ?? `# ${targetName}\n\n_Awaiting agent run._\n`

      writeFileSync(artifact.path, artifactContent, 'utf8')

      updateArtifact(db, artifact.id, {
        content: artifactContent,
        status: 'needs_review',
        updatedAt: new Date().toISOString(),
      })

      updatePhase(db, phase.id, { status: 'needs_review' })
      updateTask(db, taskId, {
        status: 'needs_review',
        currentPhase: targetName,
        updatedAt: new Date().toISOString(),
      })

      insertPhaseRun(db, {
        id: runId,
        taskId,
        phase: targetName,
        agent: workflowAdapter.name,
        model: result.modelLabel ?? workflowAdapter.name,
        status: 'completed',
        inputPrompt,
        transcript: result.transcript,
        filesRead: JSON.stringify(result.filesRead),
        filesChanged: JSON.stringify(result.filesChanged),
        commandsRun: JSON.stringify(result.commandsRun),
        sessionId: result.sessionId,
        contextPackHash: result.contextPackHash,
        startedAt,
        completedAt: new Date().toISOString(),
      })

      broadcastHarnessRunCompleted(taskId, targetName, runId)

      return getTaskDetail(taskId)
    } catch (error) {
      const failedAt = new Date().toISOString()
      const message = failureMessage(error)
      const aborted = isPhaseRunAborted(error)

      updatePhase(db, phase.id, { status: previousPhaseStatus })
      updateTask(db, taskId, { status: previousTaskStatus, updatedAt: failedAt })

      insertPhaseRun(db, {
        id: runId,
        taskId,
        phase: targetName,
        agent: workflowAdapter.name,
        model: workflowAdapter.name,
        status: 'failed',
        inputPrompt,
        transcript: message,
        filesRead: JSON.stringify([]),
        filesChanged: JSON.stringify([]),
        commandsRun: JSON.stringify([]),
        sessionId: sessionHandler.getActiveSessionId() ?? (sessionId || null),
        contextPackHash: contextPack.hash,
        startedAt,
        completedAt: failedAt,
      })

      broadcastHarnessRunFailed(taskId, targetName, runId, message)

      if (aborted) {
        return getTaskDetail(taskId)
      }

      throw error
    } finally {
      sessionHandler.cleanup()
    }
  } finally {
    releasePhaseRunLock(taskId)
  }
}

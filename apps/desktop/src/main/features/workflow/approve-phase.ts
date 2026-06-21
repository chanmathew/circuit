import {
  getActiveWorkflowRunForTask,
  getArtifactByTaskAndPhase,
  getPhaseByTaskAndName,
  insertWorkflowEvent,
  listPhasesForWorkflowRun,
  updateArtifact,
  updatePhase,
  updateTask,
  updateWorkflowRun,
} from '@circuit/db'
import { createId, NotFoundError, ValidationError } from '@circuit/shared'
import { canTransition, type PhaseStatus } from '@circuit/workflow'

import { getDb } from '../../db.js'
import { toWorkflowEventRow } from '../../services/feed-workflow-events.js'
import { syncTaskWorkflowStatusFromRuns } from '../../services/sync-task-workflow-status.js'
import { getTaskDetail, type TaskDetail } from '../../services/tasks.js'
import { assertCanApprove } from './approve-guard.js'
import { schedulePhaseRun } from './background-phase-runner.js'
import { generateCompletionSummary } from './generate-completion-summary.js'

export async function approvePhase(taskId: string, phaseName: string): Promise<TaskDetail> {
  assertCanApprove(taskId, phaseName)

  const db = getDb()
  const activeRun = getActiveWorkflowRunForTask(db, taskId)
  if (!activeRun) {
    throw new ValidationError('No active workflow to approve phases on')
  }

  const phase = getPhaseByTaskAndName(db, taskId, phaseName, activeRun.id)
  if (!phase) throw new NotFoundError('Phase', phaseName)

  const nextStatus = canTransition(phase.status as PhaseStatus, 'approve')
  if (nextStatus !== 'approved') {
    throw new ValidationError(`Cannot approve phase "${phaseName}" from status ${phase.status}`)
  }

  const artifact = getArtifactByTaskAndPhase(db, taskId, phaseName, activeRun.id)
  if (artifact) {
    updateArtifact(db, artifact.id, {
      status: 'approved',
      updatedAt: new Date().toISOString(),
    })
  }

  updatePhase(db, phase.id, { status: 'approved' })

  const phases = listPhasesForWorkflowRun(db, activeRun.id)
  const currentIndex = phases.findIndex((p) => p.name === phaseName)
  const nextPhase = phases[currentIndex + 1]

  if (nextPhase && nextPhase.status === 'locked') {
    updatePhase(db, nextPhase.id, { status: 'ready' })
  }

  const isFinalPhase = !nextPhase
  const now = new Date().toISOString()

  updateTask(db, taskId, {
    currentPhase: nextPhase?.name ?? phaseName,
    updatedAt: now,
    ...(isFinalPhase ? { status: 'completed' as const } : { status: 'running' as const }),
  })

  updateWorkflowRun(db, activeRun.id, {
    currentPhaseId: nextPhase?.id ?? phase.id,
    updatedAt: now,
    ...(isFinalPhase ? { status: 'completed', completedAt: now } : {}),
  })

  if (isFinalPhase) {
    syncTaskWorkflowStatusFromRuns(taskId, now)

    const summaryArtifactId = generateCompletionSummary(taskId, activeRun.id)

    insertWorkflowEvent(
      db,
      toWorkflowEventRow({
        id: createId(),
        taskId,
        workflowRunId: activeRun.id,
        actor: 'user',
        type: 'workflow:completed',
        summary: 'Workflow completed',
        payload: {
          finalPhase: phaseName,
          workflowRunId: activeRun.id,
          completionSummaryArtifactId: summaryArtifactId,
        },
        createdAt: now,
      }),
    )
  }

  if (nextPhase) {
    schedulePhaseRun(taskId, nextPhase.name)
  }

  return getTaskDetail(taskId)
}

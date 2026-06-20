import {
  getArtifactByTaskAndPhase,
  getPhaseByTaskAndName,
  listPhasesForTask,
  updateArtifact,
  updatePhase,
  updateTask,
} from '@circuit/db'
import { NotFoundError, ValidationError } from '@circuit/shared'
import { BALANCED_AUTO_RUN_AFTER_APPROVE, canTransition, type PhaseStatus } from '@circuit/workflow'

import { getDb } from '../../db.js'
import { getTaskDetail, type TaskDetail } from '../../services/tasks.js'
import { assertCanApprove } from './approve-guard.js'
import { runPhase } from './run-phase.js'

export async function approvePhase(taskId: string, phaseName: string): Promise<TaskDetail> {
  assertCanApprove(taskId, phaseName)

  const db = getDb()
  const phase = getPhaseByTaskAndName(db, taskId, phaseName)
  if (!phase) throw new NotFoundError('Phase', phaseName)

  const nextStatus = canTransition(phase.status as PhaseStatus, 'approve')
  if (nextStatus !== 'approved') {
    throw new ValidationError(`Cannot approve phase "${phaseName}" from status ${phase.status}`)
  }

  const artifact = getArtifactByTaskAndPhase(db, taskId, phaseName)
  if (artifact) {
    updateArtifact(db, artifact.id, {
      status: 'approved',
      updatedAt: new Date().toISOString(),
    })
  }

  updatePhase(db, phase.id, { status: 'approved' })

  const phases = listPhasesForTask(db, taskId)
  const currentIndex = phases.findIndex((p) => p.name === phaseName)
  const nextPhase = phases[currentIndex + 1]

  if (nextPhase && nextPhase.status === 'locked') {
    updatePhase(db, nextPhase.id, { status: 'ready' })
  }

  updateTask(db, taskId, {
    status: 'running',
    currentPhase: nextPhase?.name ?? phaseName,
    updatedAt: new Date().toISOString(),
  })

  const autoRunNext = BALANCED_AUTO_RUN_AFTER_APPROVE[phaseName]
  if (autoRunNext) {
    return runPhase(taskId, autoRunNext)
  }

  return getTaskDetail(taskId)
}

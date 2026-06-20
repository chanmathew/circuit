import { writeFileSync } from 'node:fs'

import {
  getArtifactByTaskAndPhase,
  getPhaseByTaskAndName,
  updateArtifact,
  updatePhase,
  updateTask,
} from '@circuit/db'
import { NotFoundError, ValidationError } from '@circuit/shared'

import { getDb } from '../../db.js'
import { getTaskDetail, type TaskDetail } from '../../services/tasks.js'

export function requestPhaseRevision(
  taskId: string,
  phaseName: string,
  note: string,
): TaskDetail {
  const db = getDb()
  const phase = getPhaseByTaskAndName(db, taskId, phaseName)
  if (!phase) throw new NotFoundError('Phase', phaseName)

  if (phase.status !== 'needs_review') {
    throw new ValidationError(
      `Cannot request revision on phase "${phaseName}" (status: ${phase.status})`,
    )
  }

  updatePhase(db, phase.id, { status: 'needs_revision' })

  const artifact = getArtifactByTaskAndPhase(db, taskId, phaseName)
  if (artifact) {
    const suffix = `\n\n---\n\n**Revision requested:** ${note.trim()}\n`
    const content = artifact.content.includes('**Revision requested:**')
      ? artifact.content
      : `${artifact.content}${suffix}`
    writeFileSync(artifact.path, content, 'utf8')
    updateArtifact(db, artifact.id, {
      content,
      status: 'draft',
      updatedAt: new Date().toISOString(),
    })
  }

  updateTask(db, taskId, {
    status: 'needs_revision',
    updatedAt: new Date().toISOString(),
  })

  return getTaskDetail(taskId)
}

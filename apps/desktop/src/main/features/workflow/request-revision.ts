import { writeFileSync } from 'node:fs'

import {
  getArtifactByTaskAndPhase,
  getPhaseByTaskAndName,
  insertWorkflowEvent,
  updateArtifact,
  updatePhase,
  updateTask,
} from '@circuit/db'
import type { WorkflowRevisionRequestedPayload } from '@circuit/protocol'
import { createId, NotFoundError, ValidationError } from '@circuit/shared'

import { getDb } from '../../db.js'
import { toWorkflowEventRow } from '../../services/feed-workflow-events.js'
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

  const trimmedNote = note.trim()
  if (!trimmedNote) {
    throw new ValidationError('Revision note is required')
  }

  updatePhase(db, phase.id, { status: 'needs_revision' })

  const artifact = getArtifactByTaskAndPhase(db, taskId, phaseName)
  if (artifact) {
    const suffix = `\n\n---\n\n**Revision requested:** ${trimmedNote}\n`
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

  const payload: WorkflowRevisionRequestedPayload = {
    phase: phaseName,
    note: trimmedNote,
    source: 'action_bar',
  }

  insertWorkflowEvent(
    db,
    toWorkflowEventRow({
      id: createId(),
      taskId,
      actor: 'user',
      type: 'workflow:revision_requested',
      summary: `Revision on ${phaseName}`,
      payload,
      createdAt: new Date().toISOString(),
    }),
  )

  return getTaskDetail(taskId)
}

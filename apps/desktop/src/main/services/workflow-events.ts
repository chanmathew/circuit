import { writeFileSync } from 'node:fs'

import {
  getArtifactByTaskAndPhase,
  getPhaseByTaskAndName,
  getTaskById,
  insertWorkflowEvent,
  listPhasesForTask,
  updateArtifact,
  updatePhase,
  updateTask,
} from '@circuit/db'
import type {
  WorkflowRevisionAppliedPayload,
  WorkflowSteeringPayload,
} from '@circuit/protocol'
import { createId, NotFoundError, ValidationError } from '@circuit/shared'
import {
  applyPhaseRevision,
  inferRevisionFromSteering,
  type PhaseStatus,
  type WorkflowType,
} from '@circuit/workflow'

import { getDb } from '../db.js'
import { toWorkflowEventRow } from './feed-workflow-events.js'
import { getTaskDetail, type TaskDetail } from './tasks.js'

function insertEvent(
  taskId: string,
  type: string,
  payload: unknown,
  actor: 'user' | 'circuit' = 'circuit',
  summary?: string,
): void {
  const db = getDb()
  insertWorkflowEvent(
    db,
    toWorkflowEventRow({
      id: createId(),
      taskId,
      actor,
      type,
      summary,
      payload,
      createdAt: new Date().toISOString(),
    }),
  )
}

export function recordSteering(taskId: string, text: string): TaskDetail {
  const trimmed = text.trim()
  if (!trimmed) {
    throw new ValidationError('Steering message cannot be empty')
  }

  const db = getDb()
  const task = getTaskById(db, taskId)
  if (!task) {
    throw new NotFoundError('Task', taskId)
  }

  const phases = listPhasesForTask(db, taskId)
  const createdAt = new Date().toISOString()

  const inference = inferRevisionFromSteering({
    text: trimmed,
    workflowType: task.workflowType as WorkflowType,
    phases: phases.map((phase) => ({
      name: phase.name,
      status: phase.status as PhaseStatus,
    })),
  })

  const steeringPayload: WorkflowSteeringPayload = {
    rawText: trimmed,
    interpretedAs: inference ? 'material_design_change' : undefined,
    affectedPhases: inference ? [inference.affectedPhase, ...inference.stalePhases] : undefined,
  }

  insertWorkflowEvent(
    db,
    toWorkflowEventRow({
      id: createId(),
      taskId,
      actor: 'user',
      type: 'workflow:steering_received',
      summary: trimmed,
      payload: steeringPayload,
      createdAt,
    }),
  )

  if (inference) {
    insertWorkflowEvent(
      db,
      toWorkflowEventRow({
        id: createId(),
        taskId,
        actor: 'circuit',
        type: 'workflow:revision_inference',
        summary: inference.message,
        payload: inference,
        createdAt: new Date().toISOString(),
      }),
    )
  }

  return getTaskDetail(taskId)
}

export interface ApplySteeringRevisionInput {
  affectedPhase: string
  optionId: string
  stalePhases: string[]
  steeringText?: string
}

export function applySteeringRevision(
  taskId: string,
  input: ApplySteeringRevisionInput,
): TaskDetail {
  const db = getDb()
  const task = getTaskById(db, taskId)
  if (!task) throw new NotFoundError('Task', taskId)

  if (input.optionId === 'cancel') {
    return getTaskDetail(taskId)
  }

  const phase = getPhaseByTaskAndName(db, taskId, input.affectedPhase)
  if (!phase) throw new NotFoundError('Phase', input.affectedPhase)

  const note =
    input.steeringText?.trim() ||
    `Steering revision (${input.optionId}) on ${input.affectedPhase}.`

  if (input.optionId === 'note') {
    const artifact = getArtifactByTaskAndPhase(db, taskId, input.affectedPhase)
    if (artifact) {
      const suffix = `\n\n---\n\n**Steering note:** ${note}\n`
      const content = artifact.content.includes('**Steering note:**')
        ? artifact.content
        : `${artifact.content}${suffix}`
      writeFileSync(artifact.path, content, 'utf8')
      updateArtifact(db, artifact.id, {
        content,
        updatedAt: new Date().toISOString(),
      })
    }

    insertEvent(taskId, 'workflow:revision_applied', {
      affectedPhase: input.affectedPhase,
      optionId: 'note',
      stalePhases: [],
      steeringText: input.steeringText,
    } satisfies WorkflowRevisionAppliedPayload)

    return getTaskDetail(taskId)
  }

  if (input.optionId !== 'revise') {
    throw new ValidationError(`Unknown steering option: ${input.optionId}`)
  }

  const phases = listPhasesForTask(db, taskId)
  const workflowPhases = phases.map((row) => ({
    id: row.id,
    taskId: row.taskId,
    name: row.name,
    status: row.status as PhaseStatus,
    order: row.order,
    currentArtifactId: row.currentArtifactId,
    dependsOnArtifactIds: JSON.parse(row.dependsOnArtifactIds) as string[],
    staleReason: row.staleReason,
  }))

  const updated = applyPhaseRevision(
    workflowPhases,
    task.workflowType as WorkflowType,
    input.affectedPhase,
    'material',
    note,
  )

  for (const next of updated) {
    updatePhase(db, next.id, {
      status: next.status,
      staleReason: next.staleReason,
    })
  }

  const artifact = getArtifactByTaskAndPhase(db, taskId, input.affectedPhase)
  if (artifact) {
    const suffix = `\n\n---\n\n**Revision requested:** ${note}\n`
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
    currentPhase: input.affectedPhase,
    updatedAt: new Date().toISOString(),
  })

  insertEvent(
    taskId,
    'workflow:revision_applied',
    {
      affectedPhase: input.affectedPhase,
      optionId: 'revise',
      stalePhases: input.stalePhases,
      steeringText: input.steeringText,
    } satisfies WorkflowRevisionAppliedPayload,
    'user',
    `Revised ${input.affectedPhase}`,
  )

  return getTaskDetail(taskId)
}

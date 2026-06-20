import { writeFileSync } from 'node:fs'

import { MockAgentAdapter } from '@circuit/agent-adapters'
import {
  getArtifactByTaskAndPhase,
  getPhaseByTaskAndName,
  getTaskById,
  insertPhaseRun,
  listPhasesForTask,
  updateArtifact,
  updatePhase,
  updateTask,
} from '@circuit/db'
import { createId, NotFoundError, ValidationError } from '@circuit/shared'
import {
  BALANCED_AUTO_RUN_AFTER_APPROVE,
  canTransition,
  getWorkflowDefinition,
  type PhaseStatus,
  type WorkflowType,
} from '@circuit/workflow'

import { getDb } from '../db.js'
import { getTaskDetail, type TaskDetail } from './tasks.js'

const adapter = new MockAgentAdapter()
const RUNNABLE_STATUSES = new Set<PhaseStatus>(['ready', 'needs_revision'])

export async function runPhase(taskId: string, phaseName?: string): Promise<TaskDetail> {
  await adapter.connect()

  const db = getDb()
  const task = getTaskById(db, taskId)
  if (!task) throw new NotFoundError('Task', taskId)

  const targetName = phaseName ?? task.currentPhase
  const phase = getPhaseByTaskAndName(db, taskId, targetName)
  if (!phase) throw new NotFoundError('Phase', targetName)

  if (!RUNNABLE_STATUSES.has(phase.status as PhaseStatus)) {
    throw new ValidationError(`Phase "${targetName}" is not runnable (status: ${phase.status})`)
  }

  const artifact = getArtifactByTaskAndPhase(db, taskId, targetName)
  if (!artifact) throw new NotFoundError('Artifact', targetName)

  const now = new Date().toISOString()
  updatePhase(db, phase.id, { status: 'running' })
  updateTask(db, taskId, { status: 'running', currentPhase: targetName, updatedAt: now })

  const runId = createId()
  const startedAt = now

  const result = await adapter.runPhase(
    {
      taskId,
      phase: targetName,
      prompt: `Run ${targetName} phase`,
      workspacePath: task.workspacePath,
      readOnly: targetName !== 'implement',
    },
    () => {
      // Activity events are persisted via transcript + feed rebuild for MVP.
    },
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
    agent: adapter.name,
    model: 'mock',
    status: 'completed',
    inputPrompt: `Run ${targetName} phase`,
    transcript: result.transcript,
    filesRead: JSON.stringify(result.filesRead),
    filesChanged: JSON.stringify(result.filesChanged),
    commandsRun: JSON.stringify(result.commandsRun),
    startedAt,
    completedAt: new Date().toISOString(),
  })

  return getTaskDetail(taskId)
}

export async function approvePhase(taskId: string, phaseName: string): Promise<TaskDetail> {
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

export function requestPhaseRevision(taskId: string, phaseName: string, note: string): TaskDetail {
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

export async function autoRunOnTaskCreate(taskId: string): Promise<TaskDetail | undefined> {
  const db = getDb()
  const task = getTaskById(db, taskId)
  if (!task) return undefined

  const workflow = getWorkflowDefinition(task.workflowType as WorkflowType)
  if (!workflow || workflow.type !== 'structured_change') return undefined

  const questions = getPhaseByTaskAndName(db, taskId, 'questions')
  if (!questions || questions.status !== 'ready') return undefined

  return runPhase(taskId, 'questions')
}

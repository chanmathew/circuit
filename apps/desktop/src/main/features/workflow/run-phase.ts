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

export async function runPhase(taskId: string, phaseName?: string): Promise<TaskDetail> {
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
  const sessionId = randomUUID()

  const now = new Date().toISOString()
  updatePhase(db, phase.id, { status: 'running' })
  updateTask(db, taskId, { status: 'running', currentPhase: targetName, updatedAt: now })

  const runId = createId()
  const startedAt = now

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
    agent: workflowAdapter.name,
    model: 'mock',
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

  return getTaskDetail(taskId)
}

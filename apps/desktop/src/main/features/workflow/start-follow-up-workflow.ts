import { mkdirSync, writeFileSync } from 'node:fs'

import {
  getActiveWorkflowRunForTask,
  getRepoById,
  getTaskById,
  insertArtifact,
  insertWorkflowEvent,
  insertWorkflowRun,
  listArtifactsForWorkflowRun,
  listPhaseRunsForTask,
  listWorkflowRunsForTask,
  updateTask,
} from '@circuit/db'
import {
  artifactPath,
  createId,
  generateTitle,
  NotFoundError,
  renderTicketMarkdown,
  taskDir,
  ValidationError,
} from '@circuit/shared'
import {
  autoSelectWorkflow,
  getWorkflowDefinition,
  type WorkflowType,
  type WorkspaceStrategy,
} from '@circuit/workflow'

import { getDb } from '../../db.js'
import { toWorkflowEventRow } from '../../services/feed-workflow-events.js'
import { syncTaskWorkflowStatusFromRuns } from '../../services/sync-task-workflow-status.js'
import { getTaskDetail, type TaskDetail } from '../../services/tasks.js'
import { COMPLETION_PHASE } from './generate-completion-summary.js'
import { synthesizeTaskBrief } from './synthesize-task-brief.js'
import type { EnableWorkflowInput } from './start-workflow.js'

const CHAT_PHASE = 'chat'

function latestTerminalRun(taskId: string) {
  return listWorkflowRunsForTask(getDb(), taskId).find(
    (run) => run.status === 'completed' || run.status === 'cancelled',
  )
}

function latestChatSessionId(taskId: string): string | undefined {
  const runs = listPhaseRunsForTask(getDb(), taskId)
    .filter((run) => (run.phase === CHAT_PHASE || run.phase === 'pause_chat') && run.sessionId)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  return runs[0]?.sessionId ?? undefined
}

function buildFollowUpDescription(taskId: string, taskDescription: string): string {
  const priorRun = latestTerminalRun(taskId)
  const brief = synthesizeTaskBrief(taskId, taskDescription)

  if (!priorRun) return brief

  const db = getDb()
  const artifacts = listArtifactsForWorkflowRun(db, priorRun.id)
  const summary = artifacts.find((artifact) => artifact.phase === COMPLETION_PHASE)

  const sections = ['# Follow-up workflow', '', brief]
  if (summary?.content.trim()) {
    sections.push('', '## Prior completion summary', '', summary.content.trim())
  } else {
    sections.push(
      '',
      `_Prior workflow "${priorRun.title}" (${priorRun.status}). Start fresh phases for this follow-up._`,
    )
  }

  return sections.join('\n')
}

/** Start a new workflow run after a terminal run — does not mutate prior run rows. */
export async function startFollowUpWorkflow(
  taskId: string,
  input: Partial<EnableWorkflowInput> = {},
): Promise<TaskDetail> {
  const db = getDb()
  const task = getTaskById(db, taskId)
  if (!task) throw new NotFoundError('Task', taskId)

  if (getActiveWorkflowRunForTask(db, taskId)) {
    throw new ValidationError('An active workflow already exists on this task')
  }

  const priorRun = latestTerminalRun(taskId)
  if (!priorRun) {
    throw new ValidationError('No prior workflow to follow up from — use Enable workflow instead')
  }

  const repo = getRepoById(db, task.repoId)
  if (!repo) throw new NotFoundError('Repo', task.repoId)

  const description = (input.description ?? buildFollowUpDescription(taskId, task.description)).trim()
  if (!description) {
    throw new ValidationError('Follow-up description cannot be empty')
  }

  const selection = input.workflowType
    ? {
        workflowType: input.workflowType,
        workspaceStrategy:
          input.workspaceStrategy ?? autoSelectWorkflow(description).workspaceStrategy,
      }
    : autoSelectWorkflow(description)

  const workflow = getWorkflowDefinition(selection.workflowType as WorkflowType)
  if (!workflow) {
    throw new ValidationError(`Unsupported workflow type: ${selection.workflowType}`)
  }

  const title = generateTitle(description)
  const now = new Date().toISOString()
  const firstPhase = input.startPhase ?? workflow.phases[0] ?? 'questions'
  const runId = createId()

  insertWorkflowRun(db, {
    id: runId,
    taskId,
    status: 'active',
    workflowType: selection.workflowType as WorkflowType,
    title,
    startedAt: now,
    completedAt: null,
    cancelledAt: null,
    currentPhaseId: null,
    createdAt: now,
    updatedAt: now,
  })

  const ticketPath = artifactPath(repo.path, task.slug, '00-ticket.md')
  const ticketContent = renderTicketMarkdown({
    title,
    description,
    workflowLabel: workflow.label,
    branchName: task.branchName,
    createdAt: now,
  })

  mkdirSync(taskDir(repo.path, task.slug), { recursive: true })
  writeFileSync(ticketPath, ticketContent, 'utf8')

  insertArtifact(db, {
    id: createId(),
    taskId,
    workflowRunId: runId,
    phase: 'ticket',
    path: ticketPath,
    title: '00-ticket.md',
    content: ticketContent,
    version: 1,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  })

  updateTask(db, taskId, {
    title,
    description,
    workflowType: selection.workflowType as WorkflowType,
    currentPhase: firstPhase,
    interactionMode: 'chat',
    pausedAt: null,
    updatedAt: now,
  })

  syncTaskWorkflowStatusFromRuns(taskId, now)

  const sourceSessionId = input.sourceSessionId ?? latestChatSessionId(taskId)
  if (sourceSessionId) {
    insertWorkflowEvent(
      db,
      toWorkflowEventRow({
        id: createId(),
        taskId,
        workflowRunId: runId,
        actor: 'circuit',
        type: 'workflow:chat_source_linked',
        summary: 'Prior chat session linked for follow-up',
        payload: { sourceSessionId, priorRunId: priorRun.id },
        externalSessionId: sourceSessionId,
        createdAt: now,
      }),
    )
  }

  insertWorkflowEvent(
    db,
    toWorkflowEventRow({
      id: createId(),
      taskId,
      workflowRunId: runId,
      actor: 'user',
      type: 'workflow:follow_up_started',
      summary: 'Follow-up workflow started',
      payload: {
        priorRunId: priorRun.id,
        newRunId: runId,
        workflowType: selection.workflowType,
      },
      createdAt: now,
    }),
  )

  return getTaskDetail(taskId)
}

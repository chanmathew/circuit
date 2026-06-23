import { mkdirSync, writeFileSync } from 'node:fs'

import {
  getActiveWorkflowRunForTask,
  getRepoById,
  getTaskById,
  getTicketArtifactForRun,
  insertArtifact,
  insertWorkflowEvent,
  insertWorkflowRun,
  listPhaseRunsForTask,
  listPhasesForWorkflowRun,
  updateArtifact,
  updatePhase,
  updateTask,
  updateWorkflowRun,
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
  resolveWorkflowSelectionFromTask,
  type TaskMode,
  type WorkflowType,
  type WorkspaceStrategy,
} from '@circuit/workflow'

import { getDb } from '../../db.js'
import { toWorkflowEventRow } from '../../services/feed-workflow-events.js'
import { syncTaskWorkflowStatusFromRuns } from '../../services/sync-task-workflow-status.js'
import { ensureWorkflowState, getTaskDetail, type TaskDetail } from '../../services/tasks.js'
import { isWorkflowActive } from '../../../shared/workflow-status.js'
import { isPhaseRunLocked, waitForPhaseRunLockRelease } from './phase-run-lock.js'
import { signalTaskAbort } from './phase-run-registry.js'
import { schedulePhaseRun } from './background-phase-runner.js'
import { requireOpenCodeAdapter } from './require-opencode-adapter.js'

const CHAT_PHASE = 'chat'

export interface EnableWorkflowInput {
  description: string
  workflowType?: WorkflowType
  workspaceStrategy?: WorkspaceStrategy
  sourceSessionId?: string
  startPhase?: string
  /** When true, also run the first phase after enable (legacy; default false). */
  autoRunFirstPhase?: boolean
}

function latestChatSessionId(taskId: string): string | undefined {
  const runs = listPhaseRunsForTask(getDb(), taskId)
    .filter((run) => (run.phase === CHAT_PHASE || run.phase === 'pause_chat') && run.sessionId)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  return runs[0]?.sessionId ?? undefined
}

/** Best-effort abort of an in-flight harness run before workflow enable/cancel. */
async function abortActiveHarnessRun(taskId: string): Promise<void> {
  if (!isPhaseRunLocked(taskId)) return

  const sessionIds = new Set(signalTaskAbort(taskId))
  const persistedSessionId = latestChatSessionId(taskId)
  if (persistedSessionId) {
    sessionIds.add(persistedSessionId)
  }

  const task = getTaskById(getDb(), taskId)
  if (!task || sessionIds.size === 0) return

  try {
    const adapter = requireOpenCodeAdapter()
    await Promise.all(
      [...sessionIds].map((sessionId) =>
        adapter.abortSession({ sessionId, workspacePath: task.workspacePath }),
      ),
    )
  } catch {
    // Abort is best-effort — workflow action proceeds regardless.
  }
}

function resolveWorkspaceStrategy(
  current: string,
  selected: WorkspaceStrategy,
): WorkspaceStrategy {
  if (current === 'direct' || current === 'current') {
    return selected
  }
  return current as WorkspaceStrategy
}

function assertCanEnableWorkflow(taskId: string, task: { workflowStatus: string }): void {
  const db = getDb()
  const activeRun = getActiveWorkflowRunForTask(db, taskId)
  if (activeRun) {
    throw new ValidationError('An active workflow already exists on this task')
  }

  if (isWorkflowActive(task.workflowStatus)) {
    throw new ValidationError('Workflow is already active on this task')
  }
}

/** Attach workflow: ticket + template metadata only — no phase artifacts until startPhase. */
export function bootstrapWorkflowTicket(
  taskId: string,
  input: EnableWorkflowInput,
): { workflowRunId: string } {
  const db = getDb()
  const task = getTaskById(db, taskId)
  if (!task) throw new NotFoundError('Task', taskId)

  const repo = getRepoById(db, task.repoId)
  if (!repo) throw new NotFoundError('Repo', task.repoId)

  const description = input.description.trim()
  if (!description) {
    throw new ValidationError('Workflow description cannot be empty')
  }

  const selection = input.workflowType
    ? {
        workflowType: input.workflowType,
        workspaceStrategy:
          input.workspaceStrategy ?? autoSelectWorkflow(description).workspaceStrategy,
        confidence: 1,
        reason: 'Explicit workflow type',
      }
    : resolveWorkflowSelectionFromTask({
        taskMode: (task.taskMode ?? 'auto') as TaskMode,
        description,
        workspaceStrategy: input.workspaceStrategy,
      })

  const workflow = getWorkflowDefinition(selection.workflowType)
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
    workflowType: selection.workflowType,
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
    createdAt: task.createdAt,
  })

  mkdirSync(taskDir(repo.path, task.slug), { recursive: true })
  writeFileSync(ticketPath, ticketContent, 'utf8')

  const sourceSessionId = input.sourceSessionId ?? latestChatSessionId(taskId)

  updateTask(db, taskId, {
    title,
    description,
    workflowType: selection.workflowType,
    currentPhase: firstPhase,
    interactionMode: 'chat',
    pausedAt: null,
    workspaceStrategy: resolveWorkspaceStrategy(task.workspaceStrategy, selection.workspaceStrategy),
    updatedAt: now,
  })

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

  syncTaskWorkflowStatusFromRuns(taskId, now)

  if (sourceSessionId) {
    insertWorkflowEvent(
      db,
      toWorkflowEventRow({
        id: createId(),
        taskId,
        workflowRunId: runId,
        actor: 'circuit',
        type: 'workflow:chat_source_linked',
        summary: 'Prior chat session linked for audit',
        payload: { sourceSessionId },
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
      type: 'workflow:enabled',
      summary: 'Workflow attached',
      payload: {
        workflowType: selection.workflowType,
        startPhase: firstPhase,
        workflowRunId: runId,
      },
      createdAt: now,
    }),
  )

  return { workflowRunId: runId }
}

/** Enable structured workflow on a task — ticket only; phases start via startPhase. */
export async function enableWorkflow(
  taskId: string,
  input: EnableWorkflowInput,
): Promise<TaskDetail> {
  if (isPhaseRunLocked(taskId)) {
    await abortActiveHarnessRun(taskId)
    const released = await waitForPhaseRunLockRelease(taskId)
    if (!released) {
      throw new ValidationError(
        'A harness run is in progress. Stop it before enabling a workflow.',
      )
    }
  }

  const db = getDb()
  const task = getTaskById(db, taskId)
  if (!task) throw new NotFoundError('Task', taskId)

  assertCanEnableWorkflow(taskId, task)

  bootstrapWorkflowTicket(taskId, input)

  if (input.autoRunFirstPhase) {
    const updated = getTaskById(db, taskId)!
    return startPhase(taskId, input.startPhase ?? updated.currentPhase)
  }

  return getTaskDetail(taskId)
}

/** Create phases/artifacts if needed and run the given phase harness. */
export function startPhase(taskId: string, phaseName?: string): TaskDetail {
  const db = getDb()
  const task = getTaskById(db, taskId)
  if (!task) throw new NotFoundError('Task', taskId)

  const activeRun = getActiveWorkflowRunForTask(db, taskId)
  if (!activeRun) {
    throw new ValidationError('Enable a workflow before starting a phase')
  }

  const now = new Date().toISOString()
  ensureWorkflowState(taskId, now)
  schedulePhaseRun(taskId, phaseName ?? task.currentPhase)
  return getTaskDetail(taskId)
}

/** Cancel attached workflow — chat continues; artifacts kept on disk. */
export async function cancelWorkflow(taskId: string): Promise<TaskDetail> {
  const db = getDb()
  const task = getTaskById(db, taskId)
  if (!task) throw new NotFoundError('Task', taskId)

  const activeRun = getActiveWorkflowRunForTask(db, taskId)
  if (!activeRun) {
    throw new ValidationError('No active workflow to cancel')
  }

  if (isPhaseRunLocked(taskId)) {
    await abortActiveHarnessRun(taskId)
    const released = await waitForPhaseRunLockRelease(taskId)
    if (!released) {
      throw new ValidationError(
        'A harness run is in progress. Stop it before cancelling the workflow.',
      )
    }
  }

  const now = new Date().toISOString()

  const phases = listPhasesForWorkflowRun(db, activeRun.id)
  for (const phase of phases) {
    if (phase.status === 'running') {
      updatePhase(db, phase.id, { status: 'failed' })
    }
  }

  updateWorkflowRun(db, activeRun.id, {
    status: 'cancelled',
    cancelledAt: now,
    updatedAt: now,
  })

  updateTask(db, taskId, {
    interactionMode: 'chat',
    pausedAt: null,
    updatedAt: now,
  })

  syncTaskWorkflowStatusFromRuns(taskId, now)

  insertWorkflowEvent(
    db,
    toWorkflowEventRow({
      id: createId(),
      taskId,
      workflowRunId: activeRun.id,
      actor: 'user',
      type: 'workflow:cancelled',
      summary: 'Workflow cancelled',
      payload: { phase: task.currentPhase, workflowRunId: activeRun.id },
      createdAt: now,
    }),
  )

  return getTaskDetail(taskId)
}

export function getActiveRunTicket(taskId: string): string | undefined {
  const db = getDb()
  const activeRun = getActiveWorkflowRunForTask(db, taskId)
  if (!activeRun) return undefined
  return getTicketArtifactForRun(db, activeRun.id)?.content
}

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'

import {
  getActiveWorkflowRunForTask,
  getArtifactById,
  getRepoById,
  getTaskById,
  getTicketArtifactForRun,
  getWorkflowRunById,
  insertArtifact,
  insertPhases,
  insertTask,
  listArtifactsForTask,
  listArtifactsForWorkflowRun,
  listDecisionResolutionsForTask,
  listPhaseRunsForTask,
  listPhasesForWorkflowRun,
  listSlugsForRepo,
  listWorkflowEventsForTask,
  listWorkflowRunsForTask,
  listTasks,
  updatePhaseArtifactId,
  updateWorkflowRun,
  type ArtifactRow,
  type DecisionResolutionRow,
  type PhaseRow,
  type TaskRow,
  type WorkflowRunRow,
} from '@circuit/db'
import type { CircuitEvent, DecisionRequiredPayload } from '@circuit/protocol'
import {
  artifactPath,
  createId,
  ensureUniqueSlug,
  generateBranchName,
  NotFoundError,
  taskDir,
} from '@circuit/shared'
import {
  buildInitialPhases,
  emptyArtifactMarkdown,
  getPhaseLabel,
  getWorkflowDefinition,
  getWorkflowPhaseArtifacts,
  type WorkflowType,
} from '@circuit/workflow'

import { getDb } from '../db.js'
import { buildFeedEvents } from './feed-events.js'
import { decisionResolvedEvents, requiredDecisionsForPhaseFromRuns } from './feed-decisions.js'
import { workflowEventsToFeedEvents } from './feed-workflow-events.js'
import { COMPLETION_PHASE } from '../features/workflow/generate-completion-summary.js'
import type { WorkflowRunDto } from '../../shared/workflow-run.js'

export function taskNeedsIntake(task: { status: string; description: string }): boolean {
  return task.status === 'draft' && task.description.trim() === DRAFT_TASK_PLACEHOLDER
}

function taskUsesStructuredWorkflow(task: { workflowType: string }): boolean {
  return getWorkflowDefinition(task.workflowType as WorkflowType) !== undefined
}

/** Placeholder description for composer-first draft tasks. */
export const DRAFT_TASK_PLACEHOLDER = 'New task'

export interface TaskSummary extends TaskRow {
  repoName: string
}

export interface TaskDetail extends TaskRow {
  repoName: string
  repoPath: string
  ticketContent: string
  phases: PhaseRow[]
  artifacts: ArtifactRow[]
  feedEvents: CircuitEvent[]
  decisionResolutions: DecisionResolutionRow[]
  /** Latest phase-run decisions per phase — matches server approve gate. */
  requiredDecisionsByPhase: Record<string, DecisionRequiredPayload[]>
  needsIntake: boolean
  activeWorkflowRun?: WorkflowRunDto
  pastWorkflowRuns: WorkflowRunDto[]
}

export interface WorkflowRunDetail {
  run: WorkflowRunDto
  phases: PhaseRow[]
  artifacts: ArtifactRow[]
}

function toWorkflowRunDto(
  run: WorkflowRunRow,
  artifacts: ArtifactRow[],
): WorkflowRunDto {
  const summary = artifacts.find(
    (artifact) => artifact.workflowRunId === run.id && artifact.phase === COMPLETION_PHASE,
  )
  return {
    id: run.id,
    taskId: run.taskId,
    status: run.status as WorkflowRunDto['status'],
    workflowType: run.workflowType,
    title: run.title,
    startedAt: run.startedAt,
    completedAt: run.completedAt ?? undefined,
    cancelledAt: run.cancelledAt ?? undefined,
    currentPhaseId: run.currentPhaseId ?? undefined,
    completionSummaryArtifactId: summary?.id,
  }
}

/** Composer-first draft — task shell only; workflow enabled from the panel. */
export function createDraftTask(repoId: string): TaskDetail {
  const db = getDb()
  const repo = getRepoById(db, repoId)
  if (!repo) {
    throw new NotFoundError('Repo', repoId)
  }

  const now = new Date().toISOString()
  const taskId = createId()
  const slug = ensureUniqueSlug('new-task', listSlugsForRepo(db, repo.id))
  const branchName = generateBranchName(slug)

  insertTask(db, {
    id: taskId,
    repoId: repo.id,
    title: 'New task',
    slug,
    description: DRAFT_TASK_PLACEHOLDER,
    workflowType: 'freeform',
    status: 'draft',
    currentPhase: 'chat',
    branchName,
    workspacePath: repo.path,
    workspaceStrategy: 'direct',
    interactionMode: 'chat',
    workflowStatus: 'not_started',
    pausedAt: null,
    createdAt: now,
    updatedAt: now,
  })

  return getTaskDetail(taskId)
}

/** Idempotent: create phases and phase artifacts when missing for the active workflow run. */
export function ensureWorkflowState(taskId: string, now = new Date().toISOString()): void {
  const db = getDb()
  const task = getTaskById(db, taskId)
  if (!task) return

  const activeRun = getActiveWorkflowRunForTask(db, taskId)
  if (!activeRun) return

  const repo = getRepoById(db, task.repoId)
  if (!repo) return

  const workflowType = activeRun.workflowType as WorkflowType
  const existingPhases = listPhasesForWorkflowRun(db, activeRun.id)

  if (existingPhases.length === 0) {
    insertInitialPhases(db, taskId, activeRun.id, workflowType)
  }

  backfillPhaseArtifacts(db, {
    taskId,
    workflowRunId: activeRun.id,
    repoPath: repo.path,
    slug: task.slug,
    workflowType,
    now,
  })
}

function insertInitialPhases(
  db: ReturnType<typeof getDb>,
  taskId: string,
  workflowRunId: string,
  workflowType: WorkflowType,
): void {
  const initialPhases = buildInitialPhases(workflowType)
  if (initialPhases.length === 0) return

  const rows = initialPhases.map((phase) => ({
    id: createId(),
    taskId,
    workflowRunId,
    name: phase.name,
    status: phase.status,
    order: phase.order,
    currentArtifactId: null,
    dependsOnArtifactIds: '[]',
    staleReason: null,
  }))

  insertPhases(db, rows)

  const firstPhase = rows[0]
  if (firstPhase) {
    updateWorkflowRun(db, workflowRunId, { currentPhaseId: firstPhase.id })
  }
}

function backfillPhaseArtifacts(
  db: ReturnType<typeof getDb>,
  input: {
    taskId: string
    workflowRunId: string
    repoPath: string
    slug: string
    workflowType: WorkflowType
    now: string
  },
): void {
  const phases = listPhasesForWorkflowRun(db, input.workflowRunId)
  const phaseByName = new Map(phases.map((phase) => [phase.name, phase]))
  const artifacts = listArtifactsForWorkflowRun(db, input.workflowRunId)
  const artifactByPhase = new Map(artifacts.map((artifact) => [artifact.phase, artifact]))

  mkdirSync(taskDir(input.repoPath, input.slug), { recursive: true })

  for (const { phase, filename } of getWorkflowPhaseArtifacts(input.workflowType)) {
    const filePath = artifactPath(input.repoPath, input.slug, filename)
    const label = getPhaseLabel(phase)
    const placeholder = emptyArtifactMarkdown(label)

    let content = placeholder
    if (existsSync(filePath)) {
      content = readFileSync(filePath, 'utf8')
    } else {
      writeFileSync(filePath, placeholder, 'utf8')
    }

    let artifact = artifactByPhase.get(phase)
    if (!artifact) {
      artifact = insertArtifact(db, {
        id: createId(),
        taskId: input.taskId,
        workflowRunId: input.workflowRunId,
        phase,
        path: filePath,
        title: filename,
        content,
        version: 1,
        status: 'draft',
        createdAt: input.now,
        updatedAt: input.now,
      })
      artifactByPhase.set(phase, artifact)
    }

    const phaseRow = phaseByName.get(phase)
    if (phaseRow && !phaseRow.currentArtifactId) {
      updatePhaseArtifactId(db, phaseRow.id, artifact.id)
    }
  }
}

export function getWorkflowRunDetail(taskId: string, runId: string): WorkflowRunDetail {
  const db = getDb()
  const run = getWorkflowRunById(db, runId)
  if (!run || run.taskId !== taskId) {
    throw new NotFoundError('WorkflowRun', runId)
  }

  const artifacts = listArtifactsForWorkflowRun(db, runId)
  return {
    run: toWorkflowRunDto(run, artifacts),
    phases: listPhasesForWorkflowRun(db, runId),
    artifacts,
  }
}

export function listAllTasks(repoId?: string): TaskSummary[] {
  const db = getDb()

  return listTasks(db, repoId).map((task) => {
    const repo = getRepoById(db, task.repoId)
    return toTaskSummary(task, repo?.name ?? 'Unknown repo')
  })
}

function loadTaskDetail(taskId: string): TaskDetail | undefined {
  const db = getDb()
  const task = getTaskById(db, taskId)
  if (!task) return undefined

  const allRuns = listWorkflowRunsForTask(db, task.id)
  const activeRunRow = getActiveWorkflowRunForTask(db, task.id)
  const pastRunRows = allRuns.filter((run) => run.id !== activeRunRow?.id)

  const allArtifacts = listArtifactsForTask(db, task.id)
  const activeWorkflowRun = activeRunRow
    ? toWorkflowRunDto(activeRunRow, allArtifacts)
    : undefined
  const pastWorkflowRuns = pastRunRows.map((run) => toWorkflowRunDto(run, allArtifacts))

  const repo = getRepoById(db, task.repoId)
  const ticket = activeRunRow
    ? getTicketArtifactForRun(db, activeRunRow.id)
    : undefined
  const phases = activeRunRow
    ? listPhasesForWorkflowRun(db, activeRunRow.id)
    : []
  const artifacts = activeRunRow
    ? listArtifactsForWorkflowRun(db, activeRunRow.id)
    : []
  const phaseRuns = listPhaseRunsForTask(db, task.id)
  const decisionResolutionRows = listDecisionResolutionsForTask(db, task.id).filter((row) =>
    activeRunRow ? row.workflowRunId === activeRunRow.id : !row.workflowRunId,
  )
  const workflowEventRows = listWorkflowEventsForTask(db, task.id)
  const feedEvents = [
    ...buildFeedEvents(
      task.id,
      phaseRuns.map((run) => ({
        id: run.id,
        phase: run.phase,
        transcript: run.transcript,
        startedAt: run.startedAt,
        completedAt: run.completedAt,
      })),
    ),
    ...workflowEventsToFeedEvents(task.id, workflowEventRows),
    ...decisionResolvedEvents(
      task.id,
      decisionResolutionRows.map((row) => ({
        decisionId: row.decisionId,
        optionId: row.optionId,
        resolvedAt: row.resolvedAt,
      })),
    ),
  ].sort((a, b) => a.timestamp.localeCompare(b.timestamp))

  const runScopedPhaseRuns = activeRunRow
    ? phaseRuns.filter((run) => run.workflowRunId === activeRunRow.id || run.phase === 'chat')
    : phaseRuns.filter((run) => run.phase === 'chat')

  const requiredDecisionsByPhase: Record<string, DecisionRequiredPayload[]> = {}
  for (const phase of phases) {
    requiredDecisionsByPhase[phase.name] = requiredDecisionsForPhaseFromRuns(
      task.id,
      phase.name,
      runScopedPhaseRuns,
    )
  }

  return toTaskDetail(
    task,
    repo?.name ?? 'Unknown repo',
    repo?.path ?? '',
    ticket?.content ?? '',
    phases,
    artifacts,
    feedEvents,
    decisionResolutionRows,
    requiredDecisionsByPhase,
    activeWorkflowRun,
    pastWorkflowRuns,
  )
}

function toTaskSummary(task: TaskRow, repoName: string): TaskSummary {
  return { ...task, repoName }
}

function toTaskDetail(
  task: TaskRow,
  repoName: string,
  repoPath: string,
  ticketContent: string,
  phases: PhaseRow[],
  artifacts: ArtifactRow[],
  feedEvents: CircuitEvent[],
  decisionResolutions: DecisionResolutionRow[],
  requiredDecisionsByPhase: Record<string, DecisionRequiredPayload[]>,
  activeWorkflowRun: WorkflowRunDto | undefined,
  pastWorkflowRuns: WorkflowRunDto[],
): TaskDetail {
  return {
    ...task,
    repoName,
    repoPath,
    ticketContent,
    phases,
    artifacts,
    feedEvents,
    decisionResolutions,
    requiredDecisionsByPhase,
    needsIntake: taskNeedsIntake(task),
    activeWorkflowRun,
    pastWorkflowRuns,
  }
}

export function getTaskDetail(taskId: string): TaskDetail {
  const detail = loadTaskDetail(taskId)
  if (!detail) {
    throw new NotFoundError('Task', taskId)
  }
  return detail
}

export function getArtifactDetail(artifactId: string): ArtifactRow {
  const artifact = getArtifactById(getDb(), artifactId)
  if (!artifact) {
    throw new NotFoundError('Artifact', artifactId)
  }
  return artifact
}

export function getTicketArtifact(taskId: string): ArtifactRow | undefined {
  const db = getDb()
  const activeRun = getActiveWorkflowRunForTask(db, taskId)
  if (activeRun) {
    return getTicketArtifactForRun(db, activeRun.id)
  }
  return undefined
}

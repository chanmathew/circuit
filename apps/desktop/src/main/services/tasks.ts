import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'

import {
  getRepoById,
  getTaskById,
  getTicketArtifactForTask,
  insertArtifact,
  insertPhases,
  insertTask,
  listArtifactsForTask,
  listDecisionResolutionsForTask,
  listPhaseRunsForTask,
  listPhasesForTask,
  listSlugsForRepo,
  listWorkflowEventsForTask,
  listTasks,
  updatePhaseArtifactId,
  type ArtifactRow,
  type DecisionResolutionRow,
  type PhaseRow,
  type TaskRow,
} from '@circuit/db'
import type { CircuitEvent, DecisionRequiredPayload } from '@circuit/protocol'
import {
  artifactPath,
  createId,
  ensureUniqueSlug,
  generateBranchName,
  generateTitle,
  NotFoundError,
  renderTicketMarkdown,
  slugify,
  taskDir,
  ValidationError,
} from '@circuit/shared'
import {
  autoSelectWorkflow,
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

export function taskNeedsIntake(task: { status: string; description: string }): boolean {
  return task.status === 'draft' && task.description.trim() === DRAFT_TASK_PLACEHOLDER
}

function taskUsesStructuredWorkflow(task: { workflowType: string }): boolean {
  return getWorkflowDefinition(task.workflowType as WorkflowType) !== undefined
}

export interface CreateTaskInput {
  repoId: string
  description: string
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
}

export function createTask(input: CreateTaskInput): TaskDetail {
  const description = input.description.trim()
  if (!description) {
    throw new ValidationError('Task description is required')
  }

  const db = getDb()
  const repo = getRepoById(db, input.repoId)
  if (!repo) {
    throw new NotFoundError('Repo', input.repoId)
  }

  const selection = autoSelectWorkflow(description)
  const workflow = getWorkflowDefinition(selection.workflowType)
  const workflowLabel = workflow?.label ?? selection.workflowType

  const title = generateTitle(description)
  const baseSlug = slugify(title) || 'task'
  const slug = ensureUniqueSlug(baseSlug, listSlugsForRepo(db, repo.id))
  const branchName = generateBranchName(slug)
  const now = new Date().toISOString()
  const taskId = createId()

  const workspacePath = repo.path
  const ticketPath = artifactPath(repo.path, slug, '00-ticket.md')
  const ticketContent = renderTicketMarkdown({
    title,
    description,
    workflowLabel,
    branchName,
    createdAt: now,
  })

  mkdirSync(taskDir(repo.path, slug), { recursive: true })
  writeFileSync(ticketPath, ticketContent, 'utf8')

  insertTask(db, {
    id: taskId,
    repoId: repo.id,
    title,
    slug,
    description,
    workflowType: selection.workflowType,
    status: 'draft',
    currentPhase: workflow?.phases[0] ?? 'questions',
    branchName,
    workspacePath,
    workspaceStrategy: selection.workspaceStrategy,
    createdAt: now,
    updatedAt: now,
  })

  insertArtifact(db, {
    id: createId(),
    taskId,
    phase: 'ticket',
    path: ticketPath,
    title: '00-ticket.md',
    content: ticketContent,
    version: 1,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  })

  ensureWorkflowState(taskId, now)

  return getTaskDetail(taskId)
}

/** Composer-first draft — task shell only; phases and artifacts created at plan intake. */
export function createDraftTask(
  repoId: string,
  composerMode: 'chat' | 'plan' = 'chat',
): TaskDetail {
  const db = getDb()
  const repo = getRepoById(db, repoId)
  if (!repo) {
    throw new NotFoundError('Repo', repoId)
  }

  const isPlan = composerMode === 'plan'
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
    workflowType: isPlan ? 'structured_change' : 'freeform',
    status: 'draft',
    currentPhase: isPlan ? 'intake' : 'chat',
    branchName,
    workspacePath: repo.path,
    workspaceStrategy: 'direct',
    createdAt: now,
    updatedAt: now,
  })

  return getTaskDetail(taskId)
}

/** Idempotent: create phases and phase artifacts when missing (backfills Milestone 1 tasks). */
export function ensureWorkflowState(taskId: string, now = new Date().toISOString()): void {
  const db = getDb()
  const task = getTaskById(db, taskId)
  if (!task) return

  const repo = getRepoById(db, task.repoId)
  if (!repo) return

  const workflowType = task.workflowType as WorkflowType
  const existingPhases = listPhasesForTask(db, taskId)

  if (existingPhases.length === 0) {
    insertInitialPhases(db, taskId, workflowType)
  }

  backfillPhaseArtifacts(db, {
    taskId,
    repoPath: repo.path,
    slug: task.slug,
    workflowType,
    now,
  })
}

function insertInitialPhases(
  db: ReturnType<typeof getDb>,
  taskId: string,
  workflowType: WorkflowType,
): void {
  const initialPhases = buildInitialPhases(workflowType)
  if (initialPhases.length === 0) return

  insertPhases(
    db,
    initialPhases.map((phase) => ({
      id: createId(),
      taskId,
      name: phase.name,
      status: phase.status,
      order: phase.order,
      currentArtifactId: null,
      dependsOnArtifactIds: '[]',
      staleReason: null,
    })),
  )
}

function backfillPhaseArtifacts(
  db: ReturnType<typeof getDb>,
  input: {
    taskId: string
    repoPath: string
    slug: string
    workflowType: WorkflowType
    now: string
  },
): void {
  const phases = listPhasesForTask(db, input.taskId)
  const phaseByName = new Map(phases.map((phase) => [phase.name, phase]))
  const artifacts = listArtifactsForTask(db, input.taskId)
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

  if (!taskNeedsIntake(task) && taskUsesStructuredWorkflow(task)) {
    ensureWorkflowState(taskId)
  }

  const repo = getRepoById(db, task.repoId)
  const ticket = getTicketArtifactForTask(db, task.id)
  const phases = listPhasesForTask(db, task.id)
  const artifacts = listArtifactsForTask(db, task.id)
  const phaseRuns = listPhaseRunsForTask(db, task.id)
  const decisionResolutionRows = listDecisionResolutionsForTask(db, task.id)
  const workflowEventRows = listWorkflowEventsForTask(db, task.id)
  const feedEvents = [
    ...buildFeedEvents(
      task.id,
      phaseRuns.map((run) => ({
        id: run.id,
        phase: run.phase,
        transcript: run.transcript,
        startedAt: run.startedAt,
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

  const requiredDecisionsByPhase: Record<string, DecisionRequiredPayload[]> = {}
  for (const phase of phases) {
    requiredDecisionsByPhase[phase.name] = requiredDecisionsForPhaseFromRuns(
      task.id,
      phase.name,
      phaseRuns,
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
  }
}

export function getTaskDetail(taskId: string): TaskDetail {
  const detail = loadTaskDetail(taskId)
  if (!detail) {
    throw new NotFoundError('Task', taskId)
  }
  return detail
}

export function getTicketArtifact(taskId: string): ArtifactRow | undefined {
  return getTicketArtifactForTask(getDb(), taskId)
}

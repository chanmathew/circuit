import { mkdirSync, writeFileSync } from 'node:fs'

import {
  getRepoById,
  getTaskById,
  getTicketArtifactForTask,
  insertArtifact,
  insertTask,
  listSlugsForRepo,
  listTasks,
  type ArtifactRow,
  type TaskRow,
} from '@circuit/db'
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
import { autoSelectWorkflow, getWorkflowDefinition } from '@circuit/workflow'

import { getDb } from '../db.js'

export interface CreateTaskInput {
  repoId: string
  description: string
}

export interface TaskDetail extends TaskRow {
  repoName: string
  repoPath: string
  ticketContent: string
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

  const task = insertTask(db, {
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

  return toTaskDetail(task, repo.name, repo.path, ticketContent)
}

export function listAllTasks(repoId?: string): TaskDetail[] {
  const db = getDb()

  return listTasks(db, repoId).map((task) => {
    const repo = getRepoById(db, task.repoId)
    const ticket = getTicketArtifactForTask(db, task.id)
    return toTaskDetail(task, repo?.name ?? 'Unknown repo', repo?.path ?? '', ticket?.content ?? '')
  })
}

function toTaskDetail(
  task: TaskRow,
  repoName: string,
  repoPath: string,
  ticketContent: string,
): TaskDetail {
  return {
    ...task,
    repoName,
    repoPath,
    ticketContent,
  }
}

export function getTaskDetail(taskId: string): TaskDetail {
  const db = getDb()
  const task = getTaskById(db, taskId)
  if (!task) {
    throw new NotFoundError('Task', taskId)
  }

  const repo = getRepoById(db, task.repoId)
  const ticket = getTicketArtifactForTask(db, task.id)

  return toTaskDetail(task, repo?.name ?? 'Unknown repo', repo?.path ?? '', ticket?.content ?? '')
}

export function getTicketArtifact(taskId: string): ArtifactRow | undefined {
  return getTicketArtifactForTask(getDb(), taskId)
}

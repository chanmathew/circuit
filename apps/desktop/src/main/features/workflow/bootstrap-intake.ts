import { existsSync, mkdirSync, writeFileSync } from 'node:fs'

import { getTaskById, getTicketArtifactForTask, insertArtifact, updateTask } from '@circuit/db'
import { artifactPath, createId, generateTitle, NotFoundError, renderTicketMarkdown, taskDir } from '@circuit/shared'
import { autoSelectWorkflow, getWorkflowDefinition } from '@circuit/workflow'

import { getDb } from '../../db.js'
import { ensureWorkflowState, type TaskDetail } from '../../services/tasks.js'
import { getRepoById } from '@circuit/db'

/** Create ticket file, ticket artifact, phases, and phase artifacts after intake text. */
export function bootstrapTaskFromIntake(taskId: string, description: string): void {
  const db = getDb()
  const task = getTaskById(db, taskId)
  if (!task) throw new NotFoundError('Task', taskId)

  const repo = getRepoById(db, task.repoId)
  if (!repo) throw new NotFoundError('Repo', task.repoId)

  const selection = autoSelectWorkflow(description)
  const workflow = getWorkflowDefinition(selection.workflowType)
  const title = generateTitle(description)
  const now = new Date().toISOString()

  const ticketPath = artifactPath(repo.path, task.slug, '00-ticket.md')
  const ticketContent = renderTicketMarkdown({
    title,
    description,
    workflowLabel: workflow?.label ?? selection.workflowType,
    branchName: task.branchName,
    createdAt: task.createdAt,
  })

  mkdirSync(taskDir(repo.path, task.slug), { recursive: true })
  if (!existsSync(ticketPath)) {
    writeFileSync(ticketPath, ticketContent, 'utf8')
  }

  updateTask(db, taskId, {
    title,
    description,
    workflowType: selection.workflowType,
    currentPhase: workflow?.phases[0] ?? 'questions',
    updatedAt: now,
  })

  if (!getTicketArtifactForTask(db, taskId)) {
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
  }

  ensureWorkflowState(taskId, now)
}

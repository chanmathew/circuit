import { mkdirSync, writeFileSync } from 'node:fs'

import {
  getRepoById,
  getTaskById,
  getWorkflowRunById,
  insertArtifact,
  listArtifactsForWorkflowRun,
  listDecisionResolutionsForTask,
  listPhaseRunsForWorkflowRun,
  listPhasesForWorkflowRun,
} from '@circuit/db'
import { artifactPath, createId, taskDir } from '@circuit/shared'

import { getDb } from '../../db.js'

const COMPLETION_PHASE = 'completion_summary'
const COMPLETION_FILENAME = '08-completion-summary.md'

export function generateCompletionSummary(taskId: string, workflowRunId: string): string {
  const db = getDb()
  const task = getTaskById(db, taskId)
  if (!task) throw new Error(`Task not found: ${taskId}`)

  const run = getWorkflowRunById(db, workflowRunId)
  if (!run) throw new Error(`Workflow run not found: ${workflowRunId}`)

  const repo = getRepoById(db, task.repoId)
  if (!repo) throw new Error(`Repo not found: ${task.repoId}`)

  const phases = listPhasesForWorkflowRun(db, workflowRunId)
  const artifacts = listArtifactsForWorkflowRun(db, workflowRunId)
  const phaseRuns = listPhaseRunsForWorkflowRun(db, workflowRunId)
  const decisions = listDecisionResolutionsForTask(db, taskId).filter(
    (row) => row.workflowRunId === workflowRunId,
  )

  const approvedArtifacts = artifacts.filter(
    (artifact) => artifact.phase !== 'ticket' && artifact.status === 'approved',
  )

  const filesChanged = new Set<string>()
  for (const run of phaseRuns) {
    try {
      const changed = JSON.parse(run.filesChanged) as string[]
      for (const file of changed) filesChanged.add(file)
    } catch {
      // ignore malformed JSON
    }
  }

  const lines: string[] = [
    '# Completion summary',
    '',
    `**Workflow:** ${run.title}`,
    `**Type:** ${run.workflowType}`,
    `**Completed:** ${run.completedAt ?? new Date().toISOString()}`,
    '',
    '## What changed',
    '',
    task.description.trim() || '_No task description._',
    '',
    '## Phases completed',
    '',
  ]

  for (const phase of phases) {
    if (phase.status === 'approved' || phase.status === 'skipped') {
      lines.push(`- **${phase.name}** (${phase.status})`)
    }
  }

  if (approvedArtifacts.length > 0) {
    lines.push('', '## Key artifacts', '')
    for (const artifact of approvedArtifacts) {
      lines.push(`- \`${artifact.title}\` (${artifact.phase})`)
    }
  }

  if (filesChanged.size > 0) {
    lines.push('', '## Files touched', '')
    for (const file of [...filesChanged].sort()) {
      lines.push(`- \`${file}\``)
    }
  }

  if (decisions.length > 0) {
    lines.push('', '## Decisions taken', '')
    for (const decision of decisions) {
      lines.push(`- **${decision.phase}:** ${decision.optionLabel}`)
    }
  }

  lines.push(
    '',
    '## Suggested follow-ups',
    '',
    '- Review outputs and start a follow-up workflow if more work is needed.',
  )

  const content = lines.join('\n')
  const now = new Date().toISOString()
  const filePath = artifactPath(repo.path, task.slug, COMPLETION_FILENAME)

  mkdirSync(taskDir(repo.path, task.slug), { recursive: true })
  writeFileSync(filePath, content, 'utf8')

  const artifact = insertArtifact(db, {
    id: createId(),
    taskId,
    workflowRunId,
    phase: COMPLETION_PHASE,
    path: filePath,
    title: COMPLETION_FILENAME,
    content,
    version: 1,
    status: 'approved',
    createdAt: now,
    updatedAt: now,
  })

  return artifact.id
}

export { COMPLETION_PHASE, COMPLETION_FILENAME }

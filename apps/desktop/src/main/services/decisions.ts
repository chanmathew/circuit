import { createId, NotFoundError, ValidationError } from '@circuit/shared'
import {
  getDecisionResolution,
  listDecisionResolutionsForTask,
  upsertDecisionResolution,
} from '@circuit/db'

import { getDb } from '../db.js'
import { getTaskDetail, type TaskDetail } from './tasks.js'
import { requiredDecisionsForPhaseFromRuns } from './feed-decisions.js'
import { listPhaseRunsForTask } from '@circuit/db'

export function resolveDecision(
  taskId: string,
  phase: string,
  decisionId: string,
  optionId: string,
  optionLabel: string,
): TaskDetail {
  const db = getDb()
  const phaseRuns = listPhaseRunsForTask(db, taskId)
  const required = requiredDecisionsForPhaseFromRuns(taskId, phase, phaseRuns)
  const decision = required.find((item) => item.decisionId === decisionId)

  if (!decision) {
    throw new NotFoundError('Decision', decisionId)
  }

  const option = decision.options.find((item) => item.id === optionId)
  if (!option) {
    throw new ValidationError(`Unknown option "${optionId}" for decision "${decisionId}"`)
  }

  const now = new Date().toISOString()
  upsertDecisionResolution(db, {
    id: createId(),
    taskId,
    phase,
    decisionId,
    optionId,
    optionLabel: optionLabel || option.label,
    resolvedAt: now,
  })

  return getTaskDetail(taskId)
}

export function listTaskDecisionResolutions(taskId: string) {
  return listDecisionResolutionsForTask(getDb(), taskId)
}

export function isDecisionResolved(taskId: string, decisionId: string): boolean {
  return Boolean(getDecisionResolution(getDb(), taskId, decisionId))
}

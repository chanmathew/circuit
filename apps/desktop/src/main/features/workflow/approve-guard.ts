import {
  listDecisionResolutionsForPhase,
  listPhaseRunsForTask,
} from '@circuit/db'
import { ValidationError } from '@circuit/shared'
import { approveBlockedReason } from '@circuit/workflow'

import { getDb } from '../../db.js'
import { requiredDecisionsForPhaseFromRuns } from '../../services/feed-decisions.js'

export function assertCanApprove(taskId: string, phaseName: string): void {
  const db = getDb()
  const phaseRuns = listPhaseRunsForTask(db, taskId)
  const required = requiredDecisionsForPhaseFromRuns(taskId, phaseName, phaseRuns)
  const resolutions = listDecisionResolutionsForPhase(db, taskId, phaseName)
  const resolvedIds = new Set(resolutions.map((r) => r.decisionId))
  const reason = approveBlockedReason(required, resolvedIds)
  if (reason) {
    throw new ValidationError(reason)
  }
}

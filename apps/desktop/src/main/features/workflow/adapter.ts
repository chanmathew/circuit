import { MockAgentAdapter } from '@circuit/agent-adapters'
import type { PhaseStatus } from '@circuit/workflow'

export const workflowAdapter = new MockAgentAdapter()

export const RUNNABLE_PHASE_STATUSES = new Set<PhaseStatus>(['ready', 'needs_revision'])

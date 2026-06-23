import { MockAgentAdapter, OpenCodeAdapter, type AgentAdapter } from '@circuit/agent-adapters'
import type { PhaseStatus } from '@circuit/workflow'

import { loadLocalEnvFiles, describeAgentAdapterEnv } from '../../load-env.js'

export const RUNNABLE_PHASE_STATUSES = new Set<PhaseStatus>(['ready', 'needs_revision'])

loadLocalEnvFiles()

function createWorkflowAdapter(): AgentAdapter {
  const raw = process.env.CIRCUIT_AGENT_ADAPTER
  const kind = (raw ?? 'mock').toLowerCase()
  console.info(`[circuit] ${describeAgentAdapterEnv()} -> adapter "${kind}"`)

  switch (kind) {
    case 'opencode':
      return new OpenCodeAdapter()
    case 'codex':
      throw new Error('CIRCUIT_AGENT_ADAPTER=codex is not implemented yet. Use mock or opencode.')
    case 'mock':
      return new MockAgentAdapter()
    default:
      console.warn(`[circuit] Unknown CIRCUIT_AGENT_ADAPTER="${raw}", using mock`)
      return new MockAgentAdapter()
  }
}

export const workflowAdapter = createWorkflowAdapter()

export function getActiveAgentAdapterName(): string {
  return workflowAdapter.name
}

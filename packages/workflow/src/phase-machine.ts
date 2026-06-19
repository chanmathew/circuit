import type { Phase, PhaseStatus } from './types.js'

export interface PhaseTransition {
  from: PhaseStatus
  to: PhaseStatus
  event: string
}

export interface PhaseMachine {
  getPhases(taskId: string): Promise<Phase[]>
  transition(taskId: string, phaseName: string, event: string): Promise<Phase>
}

export const PHASE_TRANSITIONS: PhaseTransition[] = [
  { from: 'locked', to: 'ready', event: 'unlock' },
  { from: 'ready', to: 'running', event: 'start' },
  { from: 'running', to: 'needs_review', event: 'complete' },
  { from: 'running', to: 'failed', event: 'fail' },
  { from: 'needs_review', to: 'approved', event: 'approve' },
  { from: 'needs_review', to: 'needs_revision', event: 'revise' },
  { from: 'needs_revision', to: 'running', event: 'start' },
  { from: 'ready', to: 'skipped', event: 'skip' },
]

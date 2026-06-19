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
  // Revisit and revision (see brief: Iteration and Revisiting Phases)
  { from: 'approved', to: 'needs_revision', event: 'revisit' },
  { from: 'approved', to: 'running', event: 'revise_minor' },
  { from: 'approved', to: 'needs_revision', event: 'revise_material' },
  { from: 'approved', to: 'stale', event: 'invalidate' },
  { from: 'stale', to: 'ready', event: 'refresh' },
  { from: 'stale', to: 'running', event: 'regenerate' },
  { from: 'needs_revision', to: 'approved', event: 'approve_minor' },
]

export function canTransition(from: PhaseStatus, event: string): PhaseStatus | undefined {
  return PHASE_TRANSITIONS.find((t) => t.from === from && t.event === event)?.to
}

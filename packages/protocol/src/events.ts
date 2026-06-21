/** Canonical Circuit protocol event types for the structured activity feed. */
export type CircuitEventType =
  | 'task:created'
  | 'task:updated'
  | 'phase:started'
  | 'phase:completed'
  | 'phase:failed'
  | 'phase:revisited'
  | 'phase:stale'
  | 'artifact:written'
  | 'artifact:updated'
  | 'artifact:revised'
  | 'decision:required'
  | 'decision:resolved'
  | 'validation:passed'
  | 'validation:failed'
  | 'diff:ready'
  | 'blocker:raised'
  | 'blocker:resolved'
  | 'agent:activity'
  | 'workflow:steering_received'
  | 'workflow:revision_requested'
  | 'workflow:revision_inference'
  | 'workflow:revision_applied'
  | 'workflow:enabled'
  | 'workflow:completed'
  | 'workflow:cancelled'
  | 'workflow:discarded'
  | 'workflow:follow_up_started'
  | 'harness:permission_pending'
  | 'harness:question_pending'
  | 'harness:action_resolved'
  | 'harness:turn_activities'

export interface CircuitEvent<T = unknown> {
  id?: string
  type: CircuitEventType
  taskId: string
  phaseRunId?: string
  timestamp: string
  payload: T
}

export type CircuitEventHandler = (event: CircuitEvent) => void

/** UI card types derived from structured feed events. */
export type CircuitCardType =
  | 'artifact'
  | 'decision'
  | 'approval'
  | 'validation'
  | 'diff'
  | 'blocker'

export interface CircuitCard {
  id: string
  type: CircuitCardType
  eventId?: string
  timestamp: string
  title: string
  summary?: string
  payload: unknown
}

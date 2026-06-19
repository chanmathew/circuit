export type CircuitEventType =
  | 'task:created'
  | 'task:updated'
  | 'phase:started'
  | 'phase:completed'
  | 'phase:failed'
  | 'phase:revisited'
  | 'phase:stale'
  | 'artifact:updated'
  | 'artifact:revised'
  | 'agent:activity'

export interface CircuitEvent<T = unknown> {
  type: CircuitEventType
  taskId: string
  timestamp: string
  payload: T
}

export type CircuitEventHandler = (event: CircuitEvent) => void

export type CircuitEventType =
  | 'task:created'
  | 'task:updated'
  | 'phase:started'
  | 'phase:completed'
  | 'phase:failed'
  | 'artifact:updated'
  | 'agent:activity'

export interface CircuitEvent<T = unknown> {
  type: CircuitEventType
  taskId: string
  timestamp: string
  payload: T
}

export type CircuitEventHandler = (event: CircuitEvent) => void

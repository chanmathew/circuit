/** User steering captured as a Circuit workflow event — not raw chat storage. */
export interface WorkflowSteeringPayload {
  rawText: string
  summary?: string
  interpretedAs?: string
  affectedPhases?: string[]
}

/** Explicit revision request from the user or orchestrator. */
export interface WorkflowRevisionRequestedPayload {
  phase: string
  note: string
  source?: 'chat' | 'action_bar' | 'decision'
}

/** Outcome after user confirms a revision inference action card. */
export interface WorkflowRevisionAppliedPayload {
  affectedPhase: string
  optionId: string
  stalePhases: string[]
  steeringText?: string
}

export type WorkflowEventActor = 'user' | 'circuit' | 'adapter' | 'agent'

/** Emitted when a workflow is attached from the panel or stream suggestion. */
export interface WorkflowEnabledPayload {
  workflowType: string
  startPhase?: string
}

/** Phase lifecycle markers enriched for stream cards. */
export interface PhaseLifecyclePayload {
  phaseRunId: string
  phase: string
}

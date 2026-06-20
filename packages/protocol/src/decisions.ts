export interface DecisionOption {
  id: string
  label: string
  recommended?: boolean
}

/** Emitted when the workflow needs human input before continuing. */
export interface DecisionRequiredPayload {
  decisionId: string
  title: string
  description?: string
  options: DecisionOption[]
  phase?: string
  artifactId?: string
  allowCustomAnswer?: boolean
}

export interface DecisionResolvedPayload {
  decisionId: string
  selectedOptionId?: string
  customAnswer?: string
  /** Whether this resolution should trigger a material artifact revision. */
  revisionKind?: 'minor' | 'material' | 'note_only'
}

/** Prompt shown when chat steering implies upstream artifact changes. */
export interface RevisionInferencePayload {
  source: 'chat' | 'artifact_edit' | 'decision'
  affectedPhase: string
  message: string
  stalePhases: string[]
  options: DecisionOption[]
}

import type { DecisionRequiredPayload } from './decisions.js'

/** Fenced markdown/JSON block types agents emit in transcripts. */
export type CircuitBlockType =
  | 'circuit-decision'
  | 'circuit-artifact'
  | 'circuit-validation'
  | 'circuit-blocker'
  | 'circuit-diff'

export interface CircuitArtifactBlock {
  phase: string
  path: string
  title: string
  status?: 'draft' | 'needs_review'
}

export interface CircuitValidationBlock {
  command: string
  exitCode: number
  passed: boolean
  output?: string
}

export interface CircuitBlockerBlock {
  blockerId: string
  title: string
  description?: string
  phase?: string
  sliceId?: string
}

export interface CircuitDiffBlock {
  sliceId?: string
  paths: string[]
  summary?: string
}

export type CircuitBlockPayload =
  | DecisionRequiredPayload
  | CircuitArtifactBlock
  | CircuitValidationBlock
  | CircuitBlockerBlock
  | CircuitDiffBlock

export interface CircuitBlock<T extends CircuitBlockPayload = CircuitBlockPayload> {
  type: CircuitBlockType
  data: T
}

/** Maps block types to expected payload shapes. */
export interface CircuitBlockPayloadMap {
  'circuit-decision': DecisionRequiredPayload
  'circuit-artifact': CircuitArtifactBlock
  'circuit-validation': CircuitValidationBlock
  'circuit-blocker': CircuitBlockerBlock
  'circuit-diff': CircuitDiffBlock
}

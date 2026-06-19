export type PhaseUiMode =
  | 'document_only'
  | 'human_qa'
  | 'research_verify'
  | 'design_review'
  | 'structure_slices'
  | 'plan_slices'
  | 'review_checklist'
  | 'implement_diff'
  | 'none'

const PHASE_UI: Record<string, PhaseUiMode> = {
  ticket: 'document_only',
  questions: 'human_qa',
  research: 'research_verify',
  design: 'design_review',
  structure: 'structure_slices',
  plan: 'plan_slices',
  implement: 'implement_diff',
  review: 'review_checklist',
}

export function getPhaseUiMode(phase: string): PhaseUiMode {
  return PHASE_UI[phase] ?? 'none'
}

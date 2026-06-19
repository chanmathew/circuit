export const PROMPT_WORKFLOWS = ['structured-change', 'quick-fix', 'investigation'] as const

export type PromptWorkflow = (typeof PROMPT_WORKFLOWS)[number]

/** Root behavioral prompt prepended to every structured-change phase run. */
export const STRUCTURED_CHANGE_ROOT_PROMPT = 'structured-change/using-circuit.md'

/** Phase prompts for the Structured Change workflow. */
export const STRUCTURED_CHANGE_PHASE_PROMPTS = {
  questions: 'structured-change/01-questions.md',
  research: 'structured-change/02-research.md',
  design: 'structured-change/03-design.md',
  structure: 'structured-change/04-structure.md',
  plan: 'structured-change/05-plan.md',
  implement: 'structured-change/06-implement-slice.md',
  review: 'structured-change/07-review.md',
  replan: 'structured-change/08-replan.md',
} as const

export type StructuredChangePhase = keyof typeof STRUCTURED_CHANGE_PHASE_PROMPTS

/** Task artifacts produced by the Structured Change workflow. */
export const STRUCTURED_CHANGE_ARTIFACTS = {
  ticket: '00-ticket.md',
  questions: '01-questions.md',
  research: '02-research.md',
  design: '03-design.md',
  structure: '04-structure.md',
  plan: '05-plan.md',
  implementationLog: '06-implementation-log.md',
  review: '07-review.md',
} as const

export function getPromptPath(workflow: PromptWorkflow, filename: string): string {
  return `${workflow}/${filename}`
}

export function getStructuredChangePromptPath(phase: StructuredChangePhase): string {
  return STRUCTURED_CHANGE_PHASE_PROMPTS[phase]
}

export function getStructuredChangeArtifactPath(
  artifact: keyof typeof STRUCTURED_CHANGE_ARTIFACTS,
): string {
  return STRUCTURED_CHANGE_ARTIFACTS[artifact]
}

/** Phases that auto-run after the previous phase is approved (Balanced mode). */
export const BALANCED_AUTO_RUN_AFTER_APPROVE: Partial<Record<string, string>> = {
  questions: 'research',
  research: 'design',
}

/** First phase to auto-run when a structured task is created. */
export const AUTO_RUN_ON_TASK_CREATE = 'questions'

/** Phases that require explicit human approval before continuing. */
export const PAUSE_BEFORE_PHASES = new Set(['design', 'structure', 'plan', 'implement', 'review'])

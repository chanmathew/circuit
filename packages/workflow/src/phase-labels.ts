/** Human-readable labels for workflow phase names. */
const PHASE_LABELS: Record<string, string> = {
  ticket: 'Ticket',
  questions: 'Questions',
  research: 'Research',
  design: 'Design',
  structure: 'Structure',
  plan: 'Plan',
  parallelize: 'Parallelize',
  implement: 'Implement',
  integrate: 'Integrate',
  review: 'Review',
  replan: 'Replan',
  hypotheses: 'Hypotheses',
  reproduce: 'Reproduce',
  fix_plan: 'Fix Plan',
}

export function getPhaseLabel(phaseName: string): string {
  return PHASE_LABELS[phaseName] ?? phaseName
}

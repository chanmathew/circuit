import type { WorkflowType } from './types.js'

export interface WorkflowPhaseArtifact {
  phase: string
  filename: string
}

/** Serial MVP artifact layout. Parallelize/integrate artifacts arrive in Milestone 9–10. */
const STRUCTURED_CHANGE: WorkflowPhaseArtifact[] = [
  { phase: 'questions', filename: '01-questions.md' },
  { phase: 'research', filename: '02-research.md' },
  { phase: 'design', filename: '03-design.md' },
  { phase: 'structure', filename: '04-structure.md' },
  { phase: 'plan', filename: '05-plan.md' },
  { phase: 'implement', filename: '06-implementation-log.md' },
  { phase: 'review', filename: '07-review.md' },
]

const QUICK_FIX: WorkflowPhaseArtifact[] = [
  { phase: 'plan', filename: '01-plan.md' },
  { phase: 'implement', filename: '02-implementation-log.md' },
  { phase: 'review', filename: '03-review.md' },
]

const INVESTIGATION: WorkflowPhaseArtifact[] = [
  { phase: 'questions', filename: '01-questions.md' },
  { phase: 'research', filename: '02-research.md' },
  { phase: 'hypotheses', filename: '03-hypotheses.md' },
  { phase: 'reproduce', filename: '04-reproduce.md' },
  { phase: 'fix_plan', filename: '05-fix-plan.md' },
  { phase: 'implement', filename: '06-implementation-log.md' },
  { phase: 'review', filename: '07-review.md' },
]

const WORKFLOW_ARTIFACTS: Partial<Record<WorkflowType, WorkflowPhaseArtifact[]>> = {
  structured_change: STRUCTURED_CHANGE,
  quick_fix: QUICK_FIX,
  investigation: INVESTIGATION,
}

export function getWorkflowPhaseArtifacts(workflowType: WorkflowType): WorkflowPhaseArtifact[] {
  return WORKFLOW_ARTIFACTS[workflowType] ?? []
}

export function emptyArtifactMarkdown(phaseLabel: string): string {
  return `# ${phaseLabel}\n\n_Awaiting agent run._\n`
}

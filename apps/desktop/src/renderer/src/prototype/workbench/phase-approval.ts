import type { PhaseStructuredData, WorkbenchState } from './types.js'

import { PHASE_ORDER } from './fixtures.js'

const PHASE_LABELS: Record<string, string> = {
  questions: 'Questions',
  research: 'Research',
  design: 'Design',
  structure: 'Structure',
  plan: 'Plan',
  implement: 'Implement',
  review: 'Review',
}

export function getApproveBlockedReason(state: WorkbenchState): string | null {
  const needsReview = state.phases.find((p) => p.status === 'needs_review')
  if (!needsReview) return null

  const { structured } = state

  switch (structured.mode) {
    case 'human_qa': {
      const incomplete = structured.items.filter((i) => i.status === 'pending' && !i.answer.trim())
      if (incomplete.length > 0) {
        return `${incomplete.length} human question${incomplete.length === 1 ? '' : 's'} need an answer or defer`
      }
      return null
    }
    case 'research_verify': {
      const unverified = structured.findings.filter((f) => f.status === 'unverified')
      if (unverified.length > 0) {
        return `Confirm or dispute ${unverified.length} research finding${unverified.length === 1 ? '' : 's'}`
      }
      return null
    }
    case 'design_review': {
      const incompleteDecisions = structured.decisions.filter(
        (d) => d.status === 'pending' && !d.answer.trim(),
      )
      if (incompleteDecisions.length > 0) {
        return `${incompleteDecisions.length} decision${incompleteDecisions.length === 1 ? '' : 's'} need an answer or defer`
      }
      const unansweredQuestions = structured.openQuestions.filter(
        (q) => q.status === 'pending' && !q.answer.trim(),
      )
      if (unansweredQuestions.length > 0) {
        return `${unansweredQuestions.length} open question${unansweredQuestions.length === 1 ? '' : 's'} need an answer`
      }
      return null
    }
    case 'structure_slices': {
      const pending = structured.slices.filter((s) => s.status === 'pending')
      if (pending.length > 0) {
        return `Review ${pending.length} vertical slice${pending.length === 1 ? '' : 's'}`
      }
      return null
    }
    case 'plan_slices': {
      const pending = structured.slices.filter((s) => s.status === 'pending')
      if (pending.length > 0) {
        return `Review ${pending.length} plan slice${pending.length === 1 ? '' : 's'}`
      }
      return null
    }
    case 'review_checklist': {
      const unchecked = structured.items.filter((i) => !i.checked)
      if (unchecked.length > 0) {
        return `Complete ${unchecked.length} review checklist item${unchecked.length === 1 ? '' : 's'}`
      }
      return null
    }
    default:
      return null
  }
}

export function canApprovePhase(state: WorkbenchState): boolean {
  return getApproveBlockedReason(state) === null
}

/** Phase is in human review on an artifact (questions, research, etc.). */
export function isInPhaseReview(state: WorkbenchState): boolean {
  return state.phases.some((p) => p.status === 'needs_review') && state.mainMode === 'artifact'
}

/** Primary action label — e.g. "Proceed to research". */
export function getProceedLabel(state: WorkbenchState): string {
  const current = state.phases.find((p) => p.status === 'needs_review')
  if (!current) return 'Proceed'

  if (current.name === 'plan') return 'Unlock implementation'
  if (current.name === 'review') return 'Approve review'

  const idx = PHASE_ORDER.indexOf(current.name as (typeof PHASE_ORDER)[number])
  const next = idx >= 0 ? PHASE_ORDER[idx + 1] : undefined
  if (!next) return `Approve ${current.label.toLowerCase()}`

  const nextLabel = PHASE_LABELS[next] ?? next
  return `Proceed to ${nextLabel.toLowerCase()}`
}

export function shouldShowStructuredPanel(
  state: WorkbenchState,
  artifactPhase: string | undefined,
): boolean {
  if (!artifactPhase || state.structured.mode === 'none') return false
  if (state.focusPhase && artifactPhase === state.focusPhase) return true
  const needsReview = state.phases.find((p) => p.status === 'needs_review')
  return needsReview?.name === artifactPhase
}

export function structuredPanelTitle(data: PhaseStructuredData): string {
  switch (data.mode) {
    case 'human_qa':
      return 'Human judgment'
    case 'research_verify':
      return 'Verify findings'
    case 'design_review':
      return 'Decisions & open questions'
    case 'structure_slices':
      return 'Vertical slices'
    case 'plan_slices':
      return 'Implementation slices'
    case 'review_checklist':
      return 'Review checklist'
    default:
      return ''
  }
}

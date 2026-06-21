import type { PhaseStatus } from '@circuit/workflow'

export function phaseStatusLabel(status: PhaseStatus): string {
  const labels: Record<PhaseStatus, string> = {
    locked: 'Pending',
    ready: 'Ready',
    running: 'Running',
    needs_review: 'Needs review',
    approved: 'Approved',
    needs_revision: 'Needs revision',
    stale: 'Stale',
    failed: 'Failed',
    skipped: 'Skipped',
  }
  return labels[status]
}

/** Whether the signal has passed this node (trace continues lit). */
export function isPhaseComplete(status: PhaseStatus): boolean {
  return status === 'approved' || status === 'skipped'
}

/** Circuit node — state via fill/glow, theme tokens only (primary + muted). */
export function phaseNodeClassName(status: PhaseStatus, isCurrent: boolean): string {
  if (status === 'locked') {
    return 'border border-muted-foreground/30 bg-transparent'
  }
  if (status === 'running') {
    return 'bg-primary animate-pulse shadow-[0_0_6px_1px] shadow-primary/45'
  }
  if (status === 'approved' || status === 'skipped') {
    return 'bg-primary/85'
  }
  if (isCurrent) {
    return 'bg-primary shadow-[0_0_6px_1px] shadow-primary/40'
  }
  if (status === 'needs_review' || status === 'needs_revision') {
    return 'bg-primary ring-1 ring-primary/45 ring-inset'
  }
  if (status === 'ready') {
    return 'border border-primary/45 bg-primary/15'
  }
  if (status === 'failed') {
    return 'bg-destructive'
  }
  if (status === 'stale') {
    return 'bg-muted-foreground/45'
  }
  return 'border border-muted-foreground/35 bg-transparent'
}

export function circuitTraceClassName(fromComplete: boolean): string {
  return fromComplete
    ? 'mx-1 h-px w-3 shrink-0 rounded-full bg-primary/40'
    : 'mx-1 h-px w-3 shrink-0 rounded-full bg-border'
}

/** Active step — primary tint reads as the live node on the trace. */
export function activePhaseBadgeClassName(isCurrent: boolean): string {
  if (!isCurrent) return ''
  return 'border-primary/50 bg-primary/10 font-semibold text-foreground shadow-[0_0_14px_-5px] shadow-primary/40'
}

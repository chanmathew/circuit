import type { PhaseStatus } from './types.js'

export const PHASE_STATUS_STYLES: Record<PhaseStatus, string> = {
  locked: 'bg-muted/50 text-muted-foreground border-transparent',
  ready: 'bg-primary/10 text-primary border-primary/30',
  running: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 animate-pulse',
  needs_review: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
  approved: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  needs_revision: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30',
  stale: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30 line-through',
  failed: 'bg-red-500/20 text-red-800 dark:text-red-200 border-red-500/40',
  skipped: 'bg-muted text-muted-foreground border-transparent opacity-60',
}

export const PHASE_STATUS_DOT: Record<PhaseStatus, string> = {
  locked: 'bg-muted-foreground/30',
  ready: 'bg-primary',
  running: 'bg-amber-500',
  needs_review: 'bg-sky-500',
  approved: 'bg-emerald-500',
  needs_revision: 'bg-orange-500',
  stale: 'bg-red-400',
  failed: 'bg-red-600',
  skipped: 'bg-muted-foreground/40',
}

export function phaseStatusLabel(status: PhaseStatus): string {
  const labels: Record<PhaseStatus, string> = {
    locked: 'Locked',
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

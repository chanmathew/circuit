import type { PhaseStatus } from '@circuit/workflow'
import { cn } from '@circuit/ui'
import { Check, Loader2 } from 'lucide-react'

import {
  activePhaseBadgeClassName,
  isPhaseComplete,
  phaseNodeClassName,
  phaseStatusLabel,
} from './lib/phase-styles.js'

/** Fixed row height keeps dot centers evenly spaced for the spine math. */
const ROW_HEIGHT_PX = 32
const RAIL_CENTER_PX = 10

export interface PhaseTimelineItem {
  name: string
  label: string
  status: string
  /** Past run drill-in — phase has a persisted artifact even if status reads locked. */
  hasArtifact?: boolean
}

export interface PhaseTimelineProps {
  phases: PhaseTimelineItem[]
  currentPhase?: string
  /** Live harness run — shows running before task detail catches up. */
  runningPhase?: string
  /** Read-only past run — allow selecting phases that produced artifacts. */
  readOnly?: boolean
  onSelectPhase?: (name: string) => void
}

function effectivePhaseStatus(status: PhaseStatus, phaseName: string, runningPhase?: string): PhaseStatus {
  if (runningPhase === phaseName && status !== 'approved' && status !== 'skipped') {
    return 'running'
  }
  return status
}

function PhaseStatusText({
  status,
  isCurrent,
}: {
  status: PhaseStatus
  isCurrent: boolean
}): React.ReactElement {
  const complete = isPhaseComplete(status)
  const pending = status === 'locked'
  const running = status === 'running'

  return (
    <span
      className={cn(
        'flex shrink-0 items-center gap-1 text-[10px] leading-none',
        pending && 'text-muted-foreground/60',
        complete && 'text-muted-foreground',
        running && 'font-medium text-primary',
        isCurrent && !complete && !running && 'font-medium text-primary',
        !pending && !complete && !running && !isCurrent && 'text-muted-foreground',
      )}
    >
      {running && (
        <Loader2 className="size-2.5 shrink-0 animate-spin" strokeWidth={2.5} aria-hidden />
      )}
      {complete && <Check className="size-2.5 shrink-0" strokeWidth={2.5} aria-hidden />}
      {phaseStatusLabel(status)}
    </span>
  )
}

function PhaseTimelineRow({
  phase,
  isCurrent,
  runningPhase,
  readOnly = false,
  onSelectPhase,
}: {
  phase: PhaseTimelineItem
  isCurrent: boolean
  runningPhase?: string
  readOnly?: boolean
  onSelectPhase?: (name: string) => void
}): React.ReactElement {
  const status = effectivePhaseStatus(phase.status as PhaseStatus, phase.name, runningPhase)
  const pending = status === 'locked'
  const selectable =
    Boolean(onSelectPhase) && (!pending || (readOnly && phase.hasArtifact))
  const rowClassName = cn(
    'flex min-w-0 flex-1 items-center justify-between gap-3 rounded-md px-2 text-left',
    activePhaseBadgeClassName(isCurrent),
    isCurrent && 'ring-1 ring-primary/25',
  )

  const labelBlock = (
    <>
      <span className={cn('truncate text-xs font-medium', pending && 'text-muted-foreground')}>
        {phase.label}
      </span>
      <PhaseStatusText status={status} isCurrent={isCurrent} />
    </>
  )

  return (
    <li
      className="grid grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-x-3"
      style={{ minHeight: ROW_HEIGHT_PX }}
    >
      <div className="flex h-full items-center justify-center">
        <span
          aria-hidden
          className={cn(
            'relative z-[1] size-2 shrink-0 rounded-full',
            phaseNodeClassName(status, isCurrent),
          )}
        />
      </div>

      {selectable ? (
        <button
          type="button"
          className={cn(rowClassName, 'h-full cursor-pointer py-1 hover:bg-accent/40')}
          onClick={() => onSelectPhase!(phase.name)}
          aria-current={isCurrent ? 'step' : undefined}
        >
          {labelBlock}
        </button>
      ) : (
        <div className={cn(rowClassName, 'h-full py-1')} aria-current={isCurrent ? 'step' : undefined}>
          {labelBlock}
        </div>
      )}
    </li>
  )
}

/** Last dot center (inclusive) that the primary spine should reach. */
function spineLitEndIndex(phases: PhaseTimelineItem[], currentPhase?: string): number {
  const lastCompleteIndex = phases.reduce(
    (last, phase, index) => (isPhaseComplete(phase.status as PhaseStatus) ? index : last),
    -1,
  )

  const currentIndex = currentPhase
    ? phases.findIndex((phase) => phase.name === currentPhase)
    : -1
  const currentUnlocked =
    currentIndex >= 0 && (phases[currentIndex]?.status as PhaseStatus) !== 'locked'

  if (!currentUnlocked && lastCompleteIndex < 0) {
    return -1
  }

  return Math.max(lastCompleteIndex, currentUnlocked ? currentIndex : lastCompleteIndex)
}

export function PhaseTimeline({
  phases,
  currentPhase,
  runningPhase,
  readOnly = false,
  onSelectPhase,
}: PhaseTimelineProps): React.ReactElement {
  if (phases.length === 0) {
    return <ol className="flex flex-col" role="list" aria-label="Workflow phases" />
  }

  const litEndIndex = spineLitEndIndex(phases, currentPhase)

  const spineTop = ROW_HEIGHT_PX / 2
  const spineBottom = ROW_HEIGHT_PX / 2
  const litHeight = litEndIndex >= 0 ? litEndIndex * ROW_HEIGHT_PX : 0

  return (
    <ol className="relative flex flex-col" role="list" aria-label="Workflow phases">
      <span
        aria-hidden
        className="pointer-events-none absolute z-0 w-px bg-border"
        style={{
          left: RAIL_CENTER_PX,
          top: spineTop,
          bottom: spineBottom,
        }}
      />
      {litHeight > 0 && (
        <span
          aria-hidden
          className="pointer-events-none absolute z-0 w-px bg-primary/45"
          style={{
            left: RAIL_CENTER_PX,
            top: spineTop,
            height: litHeight,
          }}
        />
      )}

      {phases.map((phase) => (
        <PhaseTimelineRow
          key={phase.name}
          phase={phase}
          isCurrent={currentPhase === phase.name}
          runningPhase={runningPhase}
          readOnly={readOnly}
          onSelectPhase={onSelectPhase}
        />
      ))}
    </ol>
  )
}

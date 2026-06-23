import { Badge, cn } from '@circuit/ui'
import type { PhaseStatus } from '@circuit/workflow'

import {
  activePhaseBadgeClassName,
  circuitTraceClassName,
  isPhaseComplete,
  phaseNodeClassName,
} from '../lib/phase-styles.js'

export interface PhaseRailItem {
  name: string
  label: string
  status: PhaseStatus
}

const badgeClassName =
  'h-auto min-h-5 gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium normal-case tracking-normal'

function CircuitNode({
  status,
  isCurrent,
}: {
  status: PhaseStatus
  isCurrent: boolean
}): React.ReactElement {
  return (
    <span
      aria-hidden
      className={cn('size-1.5 shrink-0 rounded-full', phaseNodeClassName(status, isCurrent))}
    />
  )
}

function CircuitTrace({ fromComplete }: { fromComplete: boolean }): React.ReactElement {
  return <span aria-hidden className={circuitTraceClassName(fromComplete)} />
}

function PhaseRailBadge({
  phase,
  isCurrent,
  onSelectPhase,
}: {
  phase: PhaseRailItem
  isCurrent: boolean
  onSelectPhase?: (name: string) => void
}): React.ReactElement {
  const isLocked = phase.status === 'locked'
  const badgeStateClassName = cn(
    badgeClassName,
    isLocked && 'opacity-40',
    activePhaseBadgeClassName(isCurrent),
  )
  const label = (
    <>
      <CircuitNode status={phase.status} isCurrent={isCurrent} />
      <span className="whitespace-nowrap">{phase.label}</span>
    </>
  )

  if (onSelectPhase) {
    return (
      <Badge asChild variant="outline" className={badgeStateClassName}>
        <button
          type="button"
          disabled={isLocked}
          onClick={() => onSelectPhase(phase.name)}
          title={phase.label}
          aria-current={isCurrent ? 'step' : undefined}
          className={cn(isLocked ? 'cursor-not-allowed' : 'cursor-pointer')}
        >
          {label}
        </button>
      </Badge>
    )
  }

  return (
    <Badge
      variant="outline"
      className={badgeStateClassName}
      title={`${phase.label} (${phase.status})`}
      aria-current={isCurrent ? 'step' : undefined}
    >
      {label}
    </Badge>
  )
}

export function PhaseRail({
  phases,
  currentPhase,
  onSelectPhase,
}: {
  phases: PhaseRailItem[]
  currentPhase?: string
  onSelectPhase?: (name: string) => void
}): React.ReactElement {
  return (
    <div
      className="flex min-w-0 flex-1 items-center justify-center gap-0 overflow-x-auto px-2 py-1"
      role="list"
      aria-label="Workflow phases"
    >
      {phases.map((phase, i) => {
        const isCurrent = currentPhase === phase.name

        return (
          <div key={phase.name} className="flex shrink-0 items-center" role="listitem">
            <PhaseRailBadge phase={phase} isCurrent={isCurrent} onSelectPhase={onSelectPhase} />
            {i < phases.length - 1 && <CircuitTrace fromComplete={isPhaseComplete(phase.status)} />}
          </div>
        )
      })}
    </div>
  )
}

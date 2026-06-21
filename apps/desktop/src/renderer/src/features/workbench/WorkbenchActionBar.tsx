import { Button } from '@circuit/ui'

import type { PhaseDto } from '../../../../shared/api.js'

export interface WorkbenchActionBarProps {
  actionPhase?: PhaseDto
  isRunning: boolean
  canRun: boolean
  showRunHint: boolean
  onRunPhase: (phaseName: string) => void
}

export function WorkbenchActionBar({
  actionPhase,
  isRunning,
  canRun,
  showRunHint,
  onRunPhase,
}: WorkbenchActionBarProps): React.ReactElement | null {
  const hasActions = (canRun && actionPhase) || showRunHint

  if (!hasActions) return null

  return (
    <div className="shrink-0 border-t border-border bg-card">
      {showRunHint && actionPhase && (
        <p className="border-b border-border/60 bg-amber-500/5 px-4 py-2 text-xs text-amber-900 dark:text-amber-100">
          Phase <strong>{actionPhase.label}</strong> is ready — click Run to start the mock agent.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        {canRun && actionPhase && (
          <Button type="button" disabled={isRunning} onClick={() => onRunPhase(actionPhase.name)}>
            {isRunning ? 'Running…' : `Run ${actionPhase.label}`}
          </Button>
        )}
      </div>
    </div>
  )
}

import { Button, Textarea } from '@circuit/ui'

import type { PhaseDto } from '../../../shared/api.js'

export interface WorkbenchActionBarProps {
  actionPhase?: PhaseDto
  isRunning: boolean
  canRun: boolean
  canApprove: boolean
  canRevise: boolean
  showRunHint: boolean
  revisionOpen: boolean
  revisionNote: string
  onRevisionNoteChange: (value: string) => void
  onRunPhase: (phaseName: string) => void
  onApprovePhase: (phaseName: string) => void
  onOpenRevision: () => void
  onCloseRevision: () => void
  onSubmitRevision: (phaseName: string, note: string) => void
}

export function WorkbenchActionBar({
  actionPhase,
  isRunning,
  canRun,
  canApprove,
  canRevise,
  showRunHint,
  revisionOpen,
  revisionNote,
  onRevisionNoteChange,
  onRunPhase,
  onApprovePhase,
  onOpenRevision,
  onCloseRevision,
  onSubmitRevision,
}: WorkbenchActionBarProps): React.ReactElement | null {
  const hasActions =
    (canRun && actionPhase) ||
    (canApprove && actionPhase) ||
    (canRevise && actionPhase) ||
    showRunHint

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

        {canApprove && actionPhase && !revisionOpen && (
          <>
            <Button
              type="button"
              disabled={isRunning}
              onClick={() => onApprovePhase(actionPhase.name)}
            >
              Approve {actionPhase.label}
            </Button>
            {canRevise && (
              <Button
                type="button"
                variant="outline"
                disabled={isRunning}
                onClick={onOpenRevision}
              >
                Request revision
              </Button>
            )}
          </>
        )}

        {revisionOpen && actionPhase && (
          <div className="flex w-full flex-col gap-3">
            <Textarea
              value={revisionNote}
              onChange={(e) => onRevisionNoteChange(e.target.value)}
              placeholder="What should change?"
              className="min-h-20 bg-background"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={!revisionNote.trim() || isRunning}
                onClick={() => onSubmitRevision(actionPhase.name, revisionNote.trim())}
              >
                Submit revision
              </Button>
              <Button type="button" variant="outline" onClick={onCloseRevision}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

import { Checkbox, cn } from '@circuit/ui'

import type { GitFileChangeDto } from '../../../../../shared/api.js'
import { DiffBadges } from '../../../lib/diff/DiffBadges.js'
import { gitChangeStatusLetter } from './lib/git-change-status-letter.js'

export interface ChangeFileRowProps {
  change: GitFileChangeDto
  selected?: boolean
  onSelect: (path: string) => void
  onStage?: (path: string) => void
  onUnstage?: (path: string) => void
  staging?: boolean
}

/** Show the path tail; truncate from the left when space is tight. */
function PathLabel({ path }: { path: string }): React.ReactElement {
  return (
    <span
      className="min-w-0 shrink overflow-hidden text-ellipsis whitespace-nowrap [direction:rtl]"
      dir="ltr"
    >
      <bdi className="[direction:ltr]">{path}</bdi>
    </span>
  )
}

export function ChangeFileRow({
  change,
  selected = false,
  onSelect,
  onStage,
  onUnstage,
  staging = false,
}: ChangeFileRowProps): React.ReactElement {
  const showStage = change.unstaged && onStage
  const showUnstage = change.staged && onUnstage
  const showStageToggle = showStage || showUnstage

  const stagedChecked = change.staged === true && change.unstaged !== true
  const stagedIndeterminate = change.staged === true && change.unstaged === true
  const stageLabel = showStage
    ? `Stage ${change.path}`
    : showUnstage
      ? `Unstage ${change.path}`
      : ''

  const handleStageToggle = (): void => {
    if (staging) return
    if (showStage) onStage(change.path)
    else if (showUnstage) onUnstage(change.path)
  }

  return (
    <div
      className={cn(
        'group relative w-full min-w-0 rounded-md',
        selected ? 'bg-accent' : 'hover:bg-accent/40',
      )}
    >
      <button
        type="button"
        className={cn(
          'flex w-full min-w-0 cursor-pointer items-center gap-2 px-2 py-2 text-left font-mono text-xs text-muted-foreground',
          !selected && 'hover:text-foreground/80',
          selected && 'text-foreground/80',
        )}
        onClick={() => onSelect(change.path)}
        title={change.path}
      >
        <span
          className={cn(
            'flex size-3 shrink-0 items-center justify-center text-amber-600',
            showStageToggle && 'group-hover:invisible',
          )}
        >
          {gitChangeStatusLetter(change.status)}
        </span>
        <span className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden">
          <PathLabel path={change.path} />
          <DiffBadges
            additions={change.insertions}
            deletions={change.deletions}
            className="shrink-0"
          />
        </span>
      </button>
      {showStageToggle ? (
        <span className="pointer-events-none absolute left-2 top-1/2 z-10 flex size-3 -translate-y-1/2 items-center justify-center opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
          <Checkbox
            className="size-3 cursor-pointer rounded-[3px] after:hidden focus-visible:ring-2"
            checked={stagedIndeterminate ? 'indeterminate' : stagedChecked}
            disabled={staging}
            aria-label={stageLabel}
            title={stageLabel}
            onCheckedChange={handleStageToggle}
          />
        </span>
      ) : null}
    </div>
  )
}

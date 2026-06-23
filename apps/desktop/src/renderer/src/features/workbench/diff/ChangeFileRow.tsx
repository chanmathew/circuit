import { Button, cn } from '@circuit/ui'

import type { GitFileChangeDto } from '../../../../../shared/api.js'
import { DiffBadges } from '../../stream/DiffBadges.js'
import { gitChangeStatusLetter } from './git-change-status.js'

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
  const showActions = showStage || showUnstage

  return (
    <div
      className={cn(
        'group relative min-w-0 overflow-hidden rounded-md px-1 py-1 font-mono text-xs',
        selected ? 'bg-accent' : 'hover:bg-accent/40',
      )}
    >
      <button
        type="button"
        className={cn(
          'flex w-full min-w-0 items-center gap-2 overflow-hidden text-muted-foreground',
          !selected && 'hover:text-foreground/80',
          selected && 'text-foreground/80',
          showActions && 'group-hover:pr-[4.25rem]',
        )}
        onClick={() => onSelect(change.path)}
        title={change.path}
      >
        <span className="w-3 shrink-0 text-amber-600">{gitChangeStatusLetter(change.status)}</span>
        <span className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden">
          <PathLabel path={change.path} />
          <DiffBadges
            additions={change.insertions}
            deletions={change.deletions}
            className="shrink-0"
          />
        </span>
      </button>

      {showActions ? (
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center gap-0.5 pr-0.5 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
          {showStage ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 bg-accent/80 px-1.5 text-[10px] backdrop-blur-sm"
              disabled={staging}
              onClick={() => onStage(change.path)}
            >
              Stage
            </Button>
          ) : null}
          {showUnstage ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 bg-accent/80 px-1.5 text-[10px] backdrop-blur-sm"
              disabled={staging}
              onClick={() => onUnstage(change.path)}
            >
              Unstage
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

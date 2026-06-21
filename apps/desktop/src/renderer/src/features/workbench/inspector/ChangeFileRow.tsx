import { Button, cn } from '@circuit/ui'

import type { GitFileChangeDto } from '../../../../../shared/api.js'
import { formatDiffStats, gitChangeStatusLetter } from './git-change-status.js'

export interface ChangeFileRowProps {
  change: GitFileChangeDto
  selected?: boolean
  onSelect: (path: string) => void
  onStage?: (path: string) => void
  onUnstage?: (path: string) => void
  staging?: boolean
}

export function ChangeFileRow({
  change,
  selected = false,
  onSelect,
  onStage,
  onUnstage,
  staging = false,
}: ChangeFileRowProps): React.ReactElement {
  const stats = formatDiffStats(change.insertions, change.deletions)
  const showStage = change.unstaged && onStage
  const showUnstage = change.staged && onUnstage

  return (
    <div
      className={cn(
        'group flex items-center gap-2 rounded-md px-1 py-0.5 font-mono text-xs',
        selected ? 'bg-accent' : 'hover:bg-accent/40',
      )}
    >
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
        onClick={() => onSelect(change.path)}
      >
        <span className="w-3 shrink-0 text-amber-600">{gitChangeStatusLetter(change.status)}</span>
        <span className="truncate">{change.path}</span>
        {stats ? <span className="shrink-0 text-[10px] text-muted-foreground">{stats}</span> : null}
      </button>

      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        {showStage ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 text-[10px]"
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
            className="h-6 px-1.5 text-[10px]"
            disabled={staging}
            onClick={() => onUnstage(change.path)}
          >
            Unstage
          </Button>
        ) : null}
      </div>
    </div>
  )
}

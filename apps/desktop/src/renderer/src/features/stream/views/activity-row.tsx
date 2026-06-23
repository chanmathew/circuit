import { HugeiconsIcon } from '@hugeicons/react'
import { Shimmer, cn } from '@circuit/ui'
import type { ActivityGroupItem, ReferenceTarget } from '@circuit/protocol'
import { activityRowLabelParts, resolveActivityRowFileTarget } from '@circuit/protocol'

import { DiffBadges } from '../../../lib/diff/DiffBadges.js'
import { ActivityEditRow } from '../ActivityEditRow.js'
import { ActivityFileLink } from '../ActivityFileLink.js'

function liveCategoryLabel(item: ActivityGroupItem): string {
  const running = item.items.find((entry) => entry.status === 'running')
  const label = running?.label ?? item.title
  if (/^Edit|^Writ|^Patch/i.test(label)) return 'Editing'
  if (/^Run|^Ran|command/i.test(label)) return 'Running'
  if (/^Search|^Grep|^Glob|^List/i.test(label)) return 'Searching'
  return 'Exploring'
}

export function ActivityRow({
  entry,
  workspacePath,
  onOpenReference,
  onOpenChangedFile,
}: {
  entry: ActivityGroupItem['items'][number]
  workspacePath?: string
  onOpenReference?: (target: ReferenceTarget) => void
  onOpenChangedFile?: (path: string) => void
}): React.ReactElement {
  const { filePath, openAs } = resolveActivityRowFileTarget(entry)
  const labelParts = activityRowLabelParts(entry)

  if (openAs === 'diff' && filePath && workspacePath) {
    return (
      <ActivityEditRow
        entry={entry}
        filePath={filePath}
        workspacePath={workspacePath}
        onOpenReference={onOpenReference}
        onOpenChangedFile={onOpenChangedFile}
      />
    )
  }

  const showFileLink = filePath != null && labelParts.fileName != null

  const plainLabel =
    entry.status === 'running' ? (
      <Shimmer duration={1.5}>{entry.label}</Shimmer>
    ) : (
      entry.label
    )

  return (
    <div className="flex items-baseline py-px text-xs text-muted-foreground">
      <span className="flex min-w-0 flex-1 items-baseline gap-1">
        {showFileLink ? (
          <>
            {entry.status === 'running' ? (
              <Shimmer duration={1.5}>{labelParts.prefix}</Shimmer>
            ) : (
              <span className="shrink-0">{labelParts.prefix}</span>
            )}
            <ActivityFileLink
              filePath={filePath}
              fileName={labelParts.fileName ?? filePath}
              openAs={openAs}
              onOpenReference={onOpenReference}
              onOpenChangedFile={onOpenChangedFile}
            />
          </>
        ) : (
          <span className="truncate">{plainLabel}</span>
        )}
        {entry.detail && (
          <span className="shrink-0 text-muted-foreground/60">{entry.detail}</span>
        )}
        <DiffBadges
          additions={entry.additions}
          deletions={entry.deletions}
          className="flex shrink-0 items-center gap-1 font-mono text-xs tabular-nums"
        />
      </span>
    </div>
  )
}

export function LiveActivityPanel({
  item,
  workspacePath,
  onOpenReference,
  onOpenChangedFile,
}: {
  item: ActivityGroupItem
  workspacePath?: string
  onOpenReference?: (target: ReferenceTarget) => void
  onOpenChangedFile?: (path: string) => void
}): React.ReactElement {
  const hasRunning = item.items.some((entry) => entry.status === 'running')
  const category = liveCategoryLabel(item)
  const visibleItems = item.items.slice(-4)

  return (
    <div className="space-y-1">
      <div className="sticky top-0 z-10 bg-background/95 pb-1 shadow-[0_6px_10px_-6px] shadow-background">
        <p className="text-xs font-medium text-foreground/90">{category}</p>
      </div>
      <div className="relative max-h-28 overflow-hidden">
        <div
          className={cn(
            'space-y-0.5',
            item.items.length > 3 &&
              'pointer-events-none [mask-image:linear-gradient(to_bottom,transparent,black_28%,black)]',
          )}
        >
          {visibleItems.map((entry, index) => (
            <ActivityRow
              key={`${entry.label}-${index}`}
              entry={entry}
              workspacePath={workspacePath}
              onOpenReference={onOpenReference}
              onOpenChangedFile={onOpenChangedFile}
            />
          ))}
        </div>
      </div>
      {!hasRunning && (
        <Shimmer duration={1.5} className="text-xs text-muted-foreground">
          Planning next moves
        </Shimmer>
      )}
    </div>
  )
}

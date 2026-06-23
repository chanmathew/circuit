import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowDown01Icon, Loading03Icon } from '@hugeicons/core-free-icons'

import type { ActivityGroupItem } from '@circuit/protocol'
import { cn, Shimmer, Task, TaskContent, TaskTrigger } from '@circuit/ui'

import { DiffBadges } from '../../../lib/diff/DiffBadges.js'
import { ActivityRow, LiveActivityPanel } from './activity-row.js'
import type { StreamItemContext } from './stream-item-context.js'
import { mutedTaskTitleClassName, taskChevronClassName } from './shared-styles.js'

export function ActivityGroupItemView({
  item,
  context,
  emphasized = true,
}: {
  item: ActivityGroupItem
  context?: StreamItemContext
  emphasized?: boolean
}): React.ReactElement {
  const workspacePath = context?.workspacePath
  const onOpenReference = context?.onOpenReference
  const onOpenChangedFile = context?.onOpenChangedFile
  const isLive = item.live === true
  if (isLive) {
    return (
      <LiveActivityPanel
        item={item}
        workspacePath={workspacePath}
        onOpenReference={onOpenReference}
        onOpenChangedFile={onOpenChangedFile}
      />
    )
  }

  const display = item.display ?? (item.items.length <= 3 ? 'flat' : 'summary')
  const hasRunning = item.items.some((entry) => entry.status === 'running')
  const defaultOpen =
    display === 'flat' ? true : isLive || hasRunning || item.collapsed !== true

  if (display === 'flat') {
    return (
      <div className="space-y-0">
        {item.items.map((entry, index) => (
          <ActivityRow
            key={`${entry.label}-${index}`}
            entry={entry}
            workspacePath={workspacePath}
            onOpenReference={onOpenReference}
            onOpenChangedFile={onOpenChangedFile}
          />
        ))}
      </div>
    )
  }

  const titleContent =
    isLive && hasRunning ? <Shimmer duration={1.5}>{item.title}</Shimmer> : item.title

  return (
    <Task defaultOpen={defaultOpen} variant="inline" className="py-0">
      <TaskTrigger
        variant="inline"
        title=""
        className={cn('min-h-0 justify-between gap-2', !emphasized && mutedTaskTitleClassName)}
      >
        <span className="flex min-w-0 flex-1 items-baseline gap-1.5">
          <span className="truncate">{titleContent}</span>
          <DiffBadges
            additions={item.stats?.additions}
            deletions={item.stats?.deletions}
            className="flex shrink-0 items-center gap-1 font-mono text-xs tabular-nums"
          />
        </span>
        {isLive && hasRunning ? (
          <HugeiconsIcon
            icon={Loading03Icon}
            strokeWidth={2}
            className="size-2.5 shrink-0 animate-spin text-primary"
          />
        ) : (
          <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} className={taskChevronClassName} />
        )}
      </TaskTrigger>
      <TaskContent variant="inline" className="ml-0 space-y-0 border-0 py-0 pl-0">
        {item.items.map((entry, index) => (
          <ActivityRow
            key={`${entry.label}-${index}`}
            entry={entry}
            workspacePath={workspacePath}
            onOpenReference={onOpenReference}
            onOpenChangedFile={onOpenChangedFile}
          />
        ))}
      </TaskContent>
    </Task>
  )
}

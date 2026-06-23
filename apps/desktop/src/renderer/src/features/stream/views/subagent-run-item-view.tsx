import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowDown01Icon, Loading03Icon } from '@hugeicons/core-free-icons'

import type { SubagentRunItem } from '@circuit/protocol'
import { cn, Shimmer, Task, TaskContent, TaskTrigger } from '@circuit/ui'

import { ActivityRow } from './activity-row.js'
import type { StreamItemContext } from './stream-item-context.js'
import { mutedTaskTitleClassName } from './shared-styles.js'

export function SubagentRunItemView({
  item,
  context,
  emphasized = true,
}: {
  item: SubagentRunItem
  context?: StreamItemContext
  emphasized?: boolean
}): React.ReactElement {
  const isLive = item.live === true
  const hasRunning = item.status === 'running'
  const defaultOpen = isLive || hasRunning || item.collapsed !== true
  const title = `${item.subagentType} · ${item.description}`
  const titleContent = isLive && hasRunning ? <Shimmer duration={1.5}>{title}</Shimmer> : title
  const traceItems = isLive && item.trace ? item.trace.items.slice(-8) : (item.trace?.items ?? [])

  return (
    <Task defaultOpen={defaultOpen} variant="card" className="py-0">
      <TaskTrigger
        variant="card"
        title=""
        className={cn('justify-between gap-2', !emphasized && mutedTaskTitleClassName)}
      >
        <span className="min-w-0 flex-1 truncate">{titleContent}</span>
        <span className="flex shrink-0 items-center gap-1.5">
          {typeof item.stepCount === 'number' && item.stepCount > 0 && (
            <span className="text-xs font-normal text-muted-foreground/80">
              {item.stepCount} {item.stepCount === 1 ? 'step' : 'steps'}
            </span>
          )}
          {isLive && hasRunning ? (
            <HugeiconsIcon
              icon={Loading03Icon}
              strokeWidth={2}
              className="size-3 shrink-0 animate-spin text-primary"
            />
          ) : (
            <HugeiconsIcon
              icon={ArrowDown01Icon}
              strokeWidth={2}
              className="size-3 shrink-0 text-muted-foreground/70 transition-transform [[data-state=closed]_&]:-rotate-90"
            />
          )}
        </span>
      </TaskTrigger>
      {traceItems.length > 0 && (
        <TaskContent variant="card" className="space-y-0">
          {traceItems.map((entry, index) => (
            <ActivityRow
              key={`${entry.label}-${index}`}
              entry={entry}
              workspacePath={context?.workspacePath}
              onOpenReference={context?.onOpenReference}
              onOpenChangedFile={context?.onOpenChangedFile}
            />
          ))}
        </TaskContent>
      )}
    </Task>
  )
}

import { useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowDown01Icon, Loading03Icon } from '@hugeicons/core-free-icons'

import { countUnifiedDiffLines } from '@circuit/git'
import { Shimmer, Task, TaskContent, TaskTrigger } from '@circuit/ui'
import type { ActivityGroupRow } from '@circuit/protocol'
import { activityRowLabelParts } from '@circuit/protocol'

import { DiffBadges } from './DiffBadges.js'
import { useWorkspaceFileGitDiff } from '../../hooks/useWorkspaceGitDiff.js'
import { StreamInlineDiff } from './StreamInlineDiff.js'
import type { ActivityFileLinkProps } from './ActivityFileLink.js'
import { ActivityFileLink } from './ActivityFileLink.js'

export interface ActivityEditRowProps {
  entry: ActivityGroupRow
  filePath: string
  workspacePath: string
  onOpenReference?: ActivityFileLinkProps['onOpenReference']
  onOpenChangedFile?: ActivityFileLinkProps['onOpenChangedFile']
}

/** Edited-file tool row — expandable inline diff via Task (AI Elements). */
export function ActivityEditRow({
  entry,
  filePath,
  workspacePath,
  onOpenReference,
  onOpenChangedFile,
}: ActivityEditRowProps): React.ReactElement {
  const labelParts = activityRowLabelParts(entry)
  const isRunning = entry.status === 'running'
  const [open, setOpen] = useState(false)
  const needsDiffStats =
    open && !isRunning && entry.additions == null && entry.deletions == null
  const diffQuery = useWorkspaceFileGitDiff(workspacePath, filePath, needsDiffStats, {
    against: 'HEAD',
  })
  const diffStats = needsDiffStats && diffQuery.data
    ? countUnifiedDiffLines(diffQuery.data)
    : entry.additions != null || entry.deletions != null
      ? { additions: entry.additions, deletions: entry.deletions }
      : undefined

  return (
    <Task
      open={open}
      onOpenChange={setOpen}
      defaultOpen={false}
      variant="inline"
      className="py-0"
    >
      <TaskTrigger
        variant="inline"
        title={entry.label}
        aria-label={entry.label}
        className="flex w-full min-h-0 items-center justify-between gap-2 py-px text-xs font-normal text-muted-foreground"
      >
        <span className="flex min-w-0 flex-1 items-baseline gap-1">
          {isRunning ? (
            <Shimmer duration={1.5}>{labelParts.prefix}</Shimmer>
          ) : (
            <span className="shrink-0">{labelParts.prefix}</span>
          )}
          <ActivityFileLink
            filePath={filePath}
            fileName={labelParts.fileName ?? filePath}
            openAs="file"
            onOpenReference={onOpenReference}
            onOpenChangedFile={onOpenChangedFile}
          />
          {entry.detail ? (
            <span className="shrink-0 text-muted-foreground/60">{entry.detail}</span>
          ) : null}
          <DiffBadges additions={diffStats?.additions} deletions={diffStats?.deletions} />
        </span>
        {isRunning ? (
          <HugeiconsIcon
            icon={Loading03Icon}
            strokeWidth={2}
            className="size-2.5 shrink-0 animate-spin text-primary"
          />
        ) : (
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            strokeWidth={2}
            className="size-2.5 shrink-0 text-muted-foreground/70 transition-transform [[data-state=closed]_&]:-rotate-90"
          />
        )}
      </TaskTrigger>
      <TaskContent variant="inline" className="ml-0 max-h-72 border-0 py-0 pl-0">
        {isRunning ? (
          <p className="py-1.5 text-xs text-muted-foreground">Edit in progress…</p>
        ) : open ? (
          <StreamInlineDiff workspacePath={workspacePath} path={filePath} />
        ) : null}
      </TaskContent>
    </Task>
  )
}

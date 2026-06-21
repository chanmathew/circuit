import { useEffect, useMemo, useRef, useState } from 'react'
import { PatchDiff } from '@pierre/diffs/react'
import { ScrollArea } from '@circuit/ui'

import { useWorkspaceGitDiff } from '../../../hooks/useWorkspaceGitDiff.js'
import { WorkbenchFileTree } from '../inspector/WorkbenchFileTree.js'
import { usePierreThemeType } from '../../../lib/pierre/usePierreThemeType.js'
import { usePierreGlobalHighlightReady } from '../../../lib/pierre/PierreHighlightProvider.js'
import { pierreDiffViewerOptionsWithFileLinks } from '../lib/pierre-diff-header-links.js'
import type { DiffEntry } from '../lib/workbench-content.js'

export interface DiffContentPanelProps {
  workspacePath: string
  diff: DiffEntry | undefined
  selectedPath?: string
  onSelectPath?: (path: string) => void
  onOpenFile?: (path: string) => void
}

const SIDEBAR_MIN_WIDTH = 320

export function DiffContentPanel({
  workspacePath,
  diff,
  selectedPath,
  onSelectPath,
  onOpenFile,
}: DiffContentPanelProps): React.ReactElement {
  const themeType = usePierreThemeType()
  const highlightReady = usePierreGlobalHighlightReady()
  const containerRef = useRef<HTMLDivElement>(null)
  const [showSidebar, setShowSidebar] = useState(false)

  const pathsKey = diff?.paths.join('\0') ?? ''
  const diffQuery = useWorkspaceGitDiff(workspacePath, diff?.paths, Boolean(diff && diff.paths.length > 0))

  useEffect(() => {
    const node = containerRef.current
    if (!node) return

    const observer = new ResizeObserver(([entry]) => {
      setShowSidebar(entry.contentRect.width >= SIDEBAR_MIN_WIDTH)
    })
    observer.observe(node)
    setShowSidebar(node.getBoundingClientRect().width >= SIDEBAR_MIN_WIDTH)
    return () => observer.disconnect()
  }, [])

  const patchDiffOptions = useMemo(
    () =>
      pierreDiffViewerOptionsWithFileLinks(themeType, diff?.paths ?? [], onOpenFile),
    [themeType, diff?.paths, onOpenFile],
  )

  if (!diff) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-sm text-muted-foreground">
        <p>Select a diff from the inspector or open one from the agent stream.</p>
      </div>
    )
  }

  const activePath = selectedPath ?? diff.paths[0]

  return (
    <div ref={containerRef} className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-border px-4 py-3">
        <p className="text-sm font-medium">{diff.title}</p>
        <p className="text-xs text-muted-foreground">{diff.summary}</p>
      </div>

      <div className="flex min-h-0 flex-1">
        {showSidebar && diff.paths.length > 0 ? (
          <aside className="w-56 shrink-0 overflow-hidden border-r border-border">
            <WorkbenchFileTree
              workspacePath={workspacePath}
              paths={diff.paths}
              selectedPath={activePath}
              onSelectPath={onSelectPath}
              showGitStatus={false}
              style={{ minHeight: 320 }}
            />
          </aside>
        ) : null}

        <ScrollArea className="min-h-0 min-w-0 flex-1">
          {diffQuery.isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading diff…</p>
          ) : null}
          {diffQuery.isError ? (
            <p className="p-6 text-sm text-destructive">
              Failed to load git diff. Changes may not be committed yet.
            </p>
          ) : null}
          {diffQuery.data && diffQuery.data.trim().length > 0 && !highlightReady ? (
            <p className="p-6 text-sm text-muted-foreground">Preparing syntax highlight…</p>
          ) : null}
          {diffQuery.data && diffQuery.data.trim().length > 0 && highlightReady ? (
            <PatchDiff
              key={`${pathsKey}:${activePath ?? ''}:${themeType}`}
              patch={diffQuery.data}
              options={patchDiffOptions}
              disableWorkerPool
            />
          ) : null}
          {diffQuery.data !== undefined && diffQuery.data.trim().length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              No patch text for these paths — they may match the current HEAD.
            </p>
          ) : null}
        </ScrollArea>
      </div>
    </div>
  )
}

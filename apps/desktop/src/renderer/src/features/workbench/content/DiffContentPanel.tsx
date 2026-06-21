import { useMemo } from 'react'
import { PatchDiff } from '@pierre/diffs/react'
import { Button, ScrollArea } from '@circuit/ui'

import { useWorkspaceGitDiff } from '../../../hooks/useWorkspaceGitDiff.js'
import { usePierreThemeType } from '../../../lib/pierre/usePierreThemeType.js'
import { usePierreGlobalHighlightReady } from '../../../lib/pierre/PierreHighlightProvider.js'
import { pierreDiffViewerOptionsWithFileLinks } from '../lib/pierre-diff-header-links.js'
import type { DiffEntry } from '../lib/workbench-content.js'
import { WORKSPACE_DIFF_ID } from '../lib/workbench-content.js'
import { splitGitPatchByFile } from '../lib/split-git-patch.js'

export interface DiffContentPanelProps {
  workspacePath: string
  diff: DiffEntry | undefined
  selectedPath?: string
  onSelectPath?: (path: string) => void
  onOpenFile?: (path: string) => void
  onViewAllChanges?: () => void
}

export function DiffContentPanel({
  workspacePath,
  diff,
  selectedPath,
  onOpenFile,
  onViewAllChanges,
}: DiffContentPanelProps): React.ReactElement {
  const themeType = usePierreThemeType()
  const highlightReady = usePierreGlobalHighlightReady()

  const isWorkspaceDiff = diff?.id === WORKSPACE_DIFF_ID
  const diffPaths =
    isWorkspaceDiff && selectedPath ? [selectedPath] : diff?.paths
  const pathsKey = diffPaths?.join('\0') ?? ''

  const diffQuery = useWorkspaceGitDiff(
    workspacePath,
    diffPaths,
    Boolean(diff && (diffPaths?.length ?? 0) > 0),
    { against: isWorkspaceDiff ? 'HEAD' : 'index' },
  )

  const patchDiffOptions = useMemo(
    () =>
      pierreDiffViewerOptionsWithFileLinks(themeType, diff?.paths ?? [], onOpenFile),
    [themeType, diff?.paths, onOpenFile],
  )

  const filePatches = useMemo(
    () => (diffQuery.data ? splitGitPatchByFile(diffQuery.data) : []),
    [diffQuery.data],
  )

  if (!diff) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-sm text-muted-foreground">
        <p>Select a diff from the inspector or open one from the agent stream.</p>
      </div>
    )
  }

  const showAllChangesLink =
    isWorkspaceDiff && selectedPath && onViewAllChanges && diff.paths.length > 1

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-border px-4 py-3">
        <div className="flex items-start gap-2">
          {showAllChangesLink ? (
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto shrink-0 px-0 text-xs text-muted-foreground"
              onClick={onViewAllChanges}
            >
              All changes
            </Button>
          ) : null}
          <div className="min-w-0">
            <p className="text-sm font-medium">{diff.title}</p>
            <p className="text-xs text-muted-foreground">{diff.summary}</p>
          </div>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
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
          <div className="space-y-4 p-4">
            {filePatches.map((filePatch, index) => (
              <PatchDiff
                key={`${pathsKey}:${index}:${themeType}`}
                patch={filePatch}
                options={patchDiffOptions}
                disableWorkerPool
              />
            ))}
          </div>
        ) : null}
        {diffQuery.data !== undefined && diffQuery.data.trim().length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            No patch text for these paths — they may match the current HEAD.
          </p>
        ) : null}
      </ScrollArea>
    </div>
  )
}

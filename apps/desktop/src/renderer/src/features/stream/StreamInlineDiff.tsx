import { PatchDiff } from '@pierre/diffs/react'

import { useWorkspaceFileGitDiff } from '../../hooks/git/useWorkspaceGitDiff.js'
import { usePierreThemeType } from '../../lib/pierre/usePierreThemeType.js'
import { usePierreGlobalHighlightReady } from '../../lib/pierre/PierreHighlightProvider.js'
import { pierreDiffViewerOptions } from '../../lib/pierre/pierre-viewer-options.js'

export interface StreamInlineDiffProps {
  workspacePath: string
  path: string
}

/** Compact Pierre diff for an expanded stream tool-call row. */
export function StreamInlineDiff({
  workspacePath,
  path,
}: StreamInlineDiffProps): React.ReactElement {
  const themeType = usePierreThemeType()
  const highlightReady = usePierreGlobalHighlightReady()
  const diffQuery = useWorkspaceFileGitDiff(workspacePath, path, true, { against: 'HEAD' })

  if (diffQuery.isLoading || !highlightReady) {
    return <p className="px-2 py-1.5 text-xs text-muted-foreground">Loading diff…</p>
  }

  if (diffQuery.isError) {
    return (
      <p className="px-2 py-1.5 text-xs text-destructive">Could not load diff for this file.</p>
    )
  }

  if (!diffQuery.data || diffQuery.data.trim().length === 0) {
    return (
      <p className="px-2 py-1.5 text-xs text-muted-foreground">
        No git diff available for this file yet.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border/50 bg-muted/10">
      <PatchDiff
        key={`${path}:${themeType}`}
        patch={diffQuery.data}
        options={pierreDiffViewerOptions(themeType)}
        disableWorkerPool
        className="text-[11px]"
      />
    </div>
  )
}

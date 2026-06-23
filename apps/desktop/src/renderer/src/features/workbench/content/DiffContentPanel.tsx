import { useCallback, useMemo, useRef, useState } from 'react'

import { useGitStageMutations } from '../../../hooks/useGitStageMutations.js'
import { useWorkspaceGitDiff } from '../../../hooks/useWorkspaceGitDiff.js'
import { useWorkspaceGitStatus } from '../../../hooks/useWorkspaceGitStatus.js'
import { usePierreThemeType } from '../../../lib/pierre/usePierreThemeType.js'
import { usePierreGlobalHighlightReady } from '../../../lib/pierre/PierreHighlightProvider.js'
import { useDiffFilePatches } from '../hooks/useDiffFilePatches.js'
import { useDiffFocusScroll } from '../hooks/useDiffFocusScroll.js'
import { findGitChangeForPath } from '../lib/find-git-change-for-path.js'
import { pathFromGitPatch } from '../lib/path-from-git-patch.js'
import { pierreDiffViewerOptionsWithFileLinks } from '../lib/pierre-diff-header.js'
import { resolveDiffFilePath } from '../lib/diff-file-path.js'
import {
  DiscardConfirmDialog,
  type PendingDiscard,
} from '../lib/discard-confirm-dialog.js'
import type { DiffEntry } from '../lib/workbench-content.js'
import { WORKSPACE_DIFF_ID } from '../lib/workbench-content.js'
import { CollapsiblePatchDiff } from './CollapsiblePatchDiff.js'
import { DiffWorkspaceSummaryBar } from './DiffWorkspaceSummaryBar.js'
import { splitGitPatchByFile } from '../lib/split-git-patch.js'

export interface DiffContentPanelProps {
  workspacePath: string
  diff: DiffEntry | undefined
  selectedPath?: string
  /** Shared stable path order for workspace diffs (matches the changes inspector). */
  orderedPaths?: string[]
  /** Scroll this workspace file into view without filtering the diff list. */
  focusPath?: string
  onSelectPath?: (path: string) => void
  onOpenFile?: (path: string) => void
}

export function DiffContentPanel({
  workspacePath,
  diff,
  selectedPath,
  orderedPaths,
  focusPath,
  onSelectPath,
  onOpenFile,
}: DiffContentPanelProps): React.ReactElement {
  const themeType = usePierreThemeType()
  const highlightReady = usePierreGlobalHighlightReady()
  const gitStatusQuery = useWorkspaceGitStatus(workspacePath)
  const { stage, unstage, discard } = useGitStageMutations(workspacePath)
  const [pendingDiscard, setPendingDiscard] = useState<PendingDiscard | null>(null)
  const [discardError, setDiscardError] = useState<string | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const isWorkspaceDiff = diff?.id === WORKSPACE_DIFF_ID
  const diffPaths = useMemo(() => {
    if (!diff?.paths) return undefined
    if (isWorkspaceDiff) return diff.paths
    if (selectedPath && diff.paths.includes(selectedPath)) return [selectedPath]
    return diff.paths
  }, [diff?.paths, isWorkspaceDiff, selectedPath])

  const pathsKey = useMemo(
    () => (diffPaths != null ? [...diffPaths].sort().join('\0') : ''),
    [diffPaths],
  )

  const viewScopeKey = `${workspacePath}\0${pathsKey}`

  const diffQuery = useWorkspaceGitDiff(
    workspacePath,
    diffPaths,
    Boolean(diff && (diffPaths?.length ?? 0) > 0),
    { against: isWorkspaceDiff ? 'HEAD' : 'index' },
  )

  const handleDiffHeaderPathClick = useCallback(
    (path: string) => {
      if (isWorkspaceDiff) onSelectPath?.(path)
      else onOpenFile?.(path)
    },
    [isWorkspaceDiff, onOpenFile, onSelectPath],
  )

  const patchDiffOptions = useMemo(
    () =>
      pierreDiffViewerOptionsWithFileLinks(
        themeType,
        diff?.paths ?? [],
        handleDiffHeaderPathClick,
      ),
    [themeType, diff?.paths, handleDiffHeaderPathClick],
  )

  const filePatches = useMemo(
    () => (diffQuery.data ? splitGitPatchByFile(diffQuery.data) : []),
    [diffQuery.data],
  )

  const resolvePatchPath = useCallback(
    (patch: string): string | undefined => {
      if (!diff) return undefined
      const rawPath = pathFromGitPatch(patch)
      if (!rawPath) return undefined
      return resolveDiffFilePath({ name: rawPath }, diff.paths)
    },
    [diff],
  )

  const orderedFilePatches = useDiffFilePatches({
    patches: filePatches,
    resolvePatchPath,
    preferredOrder: isWorkspaceDiff ? orderedPaths : undefined,
    orderScopeKey: viewScopeKey,
  })

  const gitStatus = gitStatusQuery.data
  const discardBusy = discard.isPending
  const allChangePaths = gitStatus?.changes.map((change) => change.path) ?? []
  const gitChanges = gitStatus?.changes ?? []

  const scopedChanges = useMemo(() => {
    if (!isWorkspaceDiff || !diffPaths?.length) return []
    const pathSet = new Set(diffPaths)
    return gitChanges.filter((change) => pathSet.has(change.path))
  }, [diffPaths, gitChanges, isWorkspaceDiff])

  const scopedUnstagedPaths = useMemo(
    () => scopedChanges.filter((change) => change.unstaged).map((change) => change.path),
    [scopedChanges],
  )

  const scopedStagedPaths = useMemo(
    () => scopedChanges.filter((change) => change.staged).map((change) => change.path),
    [scopedChanges],
  )

  const allScopedStaged =
    scopedChanges.length > 0 && scopedUnstagedPaths.length === 0
  const someScopedStaged =
    scopedStagedPaths.length > 0 && scopedUnstagedPaths.length > 0

  const toggleFileStage = useCallback(
    (path: string): void => {
      const change = findGitChangeForPath(gitChanges, path)
      if (!change) return
      if (change.staged) unstage.mutate([path])
      else stage.mutate([path])
    },
    [gitChanges, stage, unstage],
  )

  const toggleStageAllVisible = useCallback((): void => {
    if (allScopedStaged) {
      unstage.mutate(scopedStagedPaths)
      return
    }
    if (scopedUnstagedPaths.length > 0) stage.mutate(scopedUnstagedPaths)
  }, [allScopedStaged, scopedStagedPaths, scopedUnstagedPaths, stage, unstage])

  const requestDiscard = useCallback((paths: string[]): void => {
    if (paths.length === 0) return
    setDiscardError(null)
    setPendingDiscard({ paths })
  }, [])

  const confirmPendingDiscard = useCallback((): void => {
    if (!pendingDiscard) return
    discard.mutate(pendingDiscard.paths, {
      onSuccess: () => {
        setPendingDiscard(null)
        setDiscardError(null)
      },
      onError: (error) => {
        const message = error instanceof Error ? error.message : String(error)
        setDiscardError(message)
      },
    })
  }, [discard, pendingDiscard])

  const hasDiffData = Boolean(diffQuery.data && diffQuery.data.trim().length > 0)
  const showInitialDiffLoading = diffQuery.isLoading && !hasDiffData

  useDiffFocusScroll({
    focusPath,
    enabled: hasDiffData && highlightReady,
    patchCount: orderedFilePatches.length,
    scrollContainerRef,
  })

  if (!diff) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-sm text-muted-foreground">
        <p>Select a diff from the inspector or open one from the agent stream.</p>
      </div>
    )
  }

  const stageAllLabel = allScopedStaged ? 'Unstage all changes' : 'Stage all changes'

  return (
    <div className="flex h-full min-h-0 flex-col">
      {isWorkspaceDiff && gitStatus && !gitStatus.clean ? (
        <DiffWorkspaceSummaryBar
          gitStatus={gitStatus}
          allChangePaths={allChangePaths}
          discardBusy={discardBusy}
          allScopedStaged={allScopedStaged}
          someScopedStaged={someScopedStaged}
          scopedChangesCount={scopedChanges.length}
          stageAllLabel={stageAllLabel}
          onDiscardAll={() => requestDiscard(allChangePaths)}
          onToggleStageAll={toggleStageAllVisible}
        />
      ) : (
        <div className="flex shrink-0 items-center border-b border-border px-4 py-2">
          <p className="truncate text-sm font-medium">{diff.title}</p>
        </div>
      )}

      <div
        ref={scrollContainerRef}
        className="panel-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
      >
        {showInitialDiffLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading diff…</p>
        ) : null}
        {diffQuery.isError ? (
          <p className="p-6 text-sm text-destructive">
            Failed to load git diff. Changes may not be committed yet.
          </p>
        ) : null}
        {hasDiffData && !highlightReady ? (
          <p className="p-6 text-sm text-muted-foreground">Preparing syntax highlight…</p>
        ) : null}
        {hasDiffData && highlightReady ? (
          <div className="divide-y divide-border">
            {orderedFilePatches.map(({ patch: filePatch, filePath }) => {
              const patchPath = pathFromGitPatch(filePatch)
              const fileChange = filePath ? findGitChangeForPath(gitChanges, filePath) : undefined

              return (
                <div
                  key={`${viewScopeKey}:${patchPath ?? filePatch.slice(0, 40)}`}
                  data-diff-file-path={filePath ?? undefined}
                  className="scroll-mt-3"
                >
                  <div
                    data-diff-file-scroll-anchor=""
                    className="pointer-events-none h-px w-full"
                    aria-hidden
                  />
                  <CollapsiblePatchDiff
                    patch={filePatch}
                    options={patchDiffOptions}
                    filePath={isWorkspaceDiff ? filePath : undefined}
                    fileChange={fileChange}
                    focusPath={focusPath}
                    onToggleStage={
                      isWorkspaceDiff && filePath ? toggleFileStage : undefined
                    }
                    onDiscardFile={
                      isWorkspaceDiff ? (path) => requestDiscard([path]) : undefined
                    }
                    discardDisabled={discardBusy}
                    disableWorkerPool
                  />
                </div>
              )
            })}
          </div>
        ) : null}
        {diffQuery.data !== undefined && !hasDiffData && !showInitialDiffLoading ? (
          <p className="p-6 text-sm text-muted-foreground">
            No patch text for these paths — they may match the current HEAD.
          </p>
        ) : null}
      </div>

      <DiscardConfirmDialog
        pending={pendingDiscard}
        busy={discardBusy}
        error={discardError}
        changes={gitChanges}
        onCancel={() => {
          setPendingDiscard(null)
          setDiscardError(null)
        }}
        onConfirm={confirmPendingDiscard}
      />
    </div>
  )
}

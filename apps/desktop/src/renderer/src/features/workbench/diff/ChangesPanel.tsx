import { Badge, Button, cn } from '@circuit/ui'
import { HugeiconsIcon } from '@hugeicons/react'
import { GitBranchIcon } from '@hugeicons/core-free-icons'

import type { GitFileChangeDto, TaskDto } from '../../../../../shared/api.js'
import { useGitStageMutations } from '../../../hooks/git/useGitStageMutations.js'
import { useWorkspaceGitStatus } from '../../../hooks/git/useWorkspaceGitStatus.js'
import { DiffBadges } from '../../../lib/diff/DiffBadges.js'
import type { CheckEntry, DiffEntry } from '../navigation/workbench-content.js'
import { WORKSPACE_DIFF_ID } from '../navigation/workbench-content.js'
import { ChangeFileRow } from './ChangeFileRow.js'
import { ChangesCollapsibleSection } from './ChangesCollapsibleSection.js'
import { ChangesCommitSection } from './ChangesCommitSection.js'

export interface ChangesPanelProps {
  task: TaskDto
  diffs: DiffEntry[]
  checks: CheckEntry[]
  selectedDiffId?: string
  selectedCheckId?: string
  selectedWorkspacePath?: string
  orderedChanges?: GitFileChangeDto[]
  onSelectDiff: (id: string) => void
  onSelectCheck: (id: string) => void
  onOpenChangedFile: (path: string) => void
  onOpenAllChanges: () => void
}

export function ChangesPanel({
  task,
  diffs,
  checks,
  selectedDiffId,
  selectedCheckId,
  selectedWorkspacePath,
  orderedChanges,
  onSelectDiff,
  onSelectCheck,
  onOpenChangedFile,
  onOpenAllChanges,
}: ChangesPanelProps): React.ReactElement {
  const gitQuery = useWorkspaceGitStatus(task.workspacePath)
  const { stage, unstage, commit } = useGitStageMutations(task.workspacePath)

  const status = gitQuery.data
  const changes = orderedChanges ?? status?.changes ?? []
  const stagedChanges = changes.filter((change) => change.staged)
  const unstagedChanges = changes.filter((change) => change.unstaged)
  const hasGitChanges = (status?.changes.length ?? 0) > 0
  const hasFeedContent = diffs.length > 0 || checks.length > 0
  const stagingBusy = stage.isPending || unstage.isPending

  const handleStageAll = (): void => {
    const paths = unstagedChanges.map((change) => change.path)
    if (paths.length > 0) stage.mutate(paths)
  }

  const handleUnstageAll = (): void => {
    const paths = stagedChanges.map((change) => change.path)
    if (paths.length > 0) unstage.mutate(paths)
  }

  const aggregateSelected =
    selectedDiffId === WORKSPACE_DIFF_ID && selectedWorkspacePath === undefined

  const branchName = status?.branch ?? task.branchName

  return (
    <div className="box-border min-w-0 max-w-full space-y-4 p-3">
      <button
        type="button"
        className={cn(
          'flex w-full min-w-0 items-center justify-between gap-2 rounded-md px-1 py-0.5 text-left transition-colors',
          hasGitChanges && 'hover:bg-accent/30',
          aggregateSelected && hasGitChanges && 'bg-accent/40',
        )}
        onClick={onOpenAllChanges}
        disabled={!hasGitChanges}
        title={branchName}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <HugeiconsIcon
            icon={GitBranchIcon}
            strokeWidth={2}
            className="size-3 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <span className="truncate font-mono text-[10px] text-foreground">{branchName}</span>
        </span>
        {status && !status.clean ? (
          <span className="inline-flex shrink-0 items-baseline gap-1 text-[10px] tabular-nums">
            <span className="text-muted-foreground">
              {status.summary.files} file{status.summary.files === 1 ? '' : 's'} ·
            </span>
            <DiffBadges
              additions={status.summary.insertions}
              deletions={status.summary.deletions}
            />
          </span>
        ) : (
          <span className="shrink-0 text-[10px] text-muted-foreground">Working tree clean</span>
        )}
      </button>

      {hasGitChanges ? (
        <ChangesCommitSection
          hasStagedChanges={stagedChanges.length > 0}
          committing={commit.isPending}
          onCommit={(message) => commit.mutate(message)}
        />
      ) : null}

      {diffs.length > 0 && (
        <ChangesCollapsibleSection title="Diffs" count={diffs.length} stickyStack={10}>
          <ul className="space-y-0.5">
            {diffs.map((diff) => (
              <li key={diff.id}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-auto w-full min-w-0 flex-col items-start gap-0.5 overflow-hidden px-2 py-1.5 text-left font-normal',
                    selectedDiffId === diff.id && 'bg-accent',
                  )}
                  onClick={() => onSelectDiff(diff.id)}
                >
                  <span className="w-full truncate text-xs font-medium" title={diff.title}>
                    {diff.title}
                  </span>
                  <span
                    className="w-full truncate text-[10px] text-muted-foreground"
                    title={diff.summary}
                  >
                    {diff.summary}
                  </span>
                </Button>
              </li>
            ))}
          </ul>
        </ChangesCollapsibleSection>
      )}

      {checks.length > 0 && (
        <ChangesCollapsibleSection title="Checks" count={checks.length} stickyStack={11}>
          <ul className="space-y-0.5">
            {checks.map((check) => (
              <li key={check.id}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-auto w-full min-w-0 items-center justify-between gap-2 overflow-hidden px-2 py-1.5 text-left font-normal',
                    selectedCheckId === check.id && 'bg-accent',
                  )}
                  onClick={() => onSelectCheck(check.id)}
                >
                  <span className="min-w-0 flex-1 truncate font-mono text-xs" title={check.command}>
                    {check.command}
                  </span>
                  <Badge
                    variant={check.passed ? 'outline' : 'destructive'}
                    className="shrink-0 text-[9px]"
                  >
                    {check.passed ? 'pass' : 'fail'}
                  </Badge>
                </Button>
              </li>
            ))}
          </ul>
        </ChangesCollapsibleSection>
      )}

      {gitQuery.isLoading ? (
        <p className="px-2 text-xs text-muted-foreground">Loading changes…</p>
      ) : null}

      {gitQuery.isError ? (
        <p className="px-2 text-xs text-destructive">Failed to load git status.</p>
      ) : null}

      {hasGitChanges ? (
        <div className="space-y-1">
          <ChangesCollapsibleSection
            title="Staged changes"
            count={stagedChanges.length}
            stickyStack={12}
            action={{
              label: 'Unstage all',
              disabled: stagedChanges.length === 0 || stagingBusy,
              onClick: handleUnstageAll,
            }}
          >
            {stagedChanges.length === 0 ? (
              <p className="mb-3 px-1 text-center text-xs text-muted-foreground">
                No staged changes
              </p>
            ) : (
              <div className="space-y-1">
                {stagedChanges.map((change) => (
                  <ChangeFileRow
                    key={`staged:${change.path}`}
                    change={change}
                    selected={selectedWorkspacePath === change.path}
                    onSelect={onOpenChangedFile}
                    onUnstage={(path) => unstage.mutate([path])}
                    staging={stagingBusy}
                  />
                ))}
              </div>
            )}
          </ChangesCollapsibleSection>

          <ChangesCollapsibleSection
            title="Unstaged changes"
            count={unstagedChanges.length}
            stickyStack={13}
            action={{
              label: 'Stage all',
              disabled: unstagedChanges.length === 0 || stagingBusy,
              onClick: handleStageAll,
            }}
          >
            {unstagedChanges.length === 0 ? (
              <p className="mb-3 px-1 text-center text-xs text-muted-foreground">
                No unstaged changes
              </p>
            ) : (
              <div className="space-y-1">
                {unstagedChanges.map((change) => (
                  <ChangeFileRow
                    key={`unstaged:${change.path}`}
                    change={change}
                    selected={selectedWorkspacePath === change.path}
                    onSelect={onOpenChangedFile}
                    onStage={(path) => stage.mutate([path])}
                    staging={stagingBusy}
                  />
                ))}
              </div>
            )}
          </ChangesCollapsibleSection>
        </div>
      ) : !hasFeedContent && !gitQuery.isLoading ? (
        <p className="px-2 text-center text-xs text-muted-foreground">
          No changes in this workspace yet.
        </p>
      ) : null}
    </div>
  )
}

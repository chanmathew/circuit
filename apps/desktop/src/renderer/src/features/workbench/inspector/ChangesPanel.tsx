import { Badge, Button, cn } from '@circuit/ui'

import type { TaskDto } from '../../../../../shared/api.js'
import { useGitStageMutations } from '../../../hooks/useGitStageMutations.js'
import { useWorkspaceGitStatus } from '../../../hooks/useWorkspaceGitStatus.js'
import type { CheckEntry, DiffEntry } from '../lib/workbench-content.js'
import { WORKSPACE_DIFF_ID } from '../lib/workbench-content.js'
import { ChangeFileRow } from './ChangeFileRow.js'
import { ChangesCommitSection } from './ChangesCommitSection.js'

export interface ChangesPanelProps {
  task: TaskDto
  diffs: DiffEntry[]
  checks: CheckEntry[]
  selectedDiffId?: string
  selectedCheckId?: string
  selectedWorkspacePath?: string
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
  onSelectDiff,
  onSelectCheck,
  onOpenChangedFile,
  onOpenAllChanges,
}: ChangesPanelProps): React.ReactElement {
  const gitQuery = useWorkspaceGitStatus(task.workspacePath)
  const { stage, unstage, commit } = useGitStageMutations(task.workspacePath)

  const status = gitQuery.data
  const stagedChanges = status?.changes.filter((change) => change.staged) ?? []
  const unstagedChanges = status?.changes.filter((change) => change.unstaged) ?? []
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

  return (
    <div className="space-y-4 p-2">
      <button
        type="button"
        className={cn(
          'w-full rounded-md border border-border bg-card px-2.5 py-2 text-left transition-colors',
          aggregateSelected ? 'ring-1 ring-primary/40' : 'hover:bg-accent/30',
        )}
        onClick={onOpenAllChanges}
        disabled={!hasGitChanges}
      >
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Branch
        </p>
        <p className="mt-0.5 font-mono text-xs">{status?.branch ?? task.branchName}</p>
        {status && !status.clean ? (
          <p className="mt-2 text-[10px] text-muted-foreground">
            {status.summary.files} file{status.summary.files === 1 ? '' : 's'} changed · +
            {status.summary.insertions} −{status.summary.deletions}
          </p>
        ) : (
          <p className="mt-2 text-[10px] text-muted-foreground">Working tree clean</p>
        )}
      </button>

      {diffs.length > 0 && (
        <section>
          <p className="mb-1 px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Diffs
          </p>
          <ul className="space-y-0.5">
            {diffs.map((diff) => (
              <li key={diff.id}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-auto w-full flex-col items-start gap-0.5 px-2 py-1.5 text-left font-normal',
                    selectedDiffId === diff.id && 'bg-accent',
                  )}
                  onClick={() => onSelectDiff(diff.id)}
                >
                  <span className="text-xs font-medium">{diff.title}</span>
                  <span className="text-[10px] text-muted-foreground">{diff.summary}</span>
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {checks.length > 0 && (
        <section>
          <p className="mb-1 px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Checks
          </p>
          <ul className="space-y-0.5">
            {checks.map((check) => (
              <li key={check.id}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-auto w-full items-center justify-between gap-2 px-2 py-1.5 text-left font-normal',
                    selectedCheckId === check.id && 'bg-accent',
                  )}
                  onClick={() => onSelectCheck(check.id)}
                >
                  <span className="truncate font-mono text-xs">{check.command}</span>
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
        </section>
      )}

      {gitQuery.isLoading ? (
        <p className="px-2 text-xs text-muted-foreground">Loading changes…</p>
      ) : null}

      {gitQuery.isError ? (
        <p className="px-2 text-xs text-destructive">Failed to load git status.</p>
      ) : null}

      {hasGitChanges ? (
        <>
          <section>
            <p className="mb-1 px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Staged changes
            </p>
            {stagedChanges.length === 0 ? (
              <p className="px-1 text-xs text-muted-foreground">No staged changes</p>
            ) : (
              <div className="space-y-0.5">
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
          </section>

          <section>
            <p className="mb-1 px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Unstaged changes
            </p>
            {unstagedChanges.length === 0 ? (
              <p className="px-1 text-xs text-muted-foreground">No unstaged changes</p>
            ) : (
              <div className="space-y-0.5">
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
          </section>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              disabled={unstagedChanges.length === 0 || stagingBusy}
              onClick={handleStageAll}
            >
              Stage all
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              disabled={stagedChanges.length === 0 || stagingBusy}
              onClick={handleUnstageAll}
            >
              Unstage all
            </Button>
          </div>

          <ChangesCommitSection
            hasStagedChanges={stagedChanges.length > 0}
            committing={commit.isPending}
            onCommit={(message) => commit.mutate(message)}
          />
        </>
      ) : !hasFeedContent && !gitQuery.isLoading ? (
        <p className="px-2 text-center text-xs text-muted-foreground">
          No changes in this workspace yet.
        </p>
      ) : null}
    </div>
  )
}

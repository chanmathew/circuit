import type { GitStatusDto } from '../../../../../shared/api.js'
import { DiffBadges } from '../../../lib/diff/DiffBadges.js'
import {
  DIFF_HEADER_ACTIONS_RAIL_CLASS,
  DiffHeaderCheckbox,
  DiffHeaderDiscardButton,
} from './lib/diff-header-actions.js'

export function DiffWorkspaceSummaryBar({
  gitStatus,
  allChangePaths,
  discardBusy,
  allScopedStaged,
  someScopedStaged,
  scopedChangesCount,
  stageAllLabel,
  onDiscardAll,
  onToggleStageAll,
}: {
  gitStatus: GitStatusDto
  allChangePaths: string[]
  discardBusy: boolean
  allScopedStaged: boolean
  someScopedStaged: boolean
  scopedChangesCount: number
  stageAllLabel: string
  onDiscardAll: () => void
  onToggleStageAll: () => void
}): React.ReactElement {
  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border py-2 pl-3 pr-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-sm text-foreground">
          {gitStatus.summary.files} uncommitted change
          {gitStatus.summary.files === 1 ? '' : 's'}
        </span>
        <DiffBadges
          additions={gitStatus.summary.insertions}
          deletions={gitStatus.summary.deletions}
        />
      </div>
      <div className={DIFF_HEADER_ACTIONS_RAIL_CLASS}>
        <DiffHeaderDiscardButton
          label="Discard all changes"
          disabled={discardBusy || allChangePaths.length === 0}
          onClick={onDiscardAll}
        />
        <DiffHeaderCheckbox
          checked={allScopedStaged}
          disabled={scopedChangesCount === 0}
          indeterminate={someScopedStaged}
          label={stageAllLabel}
          onChange={onToggleStageAll}
        />
      </div>
    </div>
  )
}

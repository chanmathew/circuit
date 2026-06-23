import { Checkbox, cn } from '@circuit/ui'
import { HugeiconsIcon } from '@hugeicons/react'
import { Delete02Icon } from '@hugeicons/core-free-icons'

import type { GitFileChangeDto } from '../../../../../shared/api.js'
import { DiffBadges } from '../../stream/DiffBadges.js'

export const DIFF_HEADER_LINK_CLASS =
  'shrink-0 text-[10px] text-primary hover:underline disabled:pointer-events-none disabled:opacity-50'

export const DIFF_HEADER_ICON_BUTTON_CLASS =
  'inline-flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent/40 hover:text-destructive disabled:pointer-events-none disabled:opacity-40'

/** Fixed-width rail so discard + checkbox align across the summary bar and file headers. */
export const DIFF_HEADER_ACTIONS_RAIL_CLASS =
  'inline-flex w-11 shrink-0 items-center justify-end gap-1.5'

export function DiffHeaderCheckbox({
  checked,
  disabled = false,
  indeterminate = false,
  label,
  onChange,
}: {
  checked: boolean
  disabled?: boolean
  indeterminate?: boolean
  label: string
  onChange: () => void
}): React.ReactElement {
  return (
    <Checkbox
      data-circuit-diff-action=""
      className={cn('size-3.5 rounded-[3px] after:hidden focus-visible:ring-2')}
      checked={indeterminate ? 'indeterminate' : checked}
      disabled={disabled}
      aria-label={label}
      title={label}
      onClick={(event) => event.stopPropagation()}
      onCheckedChange={() => onChange()}
    />
  )
}

export function DiffHeaderDiscardButton({
  label,
  disabled = false,
  onClick,
}: {
  label: string
  disabled?: boolean
  onClick: () => void
}): React.ReactElement {
  return (
    <button
      type="button"
      data-circuit-diff-action=""
      className={DIFF_HEADER_ICON_BUTTON_CLASS}
      disabled={disabled}
      aria-label={label}
      title={label}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onClick()
      }}
    >
      <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} className="size-3.5" aria-hidden />
    </button>
  )
}

export function DiffFileHeaderActions({
  onDiscard,
  onToggleStage,
  discardDisabled = false,
  change,
}: {
  onDiscard?: () => void
  onToggleStage?: () => void
  discardDisabled?: boolean
  change?: GitFileChangeDto
}): React.ReactElement | null {
  if (!onDiscard && !onToggleStage) return null

  const canDiscard = change != null
  const stagedChecked = change?.staged === true && change?.unstaged !== true
  const stagedIndeterminate = change?.staged === true && change?.unstaged === true
  const stageLabel = stagedChecked || stagedIndeterminate
    ? `Unstage ${change?.path ?? 'file'}`
    : `Stage ${change?.path ?? 'file'}`

  return (
    <>
      {change ? (
        <span
          data-circuit-diff-counts=""
          className="inline-flex shrink-0 items-center"
        >
          <DiffBadges additions={change.insertions} deletions={change.deletions} />
        </span>
      ) : null}
      <span
        data-circuit-diff-actions=""
        className="ml-auto inline-flex shrink-0 items-center"
      >
        <span className={DIFF_HEADER_ACTIONS_RAIL_CLASS}>
          {onDiscard ? (
            <DiffHeaderDiscardButton
              label="Discard file"
              disabled={discardDisabled || !canDiscard}
              onClick={onDiscard}
            />
          ) : null}
          {onToggleStage && change ? (
            <DiffHeaderCheckbox
              checked={stagedChecked}
              indeterminate={stagedIndeterminate}
              label={stageLabel}
              onChange={onToggleStage}
            />
          ) : null}
        </span>
      </span>
    </>
  )
}

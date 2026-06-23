import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PatchDiff, type PatchDiffProps } from '@pierre/diffs/react'
import { cn } from '@circuit/ui'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowDown01Icon } from '@hugeicons/core-free-icons'

import type { GitFileChangeDto } from '../../../../../shared/api.js'
import { DiffFileHeaderActions, DIFF_HEADER_ICON_BUTTON_CLASS } from './lib/diff-header-actions.js'
import { mountPierreDiffHeader, unmountPierreDiffHeader } from './lib/pierre-diff-header.js'

type PierreDiffOptions = NonNullable<PatchDiffProps<undefined>['options']>

type CollapsiblePatchDiffProps = Pick<PatchDiffProps<undefined>, 'patch' | 'disableWorkerPool'> &
  Partial<Pick<PatchDiffProps<undefined>, 'className' | 'style'>> & {
    options: PierreDiffOptions
    filePath?: string
    fileChange?: GitFileChangeDto
    discardDisabled?: boolean
    focusPath?: string
    onToggleStage?: (path: string) => void
    onDiscardFile?: (path: string) => void
  }

function DiffHeaderChevron({
  open,
  onToggle,
}: {
  open: boolean
  onToggle: () => void
}): React.ReactElement {
  return (
    <button
      type="button"
      className={cn(DIFF_HEADER_ICON_BUTTON_CLASS, 'hover:text-foreground')}
      aria-expanded={open}
      aria-label={open ? 'Collapse diff' : 'Expand diff'}
      onClick={(event) => {
        event.stopPropagation()
        onToggle()
      }}
    >
      <HugeiconsIcon
        icon={ArrowDown01Icon}
        strokeWidth={2}
        className={cn('size-3 transition-transform', !open && '-rotate-90')}
        aria-hidden
      />
    </button>
  )
}

export function CollapsiblePatchDiff({
  patch,
  options,
  filePath,
  fileChange,
  discardDisabled = false,
  focusPath,
  onToggleStage,
  onDiscardFile,
  disableWorkerPool,
  className,
  style,
}: CollapsiblePatchDiffProps): React.ReactElement {
  const [open, setOpen] = useState(true)
  const toggle = useCallback(() => setOpen((value) => !value), [])
  const toggleRef = useRef(toggle)
  toggleRef.current = toggle

  useEffect(() => {
    if (focusPath != null && filePath != null && focusPath === filePath) {
      setOpen(true)
    }
  }, [filePath, focusPath])

  const showGitActions = filePath != null && (onToggleStage != null || onDiscardFile != null)

  const mergedOptions = useMemo(() => {
    const baseOnPostRender = options.onPostRender

    return {
      ...options,
      onPostRender(
        node: HTMLElement,
        instance: Parameters<NonNullable<PierreDiffOptions['onPostRender']>>[1],
        phase: Parameters<NonNullable<PierreDiffOptions['onPostRender']>>[2],
      ) {
        if (phase === 'unmount') {
          unmountPierreDiffHeader(node)
          baseOnPostRender?.(node, instance, phase)
          return
        }

        baseOnPostRender?.(node, instance, phase)
        mountPierreDiffHeader(node, {
          markPatchHost: true,
          onToggleCollapse: () => toggleRef.current(),
        })
      },
    }
  }, [options])

  const renderHeaderPrefix = useCallback(
    () => <DiffHeaderChevron open={open} onToggle={toggle} />,
    [open, toggle],
  )

  const renderHeaderMetadata = useCallback(() => {
    if (!showGitActions || !filePath) return null

    return (
      <DiffFileHeaderActions
        change={fileChange}
        discardDisabled={discardDisabled}
        onToggleStage={onToggleStage ? () => onToggleStage(filePath) : undefined}
        onDiscard={onDiscardFile ? () => onDiscardFile(filePath) : undefined}
      />
    )
  }, [discardDisabled, fileChange, filePath, onDiscardFile, onToggleStage, showGitActions])

  return (
    <PatchDiff
      patch={patch}
      options={{ ...mergedOptions, collapsed: !open }}
      disableWorkerPool={disableWorkerPool}
      className={className}
      style={style}
      renderHeaderPrefix={renderHeaderPrefix}
      renderHeaderMetadata={showGitActions ? renderHeaderMetadata : undefined}
    />
  )
}

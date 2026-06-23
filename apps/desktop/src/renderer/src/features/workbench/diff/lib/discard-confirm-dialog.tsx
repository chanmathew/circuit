import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@circuit/ui'

import type { GitFileChangeDto } from '../../../../../shared/api.js'

export interface PendingDiscard {
  paths: string[]
}

export function buildDiscardConfirmCopy(
  paths: string[],
  changes: readonly GitFileChangeDto[],
): { title: string; description: string } {
  const changeByPath = new Map(changes.map((change) => [change.path, change]))
  const untrackedCount = paths.filter(
    (path) => changeByPath.get(path)?.status === 'untracked',
  ).length

  if (paths.length > 1) {
    const untrackedNote =
      untrackedCount > 0
        ? ` ${untrackedCount} untracked file${untrackedCount === 1 ? '' : 's'} will be permanently deleted.`
        : ''
    return {
      title: 'Discard all changes?',
      description: `This will revert changes in ${paths.length} files.${untrackedNote} This cannot be undone.`,
    }
  }

  const path = paths[0] ?? 'file'
  const change = changeByPath.get(path)
  if (change?.status === 'untracked') {
    return {
      title: 'Delete untracked file?',
      description: `"${path}" will be permanently deleted. This cannot be undone.`,
    }
  }

  return {
    title: 'Discard changes?',
    description: `Changes in "${path}" will be permanently reverted. This cannot be undone.`,
  }
}

export function DiscardConfirmDialog({
  pending,
  busy = false,
  error = null,
  changes,
  onCancel,
  onConfirm,
}: {
  pending: PendingDiscard | null
  busy?: boolean
  error?: string | null
  changes: readonly GitFileChangeDto[]
  onCancel: () => void
  onConfirm: () => void
}): React.ReactElement {
  const copy = pending ? buildDiscardConfirmCopy(pending.paths, changes) : null

  return (
    <Dialog
      open={pending != null}
      onOpenChange={(open) => {
        if (!open && !busy) onCancel()
      }}
    >
      <DialogContent showCloseButton={!busy}>
        <DialogHeader>
          <DialogTitle>{copy?.title ?? 'Discard changes?'}</DialogTitle>
          <DialogDescription>{copy?.description}</DialogDescription>
        </DialogHeader>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter>
          <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" disabled={busy} onClick={onConfirm}>
            {busy ? 'Discarding…' : 'Discard'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

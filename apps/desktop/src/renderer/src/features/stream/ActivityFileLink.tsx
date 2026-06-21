import type { MouseEvent } from 'react'
import type { ReferenceTarget } from '@circuit/protocol'

export interface ActivityFileLinkProps {
  filePath: string
  fileName: string
  openAs?: 'file' | 'diff'
  onOpenReference?: (target: ReferenceTarget) => void
  onOpenChangedFile?: (path: string) => void
}

/** Clickable filename that opens the file or diff in the workbench. */
export function ActivityFileLink({
  filePath,
  fileName,
  openAs = 'file',
  onOpenReference,
  onOpenChangedFile,
}: ActivityFileLinkProps): React.ReactElement {
  if (!onOpenReference && !onOpenChangedFile) {
    return <span className="truncate font-medium text-foreground/80">{fileName}</span>
  }

  const handleClick = (event: MouseEvent): void => {
    event.stopPropagation()
    if (openAs === 'diff' && onOpenChangedFile) {
      onOpenChangedFile(filePath)
      return
    }
    onOpenReference?.({ type: 'file', path: filePath })
  }

  return (
    <button
      type="button"
      className="shrink-0 truncate font-medium text-foreground/80 underline decoration-transparent underline-offset-2 hover:text-foreground hover:decoration-current"
      onClick={handleClick}
    >
      {fileName}
    </button>
  )
}

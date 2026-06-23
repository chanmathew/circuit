import { Button } from '@circuit/ui'
import { cn } from '@circuit/ui/utils'
import { HugeiconsIcon } from '@hugeicons/react'
import { PanelLeftCloseIcon, PanelLeftOpenIcon } from '@hugeicons/core-free-icons'
import type React from 'react'

import { PANEL_TOGGLE_BUTTON_CLASS } from './chrome-row.js'

export interface ProjectSidebarToggleProps {
  open: boolean
  onToggle: () => void
  className?: string
}

export function ProjectSidebarToggle({
  open,
  onToggle,
  className,
}: ProjectSidebarToggleProps): React.ReactElement {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className={cn(PANEL_TOGGLE_BUTTON_CLASS, className)}
      aria-label={open ? 'Hide project sidebar' : 'Show project sidebar'}
      aria-pressed={open}
      onClick={onToggle}
    >
      {open ? (
        <HugeiconsIcon icon={PanelLeftCloseIcon} strokeWidth={2} className="size-4" aria-hidden />
      ) : (
        <HugeiconsIcon icon={PanelLeftOpenIcon} strokeWidth={2} className="size-4" aria-hidden />
      )}
    </Button>
  )
}

import { Button } from '@circuit/ui'
import { cn } from '@circuit/ui/utils'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
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
        <PanelLeftClose className="size-4" aria-hidden />
      ) : (
        <PanelLeftOpen className="size-4" aria-hidden />
      )}
    </Button>
  )
}

import { Button } from '@circuit/ui'
import { cn } from '@circuit/ui/utils'
import { PanelRightClose, PanelRightOpen } from 'lucide-react'
import type React from 'react'

import { PANEL_TOGGLE_BUTTON_CLASS } from '../../app/layout/chrome-row.js'

/** Fixed inspector tab header height — matches shared chrome row. */
export const INSPECTOR_HEADER_ROW_CLASS = 'h-10'

export interface InspectorPanelToggleProps {
  open: boolean
  onToggle: () => void
  className?: string
}

export function InspectorPanelToggle({
  open,
  onToggle,
  className,
}: InspectorPanelToggleProps): React.ReactElement {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className={cn(PANEL_TOGGLE_BUTTON_CLASS, className)}
      aria-label={open ? 'Hide inspector panel' : 'Show inspector panel'}
      aria-pressed={open}
      onClick={onToggle}
    >
      {open ? (
        <PanelRightClose className="size-4" aria-hidden />
      ) : (
        <PanelRightOpen className="size-4" aria-hidden />
      )}
    </Button>
  )
}

import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@circuit/ui'
import { cn } from '@circuit/ui/utils'
import type { InspectorTab } from '@circuit/protocol'
import { PanelRightClose, PanelRightOpen } from 'lucide-react'
import type React from 'react'

import { INSPECTOR_TABS } from './lib/inspector-tabs.js'

/** Fixed inspector tab header height — keeps expand/collapse toggle at the same Y. */
export const INSPECTOR_HEADER_ROW_CLASS = 'h-10'

/** Shared toggle placement — same margin/size in expanded header and collapsed rail. */
export const INSPECTOR_TOGGLE_BUTTON_CLASS = 'mr-1 shrink-0'

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
      className={cn('size-7 shrink-0 text-muted-foreground', className)}
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

/** Narrow inspector rail shown when the panel is collapsed — lives in panel chrome, not over content. */
export function CollapsedInspectorStrip({
  activeTab,
  onToggle,
  onTabSelect,
}: {
  activeTab: InspectorTab
  onToggle: () => void
  onTabSelect: (tab: InspectorTab) => void
}): React.ReactElement {
  return (
    <div className="flex h-full w-full shrink-0 flex-col items-center border-l border-border bg-card/50">
      <div className={cn('flex w-full items-center justify-center', INSPECTOR_HEADER_ROW_CLASS)}>
        <InspectorPanelToggle open={false} onToggle={onToggle} />
      </div>
      <nav
        aria-label="Inspector sections"
        className="flex w-full flex-col items-center gap-0.5 pb-2"
      >
        {INSPECTOR_TABS.map(({ value, label, icon: Icon }) => {
          const isActive = activeTab === value
          return (
            <Tooltip key={value}>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className={cn(
                    'size-8 shrink-0 text-muted-foreground hover:text-foreground',
                    isActive && 'bg-accent text-foreground',
                  )}
                  aria-label={label}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => onTabSelect(value)}
                >
                  <Icon className="size-4" aria-hidden />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">{label}</TooltipContent>
            </Tooltip>
          )
        })}
      </nav>
    </div>
  )
}

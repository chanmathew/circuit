import { cn } from '@circuit/ui'
import { PanelResizeHandle } from 'react-resizable-panels'

export function LayoutPanelResizeHandle({ className }: { className?: string }): React.ReactElement {
  return (
    <PanelResizeHandle
      className={cn(
        'group relative flex w-px items-center justify-center bg-border',
        'after:absolute after:inset-y-0 after:-left-1 after:-right-1 after:content-[""]',
        'data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full',
        'data-[panel-group-direction=vertical]:after:inset-x-0 data-[panel-group-direction=vertical]:after:-top-1 data-[panel-group-direction=vertical]:after:-bottom-1',
        className,
      )}
    >
      <span className="z-10 h-8 w-0.5 rounded-full bg-border transition-colors group-hover:bg-primary/40 group-active:bg-primary/60" />
    </PanelResizeHandle>
  )
}

import { cn } from '@circuit/ui/utils'

import { InspectorPanelToggle } from '../../features/workbench/InspectorPanelToggle.js'
import {
  CHROME_CONTROL_WRAPPER_CLASS,
  CHROME_DRAG_STYLE,
  CHROME_END_INSET,
  CHROME_MAC_INSET,
  CHROME_NO_DRAG_STYLE,
  CHROME_ROW_CLASS,
} from './chrome-row.js'
import { ProjectSidebarToggle } from './ProjectSidebarToggle.js'
import { useSidebar } from './sidebar-context.js'
import { toggleMaximizeOnDoubleClick, WindowControls } from './WindowControls.js'
import { useWindowState } from './useWindowState.js'

export interface TitleBarProps {
  /** When false, Win/Linux controls render elsewhere (e.g. inspector header). */
  showWindowControls?: boolean
  /** True when the bar spans from the window's left edge (prototype / full-width chrome). */
  insetTrafficLights?: boolean
  /** Inspector panel — expand toggle shown here when collapsed. */
  inspectorOpen?: boolean
  onToggleInspector?: () => void
}

export function TitleBar({
  showWindowControls = true,
  insetTrafficLights = false,
  inspectorOpen,
  onToggleInspector,
}: TitleBarProps): React.ReactElement {
  const sidebar = useSidebar()
  const windowState = useWindowState()
  const isMac = windowState?.platform === 'darwin'
  const renderWindowControls = showWindowControls && windowState != null && !isMac
  const showSidebarExpand = sidebar != null && !sidebar.open
  const showInspectorExpand = onToggleInspector != null && !inspectorOpen
  const alignWithWindowEdge = insetTrafficLights || showSidebarExpand

  return (
    <header
      className={cn(
        CHROME_ROW_CLASS,
        CHROME_END_INSET,
        alignWithWindowEdge && isMac
          ? CHROME_MAC_INSET
          : showSidebarExpand
            ? 'pl-2'
            : insetTrafficLights
              ? CHROME_MAC_INSET
              : undefined,
      )}
      style={CHROME_DRAG_STYLE}
      onDoubleClick={renderWindowControls ? toggleMaximizeOnDoubleClick : undefined}
    >
      {showSidebarExpand ? (
        <div className={CHROME_CONTROL_WRAPPER_CLASS} style={CHROME_NO_DRAG_STYLE}>
          <ProjectSidebarToggle open={false} onToggle={sidebar.toggle} />
        </div>
      ) : null}
      {showInspectorExpand || renderWindowControls ? (
        <div
          className={cn(CHROME_CONTROL_WRAPPER_CLASS, 'ml-auto gap-0')}
          style={CHROME_NO_DRAG_STYLE}
        >
          {showInspectorExpand ? (
            <InspectorPanelToggle open={false} onToggle={onToggleInspector} />
          ) : null}
          {renderWindowControls ? <WindowControls /> : null}
        </div>
      ) : null}
    </header>
  )
}

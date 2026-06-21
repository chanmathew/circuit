import { cn } from '@circuit/ui/utils'

import {
  CHROME_CONTROL_WRAPPER_CLASS,
  CHROME_DRAG_STYLE,
  CHROME_END_INSET,
  CHROME_MAC_INSET,
  CHROME_NO_DRAG_STYLE,
  CHROME_ROW_CLASS,
} from './chrome-row.js'
import { ProjectSidebarToggle } from './ProjectSidebarToggle.js'
import { useWindowState } from './useWindowState.js'

export interface SidebarTopChromeProps {
  onToggle: () => void
}

/** Top row of the project sidebar — traffic-light clearance, collapse toggle, drag region. */
export function SidebarTopChrome({ onToggle }: SidebarTopChromeProps): React.ReactElement {
  const windowState = useWindowState()
  const isMac = windowState?.platform === 'darwin'

  return (
    <div
      className={cn(CHROME_ROW_CLASS, CHROME_END_INSET, isMac ? CHROME_MAC_INSET : 'pl-2')}
      style={CHROME_DRAG_STYLE}
    >
      <div className={CHROME_CONTROL_WRAPPER_CLASS} style={CHROME_NO_DRAG_STYLE}>
        <ProjectSidebarToggle open onToggle={onToggle} />
      </div>
    </div>
  )
}

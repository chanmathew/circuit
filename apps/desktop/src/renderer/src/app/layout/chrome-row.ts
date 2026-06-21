import type { CSSProperties } from 'react'

import { CHROME_ROW_HEIGHT_PX } from '../../../../shared/window-chrome.js'

/** Re-export for renderer consumers documenting chrome row height. */
export { CHROME_ROW_HEIGHT_PX }

/** Shared top chrome row — one height, flex-centered children everywhere. */
export const CHROME_ROW_CLASS = `flex h-10 shrink-0 items-center border-b border-border bg-card`

/** macOS traffic-light clearance — leaves room for native window controls. */
export const CHROME_MAC_INSET = 'pl-[78px]'

/** Right inset for panel toggles and window controls. */
export const CHROME_END_INSET = 'pr-2'

/** Chrome controls span the full row height so icons share one vertical center line. */
export const CHROME_CONTROL_CLASS = '!h-10 shrink-0 text-muted-foreground'

/** Panel collapse/expand buttons — full row height, icon centered inside. */
export const PANEL_TOGGLE_BUTTON_CLASS = `${CHROME_CONTROL_CLASS} !w-8 min-w-8 rounded-none px-0`

/** Apply to the full chrome row; mark interactive children with CHROME_NO_DRAG_STYLE. */
export const CHROME_DRAG_STYLE = { WebkitAppRegion: 'drag' } as CSSProperties

export const CHROME_NO_DRAG_STYLE = { WebkitAppRegion: 'no-drag' } as CSSProperties

/** Wrapper for chrome-row controls — inherits row height, centers icon. */
export const CHROME_CONTROL_WRAPPER_CLASS = 'flex h-10 shrink-0 items-center justify-center'

/** Title bar row height in px — used by renderer chrome rows and main-process traffic light placement. */
export const CHROME_ROW_HEIGHT_PX = 40

/** Approximate macOS traffic-light diameter for layout math. */
export const MACOS_TRAFFIC_LIGHT_SIZE_PX = 12

export const MACOS_TRAFFIC_LIGHT_X = 16

/**
 * Electron `trafficLightPosition.y` for `titleBarStyle: 'hiddenInset'` with a 40px chrome row.
 *
 * Naive vertical centering `(rowHeight - lightSize) / 2` yields 14, but hiddenInset traffic
 * lights render visually low relative to flex-centered HTML controls — tune y upward in the row
 * by lowering this value.
 */
export const MACOS_TRAFFIC_LIGHT_Y = 12

export const macOSTrafficLightPosition = {
  x: MACOS_TRAFFIC_LIGHT_X,
  y: MACOS_TRAFFIC_LIGHT_Y,
} as const

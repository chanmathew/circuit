import { BrowserWindow } from 'electron'

import type { TaskStreamUpdate } from '../../shared/api.js'
import { TASK_STREAM_UPDATE_CHANNEL } from '../../shared/channels.js'

export { TASK_STREAM_UPDATE_CHANNEL }

export function broadcastTaskStreamUpdate(update: TaskStreamUpdate): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (window.isDestroyed()) continue
    window.webContents.send(TASK_STREAM_UPDATE_CHANNEL, update)
  }
}

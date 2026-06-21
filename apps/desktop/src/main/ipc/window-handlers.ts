import { BrowserWindow, ipcMain } from 'electron'

import type { WindowState } from '../../shared/api.js'

function getWindowFromEvent(event: Electron.IpcMainInvokeEvent): BrowserWindow {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win) {
    throw new Error('No window found for IPC sender')
  }
  return win
}

function toWindowState(win: BrowserWindow): WindowState {
  return {
    platform: process.platform,
    isMaximized: win.isMaximized(),
  }
}

export function registerWindowHandlers(): void {
  ipcMain.handle('circuit:window:getState', (event) => {
    return toWindowState(getWindowFromEvent(event))
  })

  ipcMain.handle('circuit:window:minimize', (event) => {
    getWindowFromEvent(event).minimize()
  })

  ipcMain.handle('circuit:window:toggleMaximize', (event) => {
    const win = getWindowFromEvent(event)
    if (win.isMaximized()) {
      win.unmaximize()
    } else {
      win.maximize()
    }
  })

  ipcMain.handle('circuit:window:close', (event) => {
    getWindowFromEvent(event).close()
  })
}

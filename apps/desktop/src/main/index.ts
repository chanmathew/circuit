import { app, BrowserWindow, Menu, shell } from 'electron'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { closeDb, initDb } from './db.js'
import { getActiveAgentAdapterName } from './features/workflow/adapter.js'
import { registerIpcHandlers } from './ipc/handlers.js'
import { macOSTrafficLightPosition } from '../shared/window-chrome.js'

const isDev = !app.isPackaged
const mainDir = fileURLToPath(new URL('.', import.meta.url))

function createWindow(): void {
  const isMac = process.platform === 'darwin'

  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: 'Circuit',
    ...(isMac
      ? {
          titleBarStyle: 'hiddenInset' as const,
          trafficLightPosition: macOSTrafficLightPosition,
        }
      : {
          frame: false,
        }),
    webPreferences: {
      preload: join(mainDir, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    void shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void mainWindow.loadFile(join(mainDir, '../renderer/index.html'))
  }
}

void app.whenReady().then(() => {
  Menu.setApplicationMenu(null)
  initDb()
  registerIpcHandlers()
  console.info(`[circuit] agent adapter: ${getActiveAgentAdapterName()}`)
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  closeDb()
})

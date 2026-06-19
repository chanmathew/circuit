import { contextBridge, ipcRenderer } from 'electron'

export interface CircuitApi {
  ping: () => Promise<string>
}

const circuitApi: CircuitApi = {
  ping: () => ipcRenderer.invoke('circuit:ping'),
}

contextBridge.exposeInMainWorld('circuit', circuitApi)

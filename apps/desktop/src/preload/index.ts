import { contextBridge, ipcRenderer } from 'electron'

import type { CircuitApi } from '../shared/api.js'

const circuitApi: CircuitApi = {
  ping: () => ipcRenderer.invoke('circuit:ping'),
  listRepos: () => ipcRenderer.invoke('circuit:repos:list'),
  addRepo: (path?: string) => ipcRenderer.invoke('circuit:repos:add', path),
  listTasks: (request) => ipcRenderer.invoke('circuit:tasks:list', request),
  createTask: (request) => ipcRenderer.invoke('circuit:tasks:create', request),
  getTask: (taskId) => ipcRenderer.invoke('circuit:tasks:get', taskId),
  runPhase: (request) => ipcRenderer.invoke('circuit:tasks:runPhase', request),
  approvePhase: (request) => ipcRenderer.invoke('circuit:tasks:approvePhase', request),
  requestPhaseRevision: (request) => ipcRenderer.invoke('circuit:tasks:requestRevision', request),
}

contextBridge.exposeInMainWorld('circuit', circuitApi)

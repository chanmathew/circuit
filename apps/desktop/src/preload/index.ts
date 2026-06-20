import { contextBridge, ipcRenderer } from 'electron'

import { TASK_STREAM_UPDATE_CHANNEL } from '../shared/channels.js'
import type { CircuitApi, TaskStreamUpdate } from '../shared/api.js'

const circuitApi: CircuitApi = {
  ping: () => ipcRenderer.invoke('circuit:ping'),
  getAppConfig: () => ipcRenderer.invoke('circuit:app:getConfig'),
  listRepos: () => ipcRenderer.invoke('circuit:repos:list'),
  addRepo: (path?: string) => ipcRenderer.invoke('circuit:repos:add', path),
  listTasks: (request) => ipcRenderer.invoke('circuit:tasks:list', request),
  createTask: (request) => ipcRenderer.invoke('circuit:tasks:create', request),
  createDraftTask: (request) => ipcRenderer.invoke('circuit:tasks:createDraft', request),
  createTaskFromIntake: (request) =>
    ipcRenderer.invoke('circuit:tasks:createFromIntake', request),
  submitTaskIntake: (request) => ipcRenderer.invoke('circuit:tasks:submitIntake', request),
  sendChatMessage: (request) => ipcRenderer.invoke('circuit:tasks:sendChatMessage', request),
  getTask: (taskId) => ipcRenderer.invoke('circuit:tasks:get', taskId),
  runPhase: (request) => ipcRenderer.invoke('circuit:tasks:runPhase', request),
  approvePhase: (request) => ipcRenderer.invoke('circuit:tasks:approvePhase', request),
  requestPhaseRevision: (request) => ipcRenderer.invoke('circuit:tasks:requestRevision', request),
  resolveDecision: (request) => ipcRenderer.invoke('circuit:tasks:resolveDecision', request),
  recordSteering: (request) => ipcRenderer.invoke('circuit:tasks:recordSteering', request),
  applySteeringRevision: (request) =>
    ipcRenderer.invoke('circuit:tasks:applySteeringRevision', request),
  replyPermission: (request) => ipcRenderer.invoke('circuit:tasks:replyPermission', request),
  replyQuestion: (request) => ipcRenderer.invoke('circuit:tasks:replyQuestion', request),
  rejectQuestion: (request) => ipcRenderer.invoke('circuit:tasks:rejectQuestion', request),
  abortSession: (request) => ipcRenderer.invoke('circuit:tasks:abortSession', request),
  onTaskStreamUpdate: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, update: TaskStreamUpdate) => {
      callback(update)
    }
    ipcRenderer.on(TASK_STREAM_UPDATE_CHANNEL, handler)
    return () => {
      ipcRenderer.removeListener(TASK_STREAM_UPDATE_CHANNEL, handler)
    }
  },
}

contextBridge.exposeInMainWorld('circuit', circuitApi)

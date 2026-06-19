import { dialog, ipcMain } from 'electron'

import { CircuitError } from '@circuit/shared'

import {
  toRepoDto,
  toTaskDto,
  type CreateTaskRequest,
  type ListTasksRequest,
} from '../../shared/api.js'
import { registerRepo, listRegisteredRepos } from '../services/repos.js'
import { createTask, getTaskDetail, listAllTasks } from '../services/tasks.js'

function toIpcError(error: unknown): Error {
  if (error instanceof CircuitError) {
    return error
  }

  if (error instanceof Error) {
    return error
  }

  return new Error(String(error))
}

export function registerIpcHandlers(): void {
  ipcMain.handle('circuit:repos:list', () => {
    try {
      return listRegisteredRepos().map(toRepoDto)
    } catch (error) {
      throw toIpcError(error)
    }
  })

  ipcMain.handle('circuit:repos:add', async (_event, requestedPath?: string) => {
    try {
      let repoPath = requestedPath

      if (!repoPath) {
        const result = await dialog.showOpenDialog({
          properties: ['openDirectory'],
          title: 'Select a git repository',
        })

        if (result.canceled || result.filePaths.length === 0) {
          return null
        }

        repoPath = result.filePaths[0]
      }

      const repo = await registerRepo(repoPath)
      return toRepoDto(repo)
    } catch (error) {
      throw toIpcError(error)
    }
  })

  ipcMain.handle('circuit:tasks:list', (_event, request?: ListTasksRequest) => {
    try {
      return listAllTasks(request?.repoId).map(toTaskDto)
    } catch (error) {
      throw toIpcError(error)
    }
  })

  ipcMain.handle('circuit:tasks:create', (_event, request: CreateTaskRequest) => {
    try {
      const task = createTask(request)
      return toTaskDto(task)
    } catch (error) {
      throw toIpcError(error)
    }
  })

  ipcMain.handle('circuit:tasks:get', (_event, taskId: string) => {
    try {
      return toTaskDto(getTaskDetail(taskId))
    } catch (error) {
      throw toIpcError(error)
    }
  })
}

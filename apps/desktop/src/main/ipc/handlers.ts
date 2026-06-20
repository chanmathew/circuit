import { dialog, ipcMain } from 'electron'

import { CircuitError } from '@circuit/shared'

import {
  toRepoDto,
  toTaskDto,
  toTaskSummaryDto,
  type ApprovePhaseRequest,
  type CreateTaskRequest,
  type ListTasksRequest,
  type RequestPhaseRevisionRequest,
  type RunPhaseRequest,
} from '../../shared/api.js'
import { registerRepo, listRegisteredRepos } from '../services/repos.js'
import { createTask, getTaskDetail, listAllTasks } from '../services/tasks.js'
import {
  approvePhase,
  autoRunOnTaskCreate,
  requestPhaseRevision,
  runPhase,
} from '../services/workflow-runner.js'

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
  ipcMain.handle('circuit:ping', () => 'pong')

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
      return listAllTasks(request?.repoId).map(toTaskSummaryDto)
    } catch (error) {
      throw toIpcError(error)
    }
  })

  ipcMain.handle('circuit:tasks:create', async (_event, request: CreateTaskRequest) => {
    try {
      const task = createTask(request)
      await autoRunOnTaskCreate(task.id)
      return toTaskDto(getTaskDetail(task.id))
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

  ipcMain.handle('circuit:tasks:runPhase', async (_event, request: RunPhaseRequest) => {
    try {
      const detail = await runPhase(request.taskId, request.phaseName)
      return toTaskDto(detail)
    } catch (error) {
      throw toIpcError(error)
    }
  })

  ipcMain.handle('circuit:tasks:approvePhase', async (_event, request: ApprovePhaseRequest) => {
    try {
      const detail = await approvePhase(request.taskId, request.phaseName)
      return toTaskDto(detail)
    } catch (error) {
      throw toIpcError(error)
    }
  })

  ipcMain.handle(
    'circuit:tasks:requestRevision',
    async (_event, request: RequestPhaseRevisionRequest) => {
      try {
        const detail = requestPhaseRevision(request.taskId, request.phaseName, request.note)
        return toTaskDto(detail)
      } catch (error) {
        throw toIpcError(error)
      }
    },
  )
}

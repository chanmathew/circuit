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
  type ResolveDecisionRequest,
  type RunPhaseRequest,
  type RecordSteeringRequest,
  type ApplySteeringRevisionRequest,
} from '../../shared/api.js'
import { registerRepo, listRegisteredRepos } from '../services/repos.js'
import { resolveDecision } from '../services/decisions.js'
import { createTask, getTaskDetail, listAllTasks } from '../services/tasks.js'
import { applySteeringRevision, recordSteering } from '../services/workflow-events.js'
import {
  approvePhase,
  autoRunOnTaskCreate,
  getActiveAgentAdapterName,
  requestPhaseRevision,
  runPhase,
} from '../features/workflow/index.js'

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

  ipcMain.handle('circuit:app:getConfig', () => ({
    agentAdapter: getActiveAgentAdapterName(),
  }))

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

  ipcMain.handle('circuit:tasks:resolveDecision', async (_event, request: ResolveDecisionRequest) => {
    try {
      const detail = resolveDecision(
        request.taskId,
        request.phase,
        request.decisionId,
        request.optionId,
        request.optionLabel,
      )
      return toTaskDto(detail)
    } catch (error) {
      throw toIpcError(error)
    }
  })

  ipcMain.handle('circuit:tasks:recordSteering', (_event, request: RecordSteeringRequest) => {
    try {
      return toTaskDto(recordSteering(request.taskId, request.text))
    } catch (error) {
      throw toIpcError(error)
    }
  })

  ipcMain.handle(
    'circuit:tasks:applySteeringRevision',
    (_event, request: ApplySteeringRevisionRequest) => {
      try {
        return toTaskDto(
          applySteeringRevision(request.taskId, {
            affectedPhase: request.affectedPhase,
            optionId: request.optionId,
            stalePhases: request.stalePhases,
            steeringText: request.steeringText,
          }),
        )
      } catch (error) {
        throw toIpcError(error)
      }
    },
  )
}

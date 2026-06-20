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
  type SendChatMessageRequest,
  type AbortSessionRequest,
  type ApplySteeringRevisionRequest,
  type CreateDraftTaskRequest,
  type CreateTaskFromIntakeRequest,
  type ReplyPermissionRequest,
  type ReplyQuestionRequest,
  type RejectQuestionRequest,
  type SubmitTaskIntakeRequest,
} from '../../shared/api.js'
import { registerRepo, listRegisteredRepos } from '../services/repos.js'
import { resolveDecision } from '../services/decisions.js'
import { createTask, createDraftTask, getTaskDetail, listAllTasks } from '../services/tasks.js'
import { applySteeringRevision, recordSteering } from '../services/workflow-events.js'
import {
  approvePhase,
  getActiveAgentAdapterName,
  requestPhaseRevision,
  createTaskFromIntake,
  scheduleAutoRunOnTaskCreate,
  schedulePhaseRun,
  sendChatMessage,
  submitTaskIntake,
} from '../features/workflow/index.js'
import { replyHarnessPermission } from '../features/workflow/reply-permission.js'
import { replyHarnessQuestion } from '../features/workflow/reply-question.js'
import { rejectHarnessQuestion } from '../features/workflow/reject-question.js'
import { abortSession } from '../features/workflow/abort-session.js'
import { requireHarnessSessionForTask } from '../features/workflow/require-harness-session.js'
import { requireTaskWorkspacePath } from '../features/workflow/require-task-workspace.js'

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

  ipcMain.handle('circuit:tasks:create', (_event, request: CreateTaskRequest) => {
    try {
      const task = createTask(request)
      scheduleAutoRunOnTaskCreate(task.id)
      return toTaskDto(getTaskDetail(task.id))
    } catch (error) {
      throw toIpcError(error)
    }
  })

  ipcMain.handle('circuit:tasks:createDraft', (_event, request: CreateDraftTaskRequest) => {
    try {
      const task = createDraftTask(request.repoId)
      return toTaskDto(task)
    } catch (error) {
      throw toIpcError(error)
    }
  })

  ipcMain.handle(
    'circuit:tasks:createFromIntake',
    (_event, request: CreateTaskFromIntakeRequest) => {
      try {
        const task = createTaskFromIntake(
          request.repoId,
          request.text,
          request.mode ?? 'chat',
        )
        return toTaskDto(task)
      } catch (error) {
        throw toIpcError(error)
      }
    },
  )

  ipcMain.handle('circuit:tasks:submitIntake', (_event, request: SubmitTaskIntakeRequest) => {
    try {
      return toTaskDto(submitTaskIntake(request.taskId, request.text, request.mode ?? 'chat'))
    } catch (error) {
      throw toIpcError(error)
    }
  })

  ipcMain.handle('circuit:tasks:sendChatMessage', (_event, request: SendChatMessageRequest) => {
    try {
      return toTaskDto(sendChatMessage(request.taskId, request.text))
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

  ipcMain.handle('circuit:tasks:runPhase', (_event, request: RunPhaseRequest) => {
    try {
      schedulePhaseRun(request.taskId, request.phaseName)
      return toTaskDto(getTaskDetail(request.taskId))
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

  ipcMain.handle('circuit:tasks:replyPermission', async (_event, request: ReplyPermissionRequest) => {
    try {
      requireTaskWorkspacePath(request.taskId, request.workspacePath)
      requireHarnessSessionForTask(request.taskId, request.sessionId)
      await replyHarnessPermission({
        taskId: request.taskId,
        sessionId: request.sessionId,
        permissionId: request.permissionId,
        response: request.response,
        workspacePath: request.workspacePath,
      })
    } catch (error) {
      throw toIpcError(error)
    }
  })

  ipcMain.handle('circuit:tasks:replyQuestion', async (_event, request: ReplyQuestionRequest) => {
    try {
      requireTaskWorkspacePath(request.taskId, request.workspacePath)
      requireHarnessSessionForTask(request.taskId, request.sessionId)
      await replyHarnessQuestion({
        taskId: request.taskId,
        requestId: request.requestId,
        sessionId: request.sessionId,
        workspacePath: request.workspacePath,
        answers: request.answers,
      })
    } catch (error) {
      throw toIpcError(error)
    }
  })

  ipcMain.handle('circuit:tasks:rejectQuestion', async (_event, request: RejectQuestionRequest) => {
    try {
      requireTaskWorkspacePath(request.taskId, request.workspacePath)
      await rejectHarnessQuestion({
        taskId: request.taskId,
        requestId: request.requestId,
        workspacePath: request.workspacePath,
      })
    } catch (error) {
      throw toIpcError(error)
    }
  })

  ipcMain.handle('circuit:tasks:abortSession', async (_event, request: AbortSessionRequest) => {
    try {
      requireTaskWorkspacePath(request.taskId, request.workspacePath)
      requireHarnessSessionForTask(request.taskId, request.sessionId)
      await abortSession({
        sessionId: request.sessionId,
        workspacePath: request.workspacePath,
      })
    } catch (error) {
      throw toIpcError(error)
    }
  })
}

import { dialog, ipcMain, shell } from 'electron'

import { commitStaged, discardFiles, getDiff, getStatus, stageFiles, unstageFiles } from '@circuit/git'

import { CircuitError, ValidationError } from '@circuit/shared'
import { isValidTaskMode, type TaskMode } from '@circuit/workflow'

import {
  toArtifactDto,
  toPhaseDto,
  toRepoDto,
  toTaskDto,
  toTaskSummaryDto,
  type ApprovePhaseRequest,
  type ListTasksRequest,
  type RequestPhaseRevisionRequest,
  type ResolveDecisionRequest,
  type RunPhaseRequest,
  type SendChatMessageRequest,
  type AbortSessionRequest,
  type ApplySteeringRevisionRequest,
  type CreateDraftTaskRequest,
  type CreateTaskFromIntakeRequest,
  type UpdateTaskModeRequest,
  type ReplyPermissionRequest,
  type ReplyQuestionRequest,
  type RejectQuestionRequest,
  type SubmitTaskIntakeRequest,
  type EnableWorkflowRequest,
  type StartPhaseRequest,
  type CancelWorkflowRequest,
  type DiscardWorkflowDraftRequest,
  type GetWorkflowRunRequest,
  type StartFollowUpWorkflowRequest,
  type GitDiffRequest,
  type GitStageRequest,
  type GitCommitRequest,
  type WorkspaceRootRequest,
  type OpenWorkspaceFileRequest,
  type ReadWorkspaceFileRequest,
} from '../../shared/api.js'
import {
  listWorkspacePaths,
  readWorkspaceFile,
  resolveWorkspaceFileForOpen,
  validateWorkspaceRelativePaths,
} from '../services/workspace-files.js'
import { requireRegisteredWorkspacePath } from '../services/require-registered-workspace.js'

function requireTaskMode(value: string | undefined): TaskMode {
  const taskMode = value ?? 'auto'
  if (!isValidTaskMode(taskMode)) {
    throw new ValidationError(`Unsupported task mode: ${taskMode}`)
  }
  return taskMode
}
import { registerRepo, listRegisteredRepos } from '../services/repos.js'
import { resolveDecision } from '../services/decisions.js'
import { createDraftTask, getArtifactDetail, getTaskDetail, getWorkflowRunDetail, listAllTasks } from '../services/tasks.js'
import { applySteeringRevision } from '../services/workflow-events.js'
import {
  approvePhase,
  cancelWorkflow,
  createTaskFromIntake,
  updateTaskMode,
  discardWorkflowDraft,
  enableWorkflow,
  enableWorkflowFromChat,
  getActiveAgentAdapterName,
  requestPhaseRevision,
  sendChatMessage,
  startFollowUpWorkflow,
  startPhase,
  submitTaskIntake,
} from '../features/workflow/index.js'
import { replyHarnessPermission } from '../features/workflow/reply-permission.js'
import { replyHarnessQuestion } from '../features/workflow/reply-question.js'
import { rejectHarnessQuestion } from '../features/workflow/reject-question.js'
import { abortSession } from '../features/workflow/abort-session.js'
import { requireHarnessSessionForTask } from '../features/workflow/require-harness-session.js'
import { requireTaskWorkspacePath } from '../features/workflow/require-task-workspace.js'
import { registerWindowHandlers } from './window-handlers.js'

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
  registerWindowHandlers()

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

  ipcMain.handle('circuit:tasks:createDraft', (_event, request: CreateDraftTaskRequest) => {
    try {
      const task = createDraftTask(request.repoId, requireTaskMode(request.taskMode))
      return toTaskDto(task)
    } catch (error) {
      throw toIpcError(error)
    }
  })

  ipcMain.handle(
    'circuit:tasks:createFromIntake',
    async (_event, request: CreateTaskFromIntakeRequest) => {
      try {
        const task = await createTaskFromIntake(
          request.repoId,
          request.text,
          requireTaskMode(request.taskMode),
        )
        return toTaskDto(task)
      } catch (error) {
        throw toIpcError(error)
      }
    },
  )

  ipcMain.handle('circuit:tasks:submitIntake', async (_event, request: SubmitTaskIntakeRequest) => {
    try {
      return toTaskDto(await submitTaskIntake(request.taskId, request.text))
    } catch (error) {
      throw toIpcError(error)
    }
  })

  ipcMain.handle('circuit:tasks:updateTaskMode', (_event, request: UpdateTaskModeRequest) => {
    try {
      return toTaskDto(updateTaskMode(request.taskId, requireTaskMode(request.taskMode)))
    } catch (error) {
      throw toIpcError(error)
    }
  })

  async function handleEnableWorkflow(request: EnableWorkflowRequest) {
    const workflowType = request.workflowType as import('@circuit/workflow').WorkflowType | undefined

    if (request.text?.trim()) {
      return enableWorkflowFromChat(request.taskId, request.text, {
        autoRunFirstPhase: request.autoRunFirstPhase,
      })
    }

    const description = request.description?.trim()
    if (!description) {
      return enableWorkflowFromChat(request.taskId, undefined, {
        autoRunFirstPhase: request.autoRunFirstPhase,
      })
    }

    return enableWorkflow(request.taskId, {
      description,
      autoRunFirstPhase: request.autoRunFirstPhase,
      workflowType,
    })
  }

  ipcMain.handle('circuit:tasks:enableWorkflow', async (_event, request: EnableWorkflowRequest) => {
    try {
      return toTaskDto(await handleEnableWorkflow(request))
    } catch (error) {
      throw toIpcError(error)
    }
  })

  ipcMain.handle('circuit:tasks:startPhase', (_event, request: StartPhaseRequest) => {
    try {
      return toTaskDto(startPhase(request.taskId, request.phaseName))
    } catch (error) {
      throw toIpcError(error)
    }
  })

  ipcMain.handle('circuit:tasks:cancelWorkflow', async (_event, request: CancelWorkflowRequest) => {
    try {
      if (request.stopRun === false) {
        // stopRun reserved for future use — cancel always best-effort aborts active harness.
      }
      return toTaskDto(await cancelWorkflow(request.taskId))
    } catch (error) {
      throw toIpcError(error)
    }
  })

  ipcMain.handle(
    'circuit:tasks:discardWorkflowDraft',
    (_event, request: DiscardWorkflowDraftRequest) => {
      try {
        return toTaskDto(discardWorkflowDraft(request.taskId))
      } catch (error) {
        throw toIpcError(error)
      }
    },
  )

  ipcMain.handle(
    'circuit:tasks:startFollowUpWorkflow',
    async (_event, request: StartFollowUpWorkflowRequest) => {
      try {
        return toTaskDto(
          await startFollowUpWorkflow(request.taskId, {
            description: request.description,
            workflowType: request.workflowType as import('@circuit/workflow').WorkflowType | undefined,
          }),
        )
      } catch (error) {
        throw toIpcError(error)
      }
    },
  )

  ipcMain.handle('circuit:tasks:getWorkflowRun', (_event, request: GetWorkflowRunRequest) => {
    try {
      const detail = getWorkflowRunDetail(request.taskId, request.runId)
      return {
        ...detail.run,
        phases: detail.phases.map(toPhaseDto),
        artifacts: detail.artifacts.map(toArtifactDto),
      }
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

  ipcMain.handle('circuit:artifacts:get', (_event, artifactId: string) => {
    try {
      return toArtifactDto(getArtifactDetail(artifactId))
    } catch (error) {
      throw toIpcError(error)
    }
  })

  ipcMain.handle('circuit:tasks:runPhase', (_event, request: RunPhaseRequest) => {
    try {
      return toTaskDto(startPhase(request.taskId, request.phaseName))
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

  ipcMain.handle('circuit:workspace:listPaths', (_event, request: WorkspaceRootRequest) => {
    try {
      const workspacePath = requireRegisteredWorkspacePath(request.workspacePath)
      return listWorkspacePaths(workspacePath)
    } catch (error) {
      throw toIpcError(error)
    }
  })

  ipcMain.handle('circuit:workspace:readFile', (_event, request: ReadWorkspaceFileRequest) => {
    try {
      const workspacePath = requireRegisteredWorkspacePath(request.workspacePath)
      return readWorkspaceFile(workspacePath, request.path)
    } catch (error) {
      throw toIpcError(error)
    }
  })

  ipcMain.handle('circuit:git:status', async (_event, request: WorkspaceRootRequest) => {
    try {
      const workspacePath = requireRegisteredWorkspacePath(request.workspacePath)
      return getStatus(workspacePath)
    } catch (error) {
      throw toIpcError(error)
    }
  })

  ipcMain.handle('circuit:git:diff', async (_event, request: GitDiffRequest) => {
    try {
      const workspacePath = requireRegisteredWorkspacePath(request.workspacePath)
      const paths = request.paths?.length
        ? validateWorkspaceRelativePaths(workspacePath, request.paths)
        : undefined
      return getDiff({
        cwd: workspacePath,
        paths,
        staged: request.staged,
        against: request.against,
      })
    } catch (error) {
      throw toIpcError(error)
    }
  })

  ipcMain.handle('circuit:git:stage', async (_event, request: GitStageRequest) => {
    try {
      const workspacePath = requireRegisteredWorkspacePath(request.workspacePath)
      const paths = validateWorkspaceRelativePaths(workspacePath, request.paths)
      await stageFiles(workspacePath, paths)
      return getStatus(workspacePath)
    } catch (error) {
      throw toIpcError(error)
    }
  })

  ipcMain.handle('circuit:git:unstage', async (_event, request: GitStageRequest) => {
    try {
      const workspacePath = requireRegisteredWorkspacePath(request.workspacePath)
      const paths = validateWorkspaceRelativePaths(workspacePath, request.paths)
      await unstageFiles(workspacePath, paths)
      return getStatus(workspacePath)
    } catch (error) {
      throw toIpcError(error)
    }
  })

  ipcMain.handle('circuit:git:discard', async (_event, request: GitStageRequest) => {
    try {
      const workspacePath = requireRegisteredWorkspacePath(request.workspacePath)
      const paths = validateWorkspaceRelativePaths(workspacePath, request.paths)
      await discardFiles(workspacePath, paths)
      return getStatus(workspacePath)
    } catch (error) {
      throw toIpcError(error)
    }
  })

  ipcMain.handle('circuit:git:commit', async (_event, request: GitCommitRequest) => {
    try {
      const workspacePath = requireRegisteredWorkspacePath(request.workspacePath)
      await commitStaged(workspacePath, request.message)
      return getStatus(workspacePath)
    } catch (error) {
      throw toIpcError(error)
    }
  })

  ipcMain.handle('circuit:shell:openWorkspaceFile', async (_event, request: OpenWorkspaceFileRequest) => {
    try {
      const workspacePath = requireRegisteredWorkspacePath(request.workspacePath)
      const absolutePath = await resolveWorkspaceFileForOpen(workspacePath, request.path)
      const error = await shell.openPath(absolutePath)
      if (error) {
        throw new ValidationError(`Could not open file: ${error}`)
      }
    } catch (error) {
      throw toIpcError(error)
    }
  })
}

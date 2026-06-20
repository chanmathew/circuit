import type { ArtifactRow, PhaseRow, RepoRow, TaskRow } from '@circuit/db'
import type { CircuitEvent, DecisionRequiredPayload, StreamActivityEvent } from '@circuit/protocol'
import { getPhaseLabel } from '@circuit/workflow'
import type { PhaseStatus } from '@circuit/workflow'

export interface RepoDto {
  id: string
  name: string
  path: string
  defaultBranch: string
  createdAt: string
  updatedAt: string
}

export interface PhaseDto {
  id: string
  taskId: string
  name: string
  label: string
  status: PhaseStatus
  order: number
  currentArtifactId: string | null
  staleReason: string | null
}

export interface ArtifactDto {
  id: string
  taskId: string
  phase: string
  path: string
  title: string
  content: string
  version: number
  status: string
  createdAt: string
  updatedAt: string
}

/** Lightweight row for dashboards — no artifact bodies or phase tree. */
export interface FeedEventDto extends CircuitEvent {
  id?: string
}

export interface TaskSummaryDto extends TaskRow {
  repoName: string
}

/** Full task payload for the workbench. */
export interface TaskDto extends TaskRow {
  repoName: string
  repoPath: string
  ticketContent: string
  phases: PhaseDto[]
  artifacts: ArtifactDto[]
  feedEvents: FeedEventDto[]
  decisionResolutions: DecisionResolutionDto[]
  /** Required decisions from latest phase run — same source as server approve gate. */
  requiredDecisionsByPhase: Record<string, DecisionRequiredPayload[]>
}

export type TaskStreamUpdate =
  | {
      taskId: string
      type: 'activity'
      activity: StreamActivityEvent
    }
  | {
      taskId: string
      type: 'phase_run_started'
      phaseName: string
      phaseRunId: string
    }
  | {
      taskId: string
      type: 'phase_run_completed'
      phaseName: string
      phaseRunId: string
    }
  | {
      taskId: string
      type: 'phase_run_failed'
      phaseName: string
      phaseRunId: string
      error: string
    }

export interface ApplySteeringRevisionRequest {
  taskId: string
  affectedPhase: string
  optionId: string
  stalePhases: string[]
  steeringText?: string
}

export { TASK_STREAM_UPDATE_CHANNEL } from './channels.js'

export interface RecordSteeringRequest {
  taskId: string
  text: string
}

export interface RunPhaseRequest {
  taskId: string
  phaseName?: string
}

export interface ApprovePhaseRequest {
  taskId: string
  phaseName: string
}

export interface RequestPhaseRevisionRequest {
  taskId: string
  phaseName: string
  note: string
}

export interface DecisionResolutionDto {
  id: string
  taskId: string
  phase: string
  decisionId: string
  optionId: string
  optionLabel: string
  resolvedAt: string
}

export interface ResolveDecisionRequest {
  taskId: string
  phase: string
  decisionId: string
  optionId: string
  optionLabel: string
}

export interface CreateTaskRequest {
  repoId: string
  description: string
}

export interface ListTasksRequest {
  repoId?: string
}

export function toRepoDto(repo: RepoRow): RepoDto {
  return {
    id: repo.id,
    name: repo.name,
    path: repo.path,
    defaultBranch: repo.defaultBranch,
    createdAt: repo.createdAt,
    updatedAt: repo.updatedAt,
  }
}

export function toPhaseDto(phase: PhaseRow): PhaseDto {
  return {
    id: phase.id,
    taskId: phase.taskId,
    name: phase.name,
    label: getPhaseLabel(phase.name),
    status: phase.status as PhaseStatus,
    order: phase.order,
    currentArtifactId: phase.currentArtifactId,
    staleReason: phase.staleReason,
  }
}

export function toArtifactDto(artifact: ArtifactRow): ArtifactDto {
  return {
    id: artifact.id,
    taskId: artifact.taskId,
    phase: artifact.phase,
    path: artifact.path,
    title: artifact.title,
    content: artifact.content,
    version: artifact.version,
    status: artifact.status,
    createdAt: artifact.createdAt,
    updatedAt: artifact.updatedAt,
  }
}

export function toTaskSummaryDto(task: TaskRow & { repoName: string }): TaskSummaryDto {
  return { ...task }
}

export function toTaskDto(
  task: TaskRow & {
    repoName: string
    repoPath: string
    ticketContent: string
    phases: PhaseRow[]
    artifacts: ArtifactRow[]
    feedEvents: CircuitEvent[]
    decisionResolutions: {
      id: string
      taskId: string
      phase: string
      decisionId: string
      optionId: string
      optionLabel: string
      resolvedAt: string
    }[]
    requiredDecisionsByPhase: Record<string, DecisionRequiredPayload[]>
  },
): TaskDto {
  return {
    ...task,
    phases: task.phases.map(toPhaseDto),
    artifacts: task.artifacts.map(toArtifactDto),
    feedEvents: task.feedEvents,
    decisionResolutions: task.decisionResolutions.map((row) => ({
      id: row.id,
      taskId: row.taskId,
      phase: row.phase,
      decisionId: row.decisionId,
      optionId: row.optionId,
      optionLabel: row.optionLabel,
      resolvedAt: row.resolvedAt,
    })),
    requiredDecisionsByPhase: task.requiredDecisionsByPhase,
  }
}

export interface CircuitApi {
  ping: () => Promise<string>
  getAppConfig: () => Promise<{ agentAdapter: string }>
  listRepos: () => Promise<RepoDto[]>
  addRepo: (path?: string) => Promise<RepoDto | null>
  listTasks: (request?: ListTasksRequest) => Promise<TaskSummaryDto[]>
  createTask: (request: CreateTaskRequest) => Promise<TaskDto>
  getTask: (taskId: string) => Promise<TaskDto>
  runPhase: (request: RunPhaseRequest) => Promise<TaskDto>
  approvePhase: (request: ApprovePhaseRequest) => Promise<TaskDto>
  requestPhaseRevision: (request: RequestPhaseRevisionRequest) => Promise<TaskDto>
  resolveDecision: (request: ResolveDecisionRequest) => Promise<TaskDto>
  recordSteering: (request: RecordSteeringRequest) => Promise<TaskDto>
  applySteeringRevision: (request: ApplySteeringRevisionRequest) => Promise<TaskDto>
  onTaskStreamUpdate: (callback: (update: TaskStreamUpdate) => void) => () => void
}

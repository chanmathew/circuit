import type { ArtifactRow, PhaseRow, RepoRow, TaskRow } from '@circuit/db'
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
  },
): TaskDto {
  return {
    ...task,
    phases: task.phases.map(toPhaseDto),
    artifacts: task.artifacts.map(toArtifactDto),
  }
}

export interface CircuitApi {
  ping: () => Promise<string>
  listRepos: () => Promise<RepoDto[]>
  addRepo: (path?: string) => Promise<RepoDto | null>
  listTasks: (request?: ListTasksRequest) => Promise<TaskSummaryDto[]>
  createTask: (request: CreateTaskRequest) => Promise<TaskDto>
  getTask: (taskId: string) => Promise<TaskDto>
}

import type { RepoRow, TaskRow } from '@circuit/db'

export interface RepoDto {
  id: string
  name: string
  path: string
  defaultBranch: string
  createdAt: string
  updatedAt: string
}

export interface TaskDto extends TaskRow {
  repoName: string
  repoPath: string
  ticketContent: string
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

export function toTaskDto(task: TaskDto): TaskDto {
  return task
}

export interface CircuitApi {
  ping: () => Promise<string>
  listRepos: () => Promise<RepoDto[]>
  addRepo: (path?: string) => Promise<RepoDto | null>
  listTasks: (request?: ListTasksRequest) => Promise<TaskDto[]>
  createTask: (request: CreateTaskRequest) => Promise<TaskDto>
  getTask: (taskId: string) => Promise<TaskDto>
}

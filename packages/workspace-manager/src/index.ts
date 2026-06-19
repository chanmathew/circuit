import type { WorkspaceStrategy } from '@circuit/workflow'

export interface Workspace {
  id: string
  taskId: string
  strategy: WorkspaceStrategy
  path: string
  branchName: string
}

export interface CreateWorkspaceOptions {
  repoPath: string
  taskId: string
  slug: string
  branchName: string
  strategy: WorkspaceStrategy
}

export interface WorkspaceCapabilities {
  cowWorktree: boolean
  gitWorktree: boolean
}

export async function detectCapabilities(): Promise<WorkspaceCapabilities> {
  return {
    cowWorktree: false,
    gitWorktree: true,
  }
}

export async function createWorkspace(_options: CreateWorkspaceOptions): Promise<Workspace> {
  throw new Error('Workspace creation not yet implemented')
}

export async function cleanupWorkspace(_workspaceId: string): Promise<void> {
  throw new Error('Workspace cleanup not yet implemented')
}

export interface GitFileChange {
  path: string
  status: 'added' | 'modified' | 'deleted' | 'renamed'
}

export interface GitStatus {
  branch: string
  clean: boolean
  changes: GitFileChange[]
}

export interface DiffOptions {
  cwd: string
  staged?: boolean
}

export interface WorktreeOptions {
  repoPath: string
  branchName: string
  worktreePath: string
}

export async function getStatus(_cwd: string): Promise<GitStatus> {
  throw new Error('Git status not yet implemented')
}

export async function getDiff(_options: DiffOptions): Promise<string> {
  throw new Error('Git diff not yet implemented')
}

export async function createWorktree(_options: WorktreeOptions): Promise<void> {
  throw new Error('Git worktree creation not yet implemented')
}

export async function removeWorktree(_repoPath: string, _worktreePath: string): Promise<void> {
  throw new Error('Git worktree removal not yet implemented')
}

export async function runValidation(
  _cwd: string,
  _command: string,
): Promise<{ exitCode: number; output: string }> {
  throw new Error('Validation runner not yet implemented')
}

export { getDefaultBranch, getRepoName, isGitRepo } from './repo.js'

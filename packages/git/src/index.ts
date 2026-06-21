export interface GitFileChange {
  path: string
  status: 'added' | 'modified' | 'deleted' | 'renamed' | 'untracked'
  staged: boolean
  unstaged: boolean
  insertions?: number
  deletions?: number
}

export interface GitStatus {
  branch: string
  clean: boolean
  changes: GitFileChange[]
  summary: {
    files: number
    insertions: number
    deletions: number
  }
}

export interface DiffOptions {
  cwd: string
  staged?: boolean
  against?: 'HEAD' | 'index'
}

export interface WorktreeOptions {
  repoPath: string
  branchName: string
  worktreePath: string
}

export { getStatus } from './status.js'
export { countUnifiedDiffLines, getDiff, type GetDiffOptions } from './diff.js'
export { toPierreGitStatusEntries, type PierreGitStatusEntry } from './pierre-git-status.js'
export { stageFiles, unstageFiles } from './stage.js'
export { commitStaged } from './commit.js'

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

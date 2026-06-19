import path from 'node:path'

import { simpleGit } from 'simple-git'

import { ValidationError } from '@circuit/shared'

export async function isGitRepo(repoPath: string): Promise<boolean> {
  try {
    const git = simpleGit(repoPath)
    return await git.checkIsRepo()
  } catch {
    return false
  }
}

export async function getDefaultBranch(repoPath: string): Promise<string> {
  const git = simpleGit(repoPath)

  if (!(await git.checkIsRepo())) {
    throw new ValidationError(`Not a git repository: ${repoPath}`)
  }

  const branch = await git.revparse(['--abbrev-ref', 'HEAD'])
  return branch.trim() || 'main'
}

export function getRepoName(repoPath: string): string {
  return path.basename(repoPath)
}

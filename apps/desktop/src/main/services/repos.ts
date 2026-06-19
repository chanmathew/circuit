import path from 'node:path'

import { getRepoByPath, insertRepo, listRepos, type RepoRow } from '@circuit/db'
import { getDefaultBranch, getRepoName, isGitRepo } from '@circuit/git'
import { createId, ValidationError } from '@circuit/shared'

import { getDb } from '../db.js'

export async function registerRepo(repoPath: string): Promise<RepoRow> {
  const resolvedPath = path.resolve(repoPath)

  if (!(await isGitRepo(resolvedPath))) {
    throw new ValidationError(`Not a git repository: ${resolvedPath}`)
  }

  const db = getDb()
  const existing = getRepoByPath(db, resolvedPath)
  if (existing) {
    return existing
  }

  const now = new Date().toISOString()
  const defaultBranch = await getDefaultBranch(resolvedPath)

  return insertRepo(db, {
    id: createId(),
    name: getRepoName(resolvedPath),
    path: resolvedPath,
    defaultBranch,
    createdAt: now,
    updatedAt: now,
  })
}

export function listRegisteredRepos(): RepoRow[] {
  return listRepos(getDb())
}

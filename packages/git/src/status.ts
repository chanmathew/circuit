import { simpleGit } from 'simple-git'

import type { GitFileChange, GitStatus } from './index.js'

export async function getStatus(cwd: string): Promise<GitStatus> {
  const git = simpleGit(cwd)
  const result = await git.status()

  const changes: GitFileChange[] = []

  for (const file of result.created) {
    changes.push({ path: file, status: 'added' })
  }
  for (const file of result.modified) {
    changes.push({ path: file, status: 'modified' })
  }
  for (const file of result.deleted) {
    changes.push({ path: file, status: 'deleted' })
  }
  for (const entry of result.renamed) {
    if (typeof entry === 'string') {
      changes.push({ path: entry, status: 'renamed' })
      continue
    }
    changes.push({ path: entry.to, status: 'renamed' })
    if (entry.from !== entry.to) {
      changes.push({ path: entry.from, status: 'deleted' })
    }
  }
  for (const file of result.not_added) {
    changes.push({ path: file, status: 'untracked' })
  }
  for (const file of result.conflicted) {
    changes.push({ path: file, status: 'modified' })
  }

  return {
    branch: result.current ?? 'HEAD',
    clean: result.isClean(),
    changes,
  }
}

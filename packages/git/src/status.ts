import { simpleGit } from 'simple-git'

import type { GitFileChange, GitStatus } from './index.js'

interface NumStatEntry {
  insertions: number
  deletions: number
}

function parseNumStat(output: string): Map<string, NumStatEntry> {
  const map = new Map<string, NumStatEntry>()

  for (const line of output.trim().split('\n')) {
    if (!line.trim()) continue
    const [adds, dels, ...pathParts] = line.split('\t')
    const filePath = pathParts.join('\t')
    if (!filePath) continue

    map.set(filePath, {
      insertions: adds === '-' ? 0 : Number.parseInt(adds, 10) || 0,
      deletions: dels === '-' ? 0 : Number.parseInt(dels, 10) || 0,
    })
  }

  return map
}

function deriveStatus(index: string, workingDir: string): GitFileChange['status'] {
  if (index === '?' || workingDir === '?') return 'untracked'
  if (index === 'A' || workingDir === 'A') return 'added'
  if (index === 'D' || workingDir === 'D') return 'deleted'
  if (index.startsWith('R') || workingDir.startsWith('R')) return 'renamed'
  return 'modified'
}

function isStaged(index: string): boolean {
  return index !== ' ' && index !== '?'
}

function isUnstaged(workingDir: string): boolean {
  return workingDir !== ' ' && workingDir !== '?'
}

export async function getStatus(cwd: string): Promise<GitStatus> {
  const git = simpleGit(cwd)
  const [result, numstatOutput] = await Promise.all([
    git.status(),
    git.diff(['HEAD', '--numstat']),
  ])

  const numstat = parseNumStat(numstatOutput)
  const changes: GitFileChange[] = []

  for (const file of result.files) {
    const fileStatus = deriveStatus(file.index, file.working_dir)
    const stats = numstat.get(file.path)
    changes.push({
      path: file.path,
      status: fileStatus,
      staged: isStaged(file.index),
      unstaged: fileStatus === 'untracked' || isUnstaged(file.working_dir),
      insertions: stats?.insertions,
      deletions: stats?.deletions,
    })
  }

  let insertions = 0
  let deletions = 0
  for (const stats of numstat.values()) {
    insertions += stats.insertions
    deletions += stats.deletions
  }

  return {
    branch: result.current ?? 'HEAD',
    clean: result.isClean(),
    changes,
    summary: {
      files: changes.length,
      insertions,
      deletions,
    },
  }
}

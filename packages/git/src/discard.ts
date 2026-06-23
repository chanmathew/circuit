import { simpleGit } from 'simple-git'

import { getStatus } from './status.js'

/** Revert working-tree changes and drop untracked files for the given paths. */
export async function discardFiles(cwd: string, paths: string[]): Promise<void> {
  if (paths.length === 0) return

  const status = await getStatus(cwd)
  const git = simpleGit(cwd)

  const untracked: string[] = []
  const tracked: string[] = []

  for (const filePath of paths) {
    const change = status.changes.find((entry) => entry.path === filePath)
    if (change?.status === 'untracked') {
      untracked.push(filePath)
      continue
    }

    if (change) {
      tracked.push(filePath)
      continue
    }

    const hasUntrackedUnderPath = status.changes.some(
      (entry) =>
        entry.status === 'untracked' &&
        (entry.path === filePath || entry.path.startsWith(`${filePath}/`)),
    )
    if (hasUntrackedUnderPath) untracked.push(filePath)
    else tracked.push(filePath)
  }

  if (tracked.length > 0) {
    await git.raw(['restore', '--staged', '--worktree', '--', ...tracked])
  }

  if (untracked.length > 0) {
    await git.clean('f', ['-d', '--', ...untracked])
  }
}

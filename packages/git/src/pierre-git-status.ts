import type { GitFileChange } from './index.js'

/** Pierre `@pierre/trees` git status entry shape. */
export interface PierreGitStatusEntry {
  path: string
  status: 'added' | 'deleted' | 'ignored' | 'modified' | 'renamed' | 'untracked'
}

export function toPierreGitStatusEntries(changes: GitFileChange[]): PierreGitStatusEntry[] {
  return changes.map((change) => ({
    path: change.path,
    status: change.status,
  }))
}

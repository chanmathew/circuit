import type { GitFileChangeDto } from '../../../../../shared/api.js'

export function gitChangeStatusLetter(status: GitFileChangeDto['status']): string {
  switch (status) {
    case 'added':
      return 'A'
    case 'deleted':
      return 'D'
    case 'renamed':
      return 'R'
    case 'untracked':
      return 'U'
    case 'modified':
    default:
      return 'M'
  }
}

export function formatDiffStats(insertions?: number, deletions?: number): string | null {
  if (insertions === undefined && deletions === undefined) return null
  const adds = insertions ?? 0
  const dels = deletions ?? 0
  if (adds === 0 && dels === 0) return null
  return `+${adds} −${dels}`
}

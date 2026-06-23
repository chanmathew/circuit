import type { GitFileChangeDto } from '../../../../../../shared/api.js'

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

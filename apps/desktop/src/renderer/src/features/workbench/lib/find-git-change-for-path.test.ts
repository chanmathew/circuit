import { describe, expect, it } from 'vitest'

import type { GitFileChangeDto } from '../../../../../shared/api.js'
import { findGitChangeForPath } from './find-git-change-for-path.js'

function change(path: string): GitFileChangeDto {
  return {
    path,
    status: 'modified',
    staged: false,
    unstaged: true,
  }
}

describe('findGitChangeForPath', () => {
  it('returns an exact path match', () => {
    const changes = [change('apps/desktop/src/main.ts')]
    expect(findGitChangeForPath(changes, 'apps/desktop/src/main.ts')).toEqual(changes[0])
  })

  it('prefers the longest suffix match when basename is ambiguous', () => {
    const changes = [change('tasks/task-2/design.md'), change('tasks/task-1/design.md')]

    expect(findGitChangeForPath(changes, 'design.md')?.path).toBe('tasks/task-1/design.md')
    expect(findGitChangeForPath([...changes].reverse(), 'design.md')?.path).toBe(
      'tasks/task-1/design.md',
    )
  })
})

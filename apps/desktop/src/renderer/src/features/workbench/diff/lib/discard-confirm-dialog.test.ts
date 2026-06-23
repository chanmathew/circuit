import { describe, expect, it } from 'vitest'

import type { GitFileChangeDto } from '../../../../../../shared/api.js'
import { buildDiscardConfirmCopy } from './discard-confirm-dialog.js'

function change(
  path: string,
  status: GitFileChangeDto['status'] = 'modified',
): GitFileChangeDto {
  return {
    path,
    status,
    staged: false,
    unstaged: true,
    insertions: 1,
    deletions: 0,
  }
}

describe('buildDiscardConfirmCopy', () => {
  it('describes bulk discard with untracked count', () => {
    const copy = buildDiscardConfirmCopy(
      ['a.ts', 'b.ts', 'new.txt'],
      [change('a.ts'), change('b.ts'), change('new.txt', 'untracked')],
    )
    expect(copy.title).toBe('Discard all changes?')
    expect(copy.description).toContain('3 files')
    expect(copy.description).toContain('1 untracked file')
  })

  it('describes single untracked file deletion', () => {
    const copy = buildDiscardConfirmCopy(['new.txt'], [change('new.txt', 'untracked')])
    expect(copy.title).toBe('Delete untracked file?')
    expect(copy.description).toContain('new.txt')
  })

  it('describes single tracked file discard', () => {
    const copy = buildDiscardConfirmCopy(['src/a.ts'], [change('src/a.ts')])
    expect(copy.title).toBe('Discard changes?')
    expect(copy.description).toContain('src/a.ts')
  })
})

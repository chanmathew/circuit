import { describe, expect, it } from 'vitest'

import type { GitStatusDto } from '../../../../shared/api.js'
import {
  applyDiscardOptimistic,
  applyDiscardOptimisticToGitPatch,
  applyStageOptimistic,
  applyUnstageOptimistic,
} from './optimistic-git-status.js'

const baseStatus: GitStatusDto = {
  branch: 'main',
  clean: false,
  summary: { files: 2, insertions: 1, deletions: 0 },
  changes: [
    {
      path: 'README.md',
      status: 'modified',
      staged: false,
      unstaged: true,
      insertions: 1,
      deletions: 0,
    },
    {
      path: 'new.txt',
      status: 'untracked',
      staged: false,
      unstaged: true,
    },
  ],
}

describe('optimistic git status', () => {
  it('marks selected paths staged immediately', () => {
    const next = applyStageOptimistic(baseStatus, ['README.md', 'new.txt'])

    expect(next.changes.find((change) => change.path === 'README.md')).toMatchObject({
      staged: true,
      unstaged: false,
    })
    expect(next.changes.find((change) => change.path === 'new.txt')).toMatchObject({
      status: 'added',
      staged: true,
      unstaged: false,
    })
  })

  it('marks selected paths unstaged immediately', () => {
    const stagedStatus = applyStageOptimistic(baseStatus, ['README.md'])
    const next = applyUnstageOptimistic(stagedStatus, ['README.md'])

    expect(next.changes.find((change) => change.path === 'README.md')).toMatchObject({
      staged: false,
      unstaged: true,
    })
  })

  it('reverts staged untracked files back to untracked on unstage', () => {
    const stagedStatus = applyStageOptimistic(baseStatus, ['new.txt'])
    const next = applyUnstageOptimistic(stagedStatus, ['new.txt'])

    expect(next.changes.find((change) => change.path === 'new.txt')).toMatchObject({
      status: 'untracked',
      staged: false,
      unstaged: true,
    })
  })

  it('removes discarded paths immediately', () => {
    const next = applyDiscardOptimistic(baseStatus, ['README.md', 'new.txt'])

    expect(next.changes).toHaveLength(0)
    expect(next.clean).toBe(true)
    expect(next.summary).toEqual({ files: 0, insertions: 0, deletions: 0 })
  })

  it('recalculates summary totals for partial discard', () => {
    const next = applyDiscardOptimistic(baseStatus, ['new.txt'])

    expect(next.changes).toHaveLength(1)
    expect(next.summary).toEqual({ files: 1, insertions: 1, deletions: 0 })
  })

  it('removes discarded file patches from combined git diff text', () => {
    const patch = [
      'diff --git a/README.md b/README.md',
      '--- a/README.md',
      '+++ b/README.md',
      '@@ -1 +1 @@',
      '-old',
      '+new',
      'diff --git a/new.txt b/new.txt',
      '--- /dev/null',
      '+++ b/new.txt',
      '@@ -0,0 +1 @@',
      '+hello',
    ].join('\n')

    const next = applyDiscardOptimisticToGitPatch(patch, ['new.txt'])

    expect(next).toContain('README.md')
    expect(next).not.toContain('new.txt')
  })
})

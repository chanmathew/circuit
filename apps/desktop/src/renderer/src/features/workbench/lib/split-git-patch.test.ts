import { describe, expect, it } from 'vitest'

import { splitGitPatchByFile } from './split-git-patch.js'

describe('splitGitPatchByFile', () => {
  it('returns empty array for blank patch', () => {
    expect(splitGitPatchByFile('   ')).toEqual([])
  })

  it('returns single patch unchanged when only one file', () => {
    const patch = [
      'diff --git a/README.md b/README.md',
      'index 123..456 100644',
      '--- a/README.md',
      '+++ b/README.md',
      '@@ -1 +1,2 @@',
      ' line',
      '+added',
    ].join('\n')

    expect(splitGitPatchByFile(patch)).toEqual([patch])
  })

  it('splits multi-file git patches', () => {
    const fileA = [
      'diff --git a/a.ts b/a.ts',
      'index 111..222 100644',
      '--- a/a.ts',
      '+++ b/a.ts',
      '@@ -1 +1,2 @@',
      '-old',
      '+new',
    ].join('\n')
    const fileB = [
      'diff --git a/b.ts b/b.ts',
      'index 333..444 100644',
      '--- a/b.ts',
      '+++ b/b.ts',
      '@@ -1 +1,2 @@',
      '-x',
      '+y',
    ].join('\n')

    expect(splitGitPatchByFile(`${fileA}\n${fileB}`)).toEqual([fileA, fileB])
  })
})

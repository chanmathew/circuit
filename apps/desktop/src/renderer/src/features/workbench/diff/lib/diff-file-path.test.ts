import { describe, expect, it } from 'vitest'

import { normalizeDiffFilePath, resolveDiffFilePath } from './diff-file-path.js'

describe('diff-file-path', () => {
  it('strips git a/ b/ prefixes', () => {
    expect(normalizeDiffFilePath('a/src/index.ts')).toBe('src/index.ts')
    expect(normalizeDiffFilePath('b/src/index.ts')).toBe('src/index.ts')
  })

  it('prefers an exact known workspace path', () => {
    expect(
      resolveDiffFilePath({ name: 'b/apps/desktop/src/main.ts' }, ['apps/desktop/src/main.ts']),
    ).toBe('apps/desktop/src/main.ts')
  })

  it('falls back to normalized patch name', () => {
    expect(resolveDiffFilePath({ name: 'a/README.md' })).toBe('README.md')
  })

  it('prefers the longest suffix match when known path order changes', () => {
    const knownPaths = ['tasks/task-2/design.md', 'tasks/task-1/design.md']

    expect(resolveDiffFilePath({ name: 'design.md' }, knownPaths)).toBe('tasks/task-1/design.md')
    expect(resolveDiffFilePath({ name: 'design.md' }, [...knownPaths].reverse())).toBe(
      'tasks/task-1/design.md',
    )
  })
})

import { describe, expect, it } from 'vitest'

import { toPierreFileContents } from './pierre-file-contents.js'

describe('toPierreFileContents', () => {
  it('uses basename for language detection', () => {
    const file = toPierreFileContents('deploy/Dockerfile', 'FROM node\n', 12)

    expect(file.name).toBe('Dockerfile')
    expect(file.lang).toBe('dockerfile')
  })

  it('detects nested TypeScript paths', () => {
    const file = toPierreFileContents('apps/desktop/src/main/index.ts', 'export {}\n', 11)

    expect(file.name).toBe('index.ts')
    expect(file.lang).toBe('typescript')
  })

  it('uses a stable cache key from the workspace path', () => {
    const file = toPierreFileContents('src/a.ts', 'a', 1)

    expect(file.cacheKey).toBe('src/a.ts:1')
  })
})

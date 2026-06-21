import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  listWorkspacePaths,
  readWorkspaceFile,
  resolveWorkspaceFilePath,
} from './workspace-files.js'

describe('workspace-files', () => {
  let workspaceDir: string

  beforeEach(async () => {
    workspaceDir = await mkdtemp(path.join(tmpdir(), 'circuit-workspace-'))
    await mkdir(path.join(workspaceDir, 'src'), { recursive: true })
    await writeFile(path.join(workspaceDir, 'src', 'index.ts'), 'export {}\n')
    await writeFile(path.join(workspaceDir, 'src', 'foo..bar.ts'), 'export {}\n')
    await writeFile(path.join(workspaceDir, 'README.md'), '# hello\n')
  })

  afterEach(async () => {
    await rm(workspaceDir, { recursive: true, force: true })
  })

  it('lists relative file paths', async () => {
    const paths = await listWorkspacePaths(workspaceDir)
    expect(paths).toContain('README.md')
    expect(paths).toContain('src/index.ts')
    expect(paths).toContain('src/foo..bar.ts')
  })

  it('reads utf8 file contents', async () => {
    const file = await readWorkspaceFile(workspaceDir, 'README.md')
    expect(file.encoding).toBe('utf8')
    expect(file.content).toBe('# hello\n')
  })

  it('reads paths containing double dots in segment names', async () => {
    const file = await readWorkspaceFile(workspaceDir, 'src/foo..bar.ts')
    expect(file.encoding).toBe('utf8')
    expect(file.content).toBe('export {}\n')
  })

  it('rejects path traversal', () => {
    expect(() => resolveWorkspaceFilePath(workspaceDir, '../outside.txt')).toThrow(
      'Invalid file path',
    )
  })

  it('throws NotFoundError for missing files', async () => {
    await expect(readWorkspaceFile(workspaceDir, 'missing.txt')).rejects.toThrow('File')
  })
})

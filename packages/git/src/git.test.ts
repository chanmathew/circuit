import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { simpleGit } from 'simple-git'

import { getDiff, getStatus, countUnifiedDiffLines, toPierreGitStatusEntries } from './index.js'

describe('@circuit/git status and diff', () => {
  let repoDir: string

  beforeEach(async () => {
    repoDir = await mkdtemp(path.join(tmpdir(), 'circuit-git-'))
    const git = simpleGit(repoDir)
    await git.init(['-b', 'main'])
    await writeFile(path.join(repoDir, 'README.md'), '# test\n')
    await git.add('.')
    await git.commit('init')
    await writeFile(path.join(repoDir, 'README.md'), '# test\nchanged\n')
    await writeFile(path.join(repoDir, 'new.txt'), 'hello\n')
  })

  afterEach(async () => {
    await rm(repoDir, { recursive: true, force: true })
  })

  it('reports modified and untracked files', async () => {
    const status = await getStatus(repoDir)
    expect(status.branch).toBe('main')
    expect(status.clean).toBe(false)
    expect(status.changes.some((entry) => entry.path === 'README.md' && entry.status === 'modified')).toBe(
      true,
    )
    expect(status.changes.some((entry) => entry.path === 'new.txt' && entry.status === 'untracked')).toBe(
      true,
    )
  })

  it('returns unified diff for changed paths', async () => {
    const patch = await getDiff({ cwd: repoDir, paths: ['README.md'] })
    expect(patch).toContain('README.md')
    expect(patch).toContain('changed')
  })

  it('maps git status to Pierre tree entries', () => {
    const entries = toPierreGitStatusEntries([
      { path: 'src/a.ts', status: 'modified' },
      { path: 'src/b.ts', status: 'added' },
    ])
    expect(entries).toEqual([
      { path: 'src/a.ts', status: 'modified' },
      { path: 'src/b.ts', status: 'added' },
    ])
  })

  it('counts added and removed lines from a unified patch', () => {
    const patch = [
      'diff --git a/index.html b/index.html',
      '--- a/index.html',
      '+++ b/index.html',
      '@@ -1,3 +1,4 @@',
      ' unchanged',
      '-removed',
      '+added one',
      '+added two',
    ].join('\n')

    expect(countUnifiedDiffLines(patch)).toEqual({ additions: 2, deletions: 1 })
  })
})

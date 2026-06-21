import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { simpleGit } from 'simple-git'

import {
  commitStaged,
  countUnifiedDiffLines,
  getDiff,
  getStatus,
  stageFiles,
  toPierreGitStatusEntries,
  unstageFiles,
} from './index.js'

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

  it('reports modified and untracked files with staged flags and summary', async () => {
    const status = await getStatus(repoDir)
    expect(status.branch).toBe('main')
    expect(status.clean).toBe(false)
    expect(status.summary.files).toBeGreaterThanOrEqual(2)

    const readme = status.changes.find((entry) => entry.path === 'README.md')
    expect(readme?.status).toBe('modified')
    expect(readme?.unstaged).toBe(true)
    expect(readme?.staged).toBe(false)

    const newFile = status.changes.find((entry) => entry.path === 'new.txt')
    expect(newFile?.status).toBe('untracked')
    expect(newFile?.unstaged).toBe(true)
  })

  it('returns unified diff for changed paths against index', async () => {
    const patch = await getDiff({ cwd: repoDir, paths: ['README.md'] })
    expect(patch).toContain('README.md')
    expect(patch).toContain('changed')
  })

  it('returns aggregate diff against HEAD', async () => {
    await stageFiles(repoDir, ['README.md', 'new.txt'])
    const patch = await getDiff({ cwd: repoDir, against: 'HEAD' })
    expect(patch).toContain('README.md')
    expect(patch).toContain('new.txt')
  })

  it('stages, unstages, and commits files', async () => {
    await stageFiles(repoDir, ['README.md', 'new.txt'])
    let status = await getStatus(repoDir)
    expect(status.changes.every((entry) => entry.staged)).toBe(true)

    await unstageFiles(repoDir, ['README.md'])
    status = await getStatus(repoDir)
    const readme = status.changes.find((entry) => entry.path === 'README.md')
    expect(readme?.staged).toBe(false)

    await stageFiles(repoDir, ['README.md'])
    await commitStaged(repoDir, 'Add changes')

    status = await getStatus(repoDir)
    expect(status.clean).toBe(true)
    expect(status.summary.files).toBe(0)
  })

  it('rejects empty commit messages', async () => {
    await stageFiles(repoDir, ['README.md'])
    await expect(commitStaged(repoDir, '   ')).rejects.toThrow(/message is required/i)
  })

  it('maps git status to Pierre tree entries', () => {
    const entries = toPierreGitStatusEntries([
      { path: 'src/a.ts', status: 'modified', staged: false, unstaged: true },
      { path: 'src/b.ts', status: 'added', staged: true, unstaged: false },
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

import { simpleGit } from 'simple-git'

import type { DiffOptions } from './index.js'
import { getStatus } from './status.js'

export interface GetDiffOptions extends DiffOptions {
  paths?: string[]
}

function nullDevicePath(): string {
  return typeof process !== 'undefined' && process.platform === 'win32' ? 'NUL' : '/dev/null'
}

async function diffUntrackedFile(
  git: ReturnType<typeof simpleGit>,
  filePath: string,
): Promise<string> {
  return git.raw(['diff', '--no-index', '--', nullDevicePath(), filePath])
}

async function appendUntrackedDiffs(
  cwd: string,
  patch: string,
  paths?: string[],
): Promise<string> {
  const status = await getStatus(cwd)
  const pathFilter = paths?.length ? new Set(paths) : null
  const untrackedPaths = status.changes
    .filter((change) => change.status === 'untracked')
    .map((change) => change.path)
    .filter((filePath) => pathFilter == null || pathFilter.has(filePath))
    .sort((a, b) => a.localeCompare(b))

  if (untrackedPaths.length === 0) return patch

  const git = simpleGit(cwd)
  const parts = patch.trim().length > 0 ? [patch.trim()] : []

  for (const filePath of untrackedPaths) {
    const untrackedPatch = (await diffUntrackedFile(git, filePath)).trim()
    if (untrackedPatch.length > 0) parts.push(untrackedPatch)
  }

  return parts.length > 0 ? `${parts.join('\n\n')}\n` : ''
}

export async function getDiff(options: GetDiffOptions): Promise<string> {
  const git = simpleGit(options.cwd)
  const args: string[] = []
  const against = options.against ?? 'index'

  if (against === 'HEAD') {
    args.push('HEAD')
  }

  if (options.staged) {
    args.push('--cached')
  }

  if (options.paths?.length) {
    args.push('--', ...options.paths)
  }

  const patch = await git.diff(args)

  if (options.staged) return patch

  return appendUntrackedDiffs(options.cwd, patch, options.paths)
}

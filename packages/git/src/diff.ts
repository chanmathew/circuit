import { simpleGit } from 'simple-git'

import type { DiffOptions } from './index.js'

export interface GetDiffOptions extends DiffOptions {
  paths?: string[]
}

/** Line +/- counts from a unified git diff patch (matches Pierre/git semantics). */
export function countUnifiedDiffLines(patch: string): {
  additions: number
  deletions: number
} {
  let additions = 0
  let deletions = 0

  for (const line of patch.split('\n')) {
    if (line.startsWith('+++') || line.startsWith('---')) continue
    if (line.startsWith('+')) additions += 1
    else if (line.startsWith('-')) deletions += 1
  }

  return { additions, deletions }
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

  return git.diff(args)
}

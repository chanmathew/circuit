import type { GitFileChangeDto } from '../../../../../../shared/api.js'

import { resolveDiffFilePath } from './diff-file-path.js'

/** Match a resolved diff path to a git status entry using the same rules as patch resolution. */
export function findGitChangeForPath(
  changes: readonly GitFileChangeDto[],
  path: string,
): GitFileChangeDto | undefined {
  if (changes.length === 0) return undefined

  const knownPaths = changes.map((change) => change.path)
  const resolved = resolveDiffFilePath({ name: path }, knownPaths)
  return changes.find((change) => change.path === resolved)
}

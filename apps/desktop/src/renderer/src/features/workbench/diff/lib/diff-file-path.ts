import type { FileDiffMetadata } from '@pierre/diffs'

/** Strip git diff `a/` / `b/` prefixes from a patch path. */
export function normalizeDiffFilePath(raw: string): string {
  return raw.replace(/^[ab]\//, '').trim()
}

/** Resolve a patch file header to a workspace-relative path. */
export function resolveDiffFilePath(
  fileDiff: Pick<FileDiffMetadata, 'name' | 'prevName'>,
  knownPaths?: readonly string[],
): string {
  const candidates = [fileDiff.name, fileDiff.prevName]
    .filter((path): path is string => typeof path === 'string' && path.length > 0)
    .map(normalizeDiffFilePath)

  if (knownPaths?.length) {
    const sortedKnownPaths = [...knownPaths].sort((a, b) => a.localeCompare(b))

    for (const candidate of candidates) {
      const exact = sortedKnownPaths.find((path) => path === candidate)
      if (exact) return exact
    }

    for (const candidate of candidates) {
      const suffixMatches = sortedKnownPaths.filter(
        (path) => path.endsWith(`/${candidate}`) || path.endsWith(candidate),
      )
      if (suffixMatches.length === 0) continue

      suffixMatches.sort((a, b) => b.length - a.length || a.localeCompare(b))
      return suffixMatches[0]
    }
  }

  return candidates[0] ?? normalizeDiffFilePath(fileDiff.name)
}

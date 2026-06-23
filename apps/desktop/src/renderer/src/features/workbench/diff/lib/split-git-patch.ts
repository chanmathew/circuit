/** Split a multi-file git patch into single-file patches for Pierre PatchDiff. */
export function splitGitPatchByFile(patch: string): string[] {
  const trimmed = patch.trim()
  if (!trimmed) return []

  if (!trimmed.startsWith('diff --git') && !trimmed.includes('\ndiff --git ')) {
    return [trimmed]
  }

  return trimmed
    .split(/(?<=\n)(?=diff --git )/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
}

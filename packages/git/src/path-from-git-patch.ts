/** Extract the post-image path from a single-file git patch header. */
export function pathFromGitPatch(patch: string): string | undefined {
  const header = patch
    .split('\n')
    .find((line) => line.startsWith('diff --git '))
  if (!header) return undefined

  const match = header.match(/^diff --git a\/(.+?) b\/(.+)$/)
  if (!match) return undefined

  return decodeGitPath(match[2] ?? '')
}

function decodeGitPath(raw: string): string {
  if (raw.startsWith('"') && raw.endsWith('"')) {
    return raw
      .slice(1, -1)
      .replace(/\\([0-7]{3})/g, (_, oct: string) => String.fromCharCode(Number.parseInt(oct, 8)))
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')
  }

  return raw
}

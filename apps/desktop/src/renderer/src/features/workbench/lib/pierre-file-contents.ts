import type { FileContents } from '@pierre/diffs'
import { getFiletypeFromFileName } from '@pierre/diffs'

function basename(path: string): string {
  const segments = path.split(/[/\\]/)
  return segments.at(-1) ?? path
}

/** Build Pierre `FileContents` with basename-based language detection. */
export function toPierreFileContents(
  path: string,
  content: string,
  size: number,
): FileContents {
  const name = basename(path)
  const lang = getFiletypeFromFileName(name)

  return {
    name,
    contents: content,
    cacheKey: `${path}:${size}`,
    ...(lang !== 'text' ? { lang } : {}),
  }
}

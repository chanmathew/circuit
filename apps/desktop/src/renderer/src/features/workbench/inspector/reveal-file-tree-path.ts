import type { FileTree, FileTreeDirectoryHandle } from '@pierre/trees'

function normalizeFilePath(path: string): string {
  return path.replace(/\/$/, '')
}

function resolvePathInTree(
  model: FileTree,
  filePath: string,
  knownPaths?: readonly string[],
): string | undefined {
  const normalized = normalizeFilePath(filePath)
  const candidates = new Set<string>([filePath, normalized])

  if (knownPaths) {
    for (const path of knownPaths) {
      if (normalizeFilePath(path) === normalized) {
        candidates.add(path)
      }
    }
  }

  for (const candidate of candidates) {
    const item = model.getItem(candidate)
    if (item) return item.getPath()
  }

  return undefined
}

function expandDirectoryAncestors(model: FileTree, filePath: string): void {
  const segments = normalizeFilePath(filePath).split('/').filter(Boolean)
  if (segments.length <= 1) return

  let prefix = ''
  for (let index = 0; index < segments.length - 1; index += 1) {
    prefix = prefix ? `${prefix}/${segments[index]}` : segments[index]!

    for (const directoryPath of [prefix, `${prefix}/`]) {
      const item = model.getItem(directoryPath)
      if (item == null || !item.isDirectory()) continue
      const directory = item as FileTreeDirectoryHandle
      if (!directory.isExpanded()) directory.expand()
      break
    }
  }
}

function selectOnlyPath(model: FileTree, filePath: string): void {
  const normalizedPath = normalizeFilePath(filePath)

  for (const selected of model.getSelectedPaths()) {
    if (normalizeFilePath(selected) !== normalizedPath) {
      model.getItem(selected)?.deselect()
    }
  }

  const item = model.getItem(filePath) ?? model.getItem(normalizedPath)
  if (!item) return

  if (!item.isSelected()) {
    item.select()
  }
}

/** Expand parent folders, highlight, and scroll the file tree to a workspace path. */
export function revealFileTreePath(
  model: FileTree,
  filePath: string,
  knownPaths?: readonly string[],
): void {
  const resolvedPath = resolvePathInTree(model, filePath, knownPaths)
  if (!resolvedPath) return

  expandDirectoryAncestors(model, resolvedPath)
  selectOnlyPath(model, resolvedPath)
  model.focusPath(resolvedPath)
  model.scrollToPath(resolvedPath, { focus: false, offset: 'nearest' })
}

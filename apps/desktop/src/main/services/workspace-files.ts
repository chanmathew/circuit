import { existsSync } from 'node:fs'
import { lstat, readdir, readFile, realpath, stat } from 'node:fs/promises'
import path from 'node:path'

import { NotFoundError, ValidationError } from '@circuit/shared'

const DEFAULT_IGNORE = new Set([
  '.git',
  'node_modules',
  '.Circuit',
  'dist',
  'out',
  '.turbo',
  '.next',
  'coverage',
])

/** Maximum file size for in-app reads (10 MiB). */
export const MAX_WORKSPACE_FILE_BYTES = 10 * 1024 * 1024

export interface ListWorkspacePathsOptions {
  ignore?: ReadonlySet<string>
}

export interface WorkspaceFileContent {
  content: string
  encoding: 'utf8' | 'binary'
  size: number
}

function normalizeWorkspaceRoot(workspacePath: string): string {
  const resolved = path.resolve(workspacePath)
  if (!existsSync(resolved)) {
    throw new NotFoundError('Workspace', workspacePath)
  }
  return resolved
}

function hasParentSegment(relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '')
  return normalized.split('/').some((segment) => segment === '..')
}

/** Resolve a relative path inside the workspace — rejects traversal escapes. */
export function resolveWorkspaceFilePath(workspacePath: string, relativePath: string): string {
  const root = normalizeWorkspaceRoot(workspacePath)

  if (hasParentSegment(relativePath)) {
    throw new ValidationError('Invalid file path')
  }

  const normalizedRelative = relativePath.replace(/\\/g, '/').replace(/^\/+/, '')
  const resolved = path.resolve(root, normalizedRelative)
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new ValidationError('Path escapes workspace')
  }

  return resolved
}

export async function assertPathWithinWorkspace(
  workspacePath: string,
  absolutePath: string,
): Promise<void> {
  const root = normalizeWorkspaceRoot(workspacePath)
  const [rootReal, fileReal] = await Promise.all([realpath(root), realpath(absolutePath)])

  if (fileReal !== rootReal && !fileReal.startsWith(`${rootReal}${path.sep}`)) {
    throw new ValidationError('Path escapes workspace')
  }
}

/** Normalize renderer-supplied paths to workspace-relative paths safe for git. */
export function validateWorkspaceRelativePaths(workspacePath: string, paths: string[]): string[] {
  const root = normalizeWorkspaceRoot(workspacePath)
  return paths.map((relativePath) => {
    const absolute = resolveWorkspaceFilePath(workspacePath, relativePath)
    return path.relative(root, absolute).replace(/\\/g, '/')
  })
}

export async function listWorkspacePaths(
  workspacePath: string,
  options: ListWorkspacePathsOptions = {},
): Promise<string[]> {
  const root = normalizeWorkspaceRoot(workspacePath)
  const ignore = options.ignore ?? DEFAULT_IGNORE
  const paths: string[] = []

  async function walk(currentDir: string, prefix: string): Promise<void> {
    let entries
    try {
      entries = await readdir(currentDir, { withFileTypes: true })
    } catch {
      return
    }

    entries.sort((a, b) => a.name.localeCompare(b.name))

    for (const entry of entries) {
      if (ignore.has(entry.name)) continue
      if (entry.isSymbolicLink()) continue

      const rel = prefix ? `${prefix}/${entry.name}` : entry.name

      if (entry.isDirectory()) {
        await walk(path.join(currentDir, entry.name), rel)
        continue
      }

      if (entry.isFile()) {
        paths.push(rel)
      }
    }
  }

  await walk(root, '')
  return paths
}

export async function readWorkspaceFile(
  workspacePath: string,
  relativePath: string,
): Promise<WorkspaceFileContent> {
  const absolutePath = resolveWorkspaceFilePath(workspacePath, relativePath)

  if (!existsSync(absolutePath)) {
    throw new NotFoundError('File', relativePath)
  }

  await assertPathWithinWorkspace(workspacePath, absolutePath)

  const fileStat = await stat(absolutePath)
  if (!fileStat.isFile()) {
    throw new ValidationError('Path is not a file')
  }

  if (fileStat.size > MAX_WORKSPACE_FILE_BYTES) {
    throw new ValidationError('File exceeds maximum readable size')
  }

  const buffer = await readFile(absolutePath)
  const isBinary = buffer.includes(0)

  if (isBinary) {
    return {
      content: buffer.toString('base64'),
      encoding: 'binary',
      size: fileStat.size,
    }
  }

  return {
    content: buffer.toString('utf8'),
    encoding: 'utf8',
    size: fileStat.size,
  }
}

/** Resolve and confine a workspace file for external open — caller runs shell.openPath. */
export async function resolveWorkspaceFileForOpen(
  workspacePath: string,
  relativePath: string,
): Promise<string> {
  const absolutePath = resolveWorkspaceFilePath(workspacePath, relativePath)

  if (!existsSync(absolutePath)) {
    throw new NotFoundError('File', relativePath)
  }

  await assertPathWithinWorkspace(workspacePath, absolutePath)

  const fileStat = await lstat(absolutePath)
  if (!fileStat.isFile()) {
    throw new ValidationError('Path is not a file')
  }

  return absolutePath
}

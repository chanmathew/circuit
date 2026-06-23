import type { GitStatusDto } from '../../../../shared/api.js'
import { pathFromGitPatch, splitGitPatchByFile } from '@circuit/git'

function summarizeChanges(changes: GitStatusDto['changes']): GitStatusDto['summary'] {
  let insertions = 0
  let deletions = 0
  for (const change of changes) {
    insertions += change.insertions ?? 0
    deletions += change.deletions ?? 0
  }
  return {
    files: changes.length,
    insertions,
    deletions,
  }
}

export function applyStageOptimistic(status: GitStatusDto, paths: readonly string[]): GitStatusDto {
  const pathSet = new Set(paths)

  return {
    ...status,
    changes: status.changes.map((change) => {
      if (!pathSet.has(change.path)) return change

      return {
        ...change,
        status: change.status === 'untracked' ? 'added' : change.status,
        staged: true,
        unstaged: false,
      }
    }),
  }
}

export function applyUnstageOptimistic(
  status: GitStatusDto,
  paths: readonly string[],
): GitStatusDto {
  const pathSet = new Set(paths)

  return {
    ...status,
    changes: status.changes.map((change) => {
      if (!pathSet.has(change.path)) return change

      return {
        ...change,
        status: change.status === 'added' ? 'untracked' : change.status,
        staged: false,
        unstaged: true,
      }
    }),
  }
}

export function applyDiscardOptimistic(
  status: GitStatusDto,
  paths: readonly string[],
): GitStatusDto {
  const pathSet = new Set(paths)
  const changes = status.changes.filter((change) => !pathSet.has(change.path))

  return {
    ...status,
    clean: changes.length === 0,
    changes,
    summary: summarizeChanges(changes),
  }
}

export function applyDiscardOptimisticToGitPatch(patch: string, paths: readonly string[]): string {
  const pathSet = new Set(paths)
  const remaining = splitGitPatchByFile(patch).filter((filePatch) => {
    const path = pathFromGitPatch(filePatch)
    return path == null || !pathSet.has(path)
  })
  return remaining.join('\n')
}

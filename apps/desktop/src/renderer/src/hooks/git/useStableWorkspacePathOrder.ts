import { useMemo } from 'react'

import type { GitFileChangeDto } from '../../../../shared/api.js'
import { mergeStablePathOrder } from '../../lib/stable-path-order.js'
import { useStablePathOrder } from '../useStablePathOrder.js'
import { useWorkspaceGitStatus } from './useWorkspaceGitStatus.js'

export function orderChangesByPath<T extends { path: string }>(
  changes: readonly T[],
  orderedPaths: readonly string[],
): T[] {
  const byPath = new Map(changes.map((change) => [change.path, change]))
  return orderedPaths
    .map((path) => byPath.get(path))
    .filter((change): change is T => change != null)
}

export function useStableWorkspacePathOrder(workspacePath: string, enabled = true) {
  const query = useWorkspaceGitStatus(workspacePath, enabled)
  const currentPaths = useMemo(
    () => query.data?.changes.map((change) => change.path) ?? [],
    [query.data?.changes],
  )
  const orderedPaths = useStablePathOrder(currentPaths, workspacePath)

  const orderedChanges = useMemo(
    (): GitFileChangeDto[] => orderChangesByPath(query.data?.changes ?? [], orderedPaths),
    [query.data?.changes, orderedPaths],
  )

  return {
    ...query,
    orderedPaths,
    orderedChanges,
  }
}

export { mergeStablePathOrder }

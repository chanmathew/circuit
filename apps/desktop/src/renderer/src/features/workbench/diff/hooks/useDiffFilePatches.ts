import { useMemo } from 'react'

import { mergeStablePathOrder } from '../../../../lib/stable-path-order.js'
import { useStablePathOrder } from '../../../../hooks/useStablePathOrder.js'
import { pathFromGitPatch } from '@circuit/git'

const EMPTY_PATHS: string[] = []

export interface OrderedDiffPatch {
  patch: string
  filePath?: string
}

export function useDiffFilePatches({
  patches,
  resolvePatchPath,
  preferredOrder,
  orderScopeKey,
}: {
  patches: readonly string[]
  resolvePatchPath: (patch: string) => string | undefined
  preferredOrder?: readonly string[]
  orderScopeKey: string
}): OrderedDiffPatch[] {
  const patchEntries = useMemo(() => {
    const patchByPath = new Map<string, string>()

    for (const patch of patches) {
      const sortKey = pathFromGitPatch(patch)
      if (!sortKey) continue
      const workspaceFilePath = resolvePatchPath(patch)
      patchByPath.set(workspaceFilePath ?? sortKey, patch)
    }

    return {
      patchByPath,
      pathsInPatches: [...patchByPath.keys()],
    }
  }, [patches, resolvePatchPath])

  const fallbackOrder = useStablePathOrder(
    preferredOrder?.length ? EMPTY_PATHS : patchEntries.pathsInPatches,
    orderScopeKey,
  )

  const orderedPaths = useMemo(() => {
    if (preferredOrder?.length) {
      return mergeStablePathOrder(preferredOrder, patchEntries.pathsInPatches)
    }
    return fallbackOrder
  }, [fallbackOrder, patchEntries.pathsInPatches, preferredOrder])

  return useMemo((): OrderedDiffPatch[] => {
    const entries: OrderedDiffPatch[] = []
    for (const path of orderedPaths) {
      const patch = patchEntries.patchByPath.get(path)
      if (patch) entries.push({ patch, filePath: path })
    }
    return entries
  }, [orderedPaths, patchEntries.patchByPath])
}

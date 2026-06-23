import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import { circuitApi } from '../ipc/client.js'
import { queryKeys } from '../ipc/query-keys.js'

function normalizePaths(paths: string[] | undefined): string[] | undefined {
  if (!paths?.length) return undefined
  return [...paths].sort((a, b) => a.localeCompare(b))
}

export function useWorkspaceGitDiff(
  workspacePath: string,
  paths: string[] | undefined,
  enabled = true,
  options?: {
    staged?: boolean
    against?: 'HEAD' | 'index'
  },
) {
  const sortedPaths = useMemo(() => normalizePaths(paths), [paths])
  const pathsKey = sortedPaths?.join('\0') ?? ''
  const staged = options?.staged
  const against = options?.against ?? 'index'

  return useQuery({
    queryKey: queryKeys.workspace.gitDiff(workspacePath, pathsKey, staged, against),
    queryFn: () =>
      circuitApi.getGitDiff({
        workspacePath,
        paths: sortedPaths,
        staged,
        against,
      }),
    placeholderData: (previousData) => previousData,
    enabled: enabled && workspacePath.length > 0,
  })
}

export function useWorkspaceFileGitDiff(
  workspacePath: string,
  path: string,
  enabled = true,
  options?: {
    staged?: boolean
    against?: 'HEAD' | 'index'
  },
) {
  return useWorkspaceGitDiff(
    workspacePath,
    path.length > 0 ? [path] : undefined,
    enabled,
    options,
  )
}

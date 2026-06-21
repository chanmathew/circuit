import { useQuery } from '@tanstack/react-query'

import { circuitApi } from '../ipc/client.js'
import { queryKeys } from '../ipc/query-keys.js'

export function useWorkspaceGitDiff(
  workspacePath: string,
  paths: string[] | undefined,
  enabled = true,
  options?: {
    staged?: boolean
    against?: 'HEAD' | 'index'
  },
) {
  const pathsKey = paths?.join('\0') ?? ''
  const staged = options?.staged
  const against = options?.against ?? 'index'

  return useQuery({
    queryKey: queryKeys.workspace.gitDiff(workspacePath, pathsKey, staged, against),
    queryFn: () =>
      circuitApi.getGitDiff({
        workspacePath,
        paths,
        staged,
        against,
      }),
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

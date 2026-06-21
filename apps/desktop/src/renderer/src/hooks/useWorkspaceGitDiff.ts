import { useQuery } from '@tanstack/react-query'

import { circuitApi } from '../ipc/client.js'
import { queryKeys } from '../ipc/query-keys.js'

export function useWorkspaceGitDiff(
  workspacePath: string,
  paths: string[] | undefined,
  enabled = true,
) {
  const pathsKey = paths?.join('\0') ?? ''
  return useQuery({
    queryKey: queryKeys.workspace.gitDiff(workspacePath, pathsKey, false),
    queryFn: () =>
      circuitApi.getGitDiff({
        workspacePath,
        paths,
      }),
    enabled: enabled && workspacePath.length > 0 && (paths?.length ?? 0) > 0,
  })
}

export function useWorkspaceFileGitDiff(
  workspacePath: string,
  path: string,
  enabled = true,
) {
  return useWorkspaceGitDiff(workspacePath, path.length > 0 ? [path] : undefined, enabled)
}

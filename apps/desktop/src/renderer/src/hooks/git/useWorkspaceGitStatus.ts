import { useQuery } from '@tanstack/react-query'

import { circuitApi } from '../../ipc/client.js'
import { queryKeys } from '../../ipc/query-keys.js'

export function useWorkspaceGitStatus(workspacePath: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.workspace.gitStatus(workspacePath),
    queryFn: () => circuitApi.getGitStatus({ workspacePath }),
    enabled: enabled && workspacePath.length > 0,
    refetchInterval: 5_000,
  })
}

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { circuitApi } from '../ipc/client.js'
import { queryKeys } from '../ipc/query-keys.js'

export function useGitStageMutations(workspacePath: string) {
  const queryClient = useQueryClient()

  const invalidateGitQueries = async (): Promise<void> => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.workspace.gitStatus(workspacePath),
    })
    await queryClient.invalidateQueries({
      queryKey: ['workspace', workspacePath, 'git-diff'],
    })
  }

  const stage = useMutation({
    mutationFn: (paths: string[]) => circuitApi.gitStage({ workspacePath, paths }),
    onSuccess: invalidateGitQueries,
  })

  const unstage = useMutation({
    mutationFn: (paths: string[]) => circuitApi.gitUnstage({ workspacePath, paths }),
    onSuccess: invalidateGitQueries,
  })

  const commit = useMutation({
    mutationFn: (message: string) => circuitApi.gitCommit({ workspacePath, message }),
    onSuccess: invalidateGitQueries,
  })

  return { stage, unstage, commit }
}

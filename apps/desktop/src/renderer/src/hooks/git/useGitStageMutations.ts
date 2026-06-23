import { useMutation, useQueryClient } from '@tanstack/react-query'

import type { GitStatusDto } from '../../../../shared/api.js'
import { circuitApi } from '../../ipc/client.js'
import { queryKeys } from '../../ipc/query-keys.js'
import {
  applyDiscardOptimistic,
  applyDiscardOptimisticToGitPatch,
  applyStageOptimistic,
  applyUnstageOptimistic,
} from './optimistic-git-status.js'

function refreshGitDiff(queryClient: ReturnType<typeof useQueryClient>, workspacePath: string): void {
  void queryClient.invalidateQueries({
    queryKey: ['workspace', workspacePath, 'git-diff'],
  })
}

type DiffQuerySnapshot = {
  queryKey: readonly unknown[]
  data: string | undefined
}

export function useGitStageMutations(workspacePath: string) {
  const queryClient = useQueryClient()
  const statusQueryKey = queryKeys.workspace.gitStatus(workspacePath)
  const diffQueryPrefix = ['workspace', workspacePath, 'git-diff'] as const

  const stage = useMutation({
    mutationFn: (paths: string[]) => circuitApi.gitStage({ workspacePath, paths }),
    onMutate: async (paths) => {
      await queryClient.cancelQueries({ queryKey: statusQueryKey })
      const previous = queryClient.getQueryData<GitStatusDto>(statusQueryKey)
      if (previous) {
        queryClient.setQueryData(statusQueryKey, applyStageOptimistic(previous, paths))
      }
      return { previous }
    },
    onError: (_error, _paths, context) => {
      if (context?.previous) {
        queryClient.setQueryData(statusQueryKey, context.previous)
      }
    },
    onSuccess: (status) => {
      queryClient.setQueryData(statusQueryKey, status)
      refreshGitDiff(queryClient, workspacePath)
    },
  })

  const unstage = useMutation({
    mutationFn: (paths: string[]) => circuitApi.gitUnstage({ workspacePath, paths }),
    onMutate: async (paths) => {
      await queryClient.cancelQueries({ queryKey: statusQueryKey })
      const previous = queryClient.getQueryData<GitStatusDto>(statusQueryKey)
      if (previous) {
        queryClient.setQueryData(statusQueryKey, applyUnstageOptimistic(previous, paths))
      }
      return { previous }
    },
    onError: (_error, _paths, context) => {
      if (context?.previous) {
        queryClient.setQueryData(statusQueryKey, context.previous)
      }
    },
    onSuccess: (status) => {
      queryClient.setQueryData(statusQueryKey, status)
      refreshGitDiff(queryClient, workspacePath)
    },
  })

  const discard = useMutation({
    mutationFn: (paths: string[]) => circuitApi.gitDiscard({ workspacePath, paths }),
    onMutate: async (paths) => {
      await queryClient.cancelQueries({ queryKey: statusQueryKey })
      await queryClient.cancelQueries({ queryKey: diffQueryPrefix })

      const previous = queryClient.getQueryData<GitStatusDto>(statusQueryKey)
      if (previous) {
        queryClient.setQueryData(statusQueryKey, applyDiscardOptimistic(previous, paths))
      }

      const previousDiffs: DiffQuerySnapshot[] = []
      for (const [queryKey, data] of queryClient.getQueriesData<string>({
        queryKey: diffQueryPrefix,
      })) {
        if (typeof data !== 'string') continue
        previousDiffs.push({ queryKey, data })
        queryClient.setQueryData(queryKey, applyDiscardOptimisticToGitPatch(data, paths))
      }

      return { previous, previousDiffs }
    },
    onError: (_error, _paths, context) => {
      if (context?.previous) {
        queryClient.setQueryData(statusQueryKey, context.previous)
      }
      for (const snapshot of context?.previousDiffs ?? []) {
        queryClient.setQueryData(snapshot.queryKey, snapshot.data)
      }
    },
    onSuccess: (status) => {
      queryClient.setQueryData(statusQueryKey, status)
      refreshGitDiff(queryClient, workspacePath)
    },
  })

  const commit = useMutation({
    mutationFn: (message: string) => circuitApi.gitCommit({ workspacePath, message }),
    onSuccess: (status) => {
      queryClient.setQueryData(statusQueryKey, status)
      refreshGitDiff(queryClient, workspacePath)
    },
  })

  return { stage, unstage, discard, commit }
}

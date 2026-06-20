import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { circuitApi } from '../../../ipc/client.js'
import { queryKeys } from '../../../ipc/query-keys.js'

export function useRepos() {
  return useQuery({
    queryKey: queryKeys.repos.all,
    queryFn: () => circuitApi.listRepos(),
  })
}

export function useAddRepo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => circuitApi.addRepo(),
    onSuccess: (repo) => {
      if (repo) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.repos.all })
      }
    },
  })
}

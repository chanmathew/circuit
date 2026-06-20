import { useMutation, useQueryClient } from '@tanstack/react-query'

import { circuitApi } from '../../../ipc/client.js'
import { queryKeys } from '../../../ipc/query-keys.js'

export function useCreateDraftTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: circuitApi.createDraftTask,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
    },
  })
}

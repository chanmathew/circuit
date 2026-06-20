import { useMutation, useQueryClient } from '@tanstack/react-query'

import { circuitApi } from '../../../ipc/client.js'
import { queryKeys } from '../../../ipc/query-keys.js'

export function useCreateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: circuitApi.createTask,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
    },
  })
}

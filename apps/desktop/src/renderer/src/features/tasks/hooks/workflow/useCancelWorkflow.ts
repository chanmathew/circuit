import { useMutation, useQueryClient } from '@tanstack/react-query'

import { circuitApi } from '../../../../ipc/client.js'
import { queryKeys } from '../../../../ipc/query-keys.js'

export function useCancelWorkflow(taskId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => circuitApi.cancelWorkflow({ taskId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(taskId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
    },
  })
}

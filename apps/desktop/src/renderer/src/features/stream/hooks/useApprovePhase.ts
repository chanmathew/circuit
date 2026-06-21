import { useMutation, useQueryClient } from '@tanstack/react-query'

import { circuitApi } from '../../../ipc/client.js'
import { queryKeys } from '../../../ipc/query-keys.js'

export function useApprovePhase(taskId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (phaseName: string) => circuitApi.approvePhase({ taskId, phaseName }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(taskId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
    },
  })
}

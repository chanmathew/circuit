import { useMutation, useQueryClient } from '@tanstack/react-query'

import { circuitApi } from '../../../ipc/client.js'
import { queryKeys } from '../../../ipc/query-keys.js'

export function useApplySteeringRevision(taskId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: {
      affectedPhase: string
      optionId: string
      stalePhases: string[]
      steeringText?: string
    }) =>
      circuitApi.applySteeringRevision({
        taskId,
        affectedPhase: input.affectedPhase,
        optionId: input.optionId,
        stalePhases: input.stalePhases,
        steeringText: input.steeringText,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(taskId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
    },
  })
}

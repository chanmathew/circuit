import { useMutation, useQueryClient } from '@tanstack/react-query'

import type { ComposerMode } from '../../../../../shared/api.js'
import { circuitApi } from '../../../ipc/client.js'
import { queryKeys } from '../../../ipc/query-keys.js'

export function useSubmitTaskIntake(taskId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { text: string; mode: ComposerMode }) =>
      circuitApi.submitTaskIntake({ taskId, text: input.text, mode: input.mode }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(taskId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
    },
  })
}

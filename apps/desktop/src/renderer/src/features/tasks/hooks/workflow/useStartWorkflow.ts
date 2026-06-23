import { useMutation, useQueryClient } from '@tanstack/react-query'

import type { EnableWorkflowRequest, StartFollowUpWorkflowRequest } from '../../../../../../shared/api.js'
import { circuitApi } from '../../../../ipc/client.js'
import { queryKeys } from '../../../../ipc/query-keys.js'

export interface StartWorkflowInput {
  /** When true, start follow-up from prior runs; otherwise enable fresh workflow. */
  useFollowUp?: boolean
}

export function useStartWorkflow(taskId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: StartWorkflowInput = {}) => {
      const { useFollowUp } = input

      if (useFollowUp) {
        const request: StartFollowUpWorkflowRequest = { taskId }
        return circuitApi.startFollowUpWorkflow(request)
      }

      const request: EnableWorkflowRequest = { taskId }
      return circuitApi.enableWorkflow(request)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(taskId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
    },
  })
}

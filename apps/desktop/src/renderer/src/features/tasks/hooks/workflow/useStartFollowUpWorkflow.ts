import { useMutation, useQueryClient } from '@tanstack/react-query'

import type { StartFollowUpWorkflowRequest } from '../../../../../../shared/api.js'
import { circuitApi } from '../../../../ipc/client.js'
import { queryKeys } from '../../../../ipc/query-keys.js'

export function useStartFollowUpWorkflow(taskId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: Omit<StartFollowUpWorkflowRequest, 'taskId'> = {}) =>
      circuitApi.startFollowUpWorkflow({ taskId, ...input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(taskId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
    },
  })
}

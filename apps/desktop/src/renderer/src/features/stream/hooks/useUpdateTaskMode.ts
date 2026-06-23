import { useMutation, useQueryClient } from '@tanstack/react-query'

import type { TaskMode } from '@circuit/workflow'

import { circuitApi } from '../../../ipc/client.js'
import { queryKeys } from '../../../ipc/query-keys.js'

export function useUpdateTaskMode(taskId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (taskMode: TaskMode) => circuitApi.updateTaskMode({ taskId, taskMode }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(taskId) })
    },
  })
}

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { circuitApi } from '../../../ipc/client.js'
import { queryKeys } from '../../../ipc/query-keys.js'
import type { TaskMode } from '@circuit/workflow'

export function useCreateTaskFromIntake() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { repoId: string; text: string; taskMode?: TaskMode }) =>
      circuitApi.createTaskFromIntake(input),
    onSuccess: (task) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
      void queryClient.setQueryData(queryKeys.tasks.detail(task.id), task)
    },
  })
}

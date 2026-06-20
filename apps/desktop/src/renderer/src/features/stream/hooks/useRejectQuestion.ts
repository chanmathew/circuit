import { useMutation } from '@tanstack/react-query'

import { circuitApi } from '../../../ipc/client.js'

export function useRejectQuestion(taskId: string, workspacePath: string) {
  return useMutation({
    mutationFn: (input: { requestId: string }) =>
      circuitApi.rejectQuestion({
        taskId,
        workspacePath,
        requestId: input.requestId,
      }),
  })
}

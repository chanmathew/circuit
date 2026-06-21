import { useMutation } from '@tanstack/react-query'

import { circuitApi } from '../../../ipc/client.js'

export function useAbortSession(taskId: string) {
  return useMutation({
    mutationFn: (input: { sessionId: string; workspacePath: string }) =>
      circuitApi.abortSession({
        taskId,
        sessionId: input.sessionId,
        workspacePath: input.workspacePath,
      }),
  })
}

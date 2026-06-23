import { useMutation } from '@tanstack/react-query'

import { circuitApi } from '../../../ipc/client.js'

export function useReplyQuestion(taskId: string, workspacePath: string) {
  return useMutation({
    mutationFn: (input: { requestId: string; sessionId: string; answers: string[][] }) =>
      circuitApi.replyQuestion({
        taskId,
        workspacePath,
        requestId: input.requestId,
        sessionId: input.sessionId,
        answers: input.answers,
      }),
  })
}

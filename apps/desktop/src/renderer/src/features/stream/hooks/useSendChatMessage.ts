import { useMutation } from '@tanstack/react-query'

import { circuitApi } from '../../../ipc/client.js'

/** Chat sends schedule background harness work — cache updates come from stream events. */
export function useSendChatMessage(taskId: string) {
  return useMutation({
    mutationFn: (text: string) => circuitApi.sendChatMessage({ taskId, text }),
  })
}

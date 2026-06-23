import { useMutation } from '@tanstack/react-query'

import type { PermissionReply } from '../../../../../shared/api.js'
import { circuitApi } from '../../../ipc/client.js'

export function useReplyPermission(taskId: string, workspacePath: string) {
  return useMutation({
    mutationFn: (input: { sessionId: string; permissionId: string; response: PermissionReply }) =>
      circuitApi.replyPermission({
        taskId,
        workspacePath,
        sessionId: input.sessionId,
        permissionId: input.permissionId,
        response: input.response,
      }),
  })
}

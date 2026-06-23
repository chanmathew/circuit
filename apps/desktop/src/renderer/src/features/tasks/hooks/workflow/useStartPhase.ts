import { useMutation } from '@tanstack/react-query'

import { circuitApi } from '../../../ipc/client.js'

/** Phase start schedules background harness work — cache updates come from stream events. */
export function useStartPhase(taskId: string) {
  return useMutation({
    mutationFn: (phaseName?: string) => circuitApi.startPhase({ taskId, phaseName }),
  })
}

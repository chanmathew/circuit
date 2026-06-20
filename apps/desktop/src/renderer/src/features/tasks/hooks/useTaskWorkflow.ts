import { useMutation, useQueryClient } from '@tanstack/react-query'

import { circuitApi } from '../../../ipc/client.js'
import { queryKeys } from '../../../ipc/query-keys.js'

type WorkflowAction =
  | { type: 'run'; phaseName: string }
  | { type: 'approve'; phaseName: string }
  | { type: 'revise'; phaseName: string; note: string }
  | {
      type: 'resolve'
      phaseName: string
      decisionId: string
      optionId: string
      optionLabel: string
    }

export function useTaskWorkflow(taskId: string) {
  const queryClient = useQueryClient()

  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(taskId) })
    void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
  }

  return useMutation({
    mutationFn: async (action: WorkflowAction) => {
      if (action.type === 'run') {
        return circuitApi.runPhase({ taskId, phaseName: action.phaseName })
      }
      if (action.type === 'approve') {
        return circuitApi.approvePhase({ taskId, phaseName: action.phaseName })
      }
      if (action.type === 'resolve') {
        return circuitApi.resolveDecision({
          taskId,
          phase: action.phaseName,
          decisionId: action.decisionId,
          optionId: action.optionId,
          optionLabel: action.optionLabel,
        })
      }
      return circuitApi.requestPhaseRevision({
        taskId,
        phaseName: action.phaseName,
        note: action.note,
      })
    },
    onSuccess: invalidate,
  })
}

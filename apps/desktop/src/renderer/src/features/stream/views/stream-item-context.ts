import type { ReferenceTarget, StreamAction } from '@circuit/protocol'

import type { DecisionResolutionDto } from '../../../../../shared/api.js'

export interface StreamItemContext {
  workspacePath?: string
  decisionResolutions?: DecisionResolutionDto[]
  onStreamAction?: (action: StreamAction['action'], payload?: StreamAction['payload']) => void
  onOpenReference?: (target: ReferenceTarget) => void
  onOpenChangedFile?: (path: string) => void
}

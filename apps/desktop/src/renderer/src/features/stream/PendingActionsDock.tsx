import type { ActionCardItem, StreamAction, ReferenceTarget } from '@circuit/protocol'

import type { DecisionResolutionDto } from '../../../../shared/api.js'
import { ActionCardItemView, type StreamItemContext } from './views/index.js'

export interface PendingActionsDockProps {
  items: ActionCardItem[]
  decisionResolutions?: DecisionResolutionDto[]
  onStreamAction?: (action: StreamAction['action'], payload?: StreamAction['payload']) => void
  onOpenReference?: (target: ReferenceTarget) => void
  onOpenChangedFile?: (path: string) => void
}

export function PendingActionsDock({
  items,
  decisionResolutions,
  onStreamAction,
  onOpenReference,
  onOpenChangedFile,
}: PendingActionsDockProps): React.ReactElement | null {
  if (items.length === 0) return null

  const context: StreamItemContext = {
    decisionResolutions,
    onStreamAction,
    onOpenReference,
    onOpenChangedFile,
  }

  return (
    <div className="shrink-0 space-y-2 border-t border-border bg-muted/20 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Action required
      </p>
      {items.map((item) => (
        <ActionCardItemView key={item.id} item={item} context={context} />
      ))}
    </div>
  )
}

import { useState } from 'react'

import type { ReferenceTarget, StreamAction } from '@circuit/protocol'

import type { DecisionResolutionDto, FeedEventDto } from '../../../../shared/api.js'
import { useTaskStreamItems, type LocalUserMessage } from './hooks/useTaskStreamItems.js'
import { CircuitInputComposer } from './CircuitInputComposer.js'
import { StreamList } from './StreamList.js'

export interface CircuitAgentStreamProps {
  feedEvents: FeedEventDto[]
  decisionResolutions?: DecisionResolutionDto[]
  isRunning?: boolean
  onResolveDecision?: (decisionId: string, optionId: string, optionLabel: string) => void
  onOpenReference?: (target: ReferenceTarget) => void
}

export function CircuitAgentStream({
  feedEvents,
  decisionResolutions = [],
  isRunning = false,
  onResolveDecision,
  onOpenReference,
}: CircuitAgentStreamProps): React.ReactElement {
  const [localMessages, setLocalMessages] = useState<LocalUserMessage[]>([])

  const items = useTaskStreamItems(feedEvents, localMessages)

  const handleSend = (text: string): void => {
    setLocalMessages((prev) => [
      ...prev,
      {
        id: `local-${Date.now()}`,
        text,
        createdAt: new Date().toISOString(),
      },
    ])
  }

  const handleStreamAction = (
    action: StreamAction['action'],
    payload?: StreamAction['payload'],
  ): void => {
    if (action === 'decision.resolve') {
      const decisionId = payload?.decisionId
      const optionId = payload?.optionId
      const optionLabel = payload?.optionLabel
      if (
        typeof decisionId === 'string' &&
        typeof optionId === 'string' &&
        typeof optionLabel === 'string'
      ) {
        onResolveDecision?.(decisionId, optionId, optionLabel)
      }
    }
  }

  const handleOpenReference = (target: ReferenceTarget): void => {
    onOpenReference?.(target)
  }

  return (
    <aside className="flex h-full min-h-0 flex-col bg-card/30">
      <div className="shrink-0 border-b border-border px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Agent stream
        </p>
      </div>

      <StreamList
        items={items}
        decisionResolutions={decisionResolutions}
        onStreamAction={handleStreamAction}
        onOpenReference={handleOpenReference}
      />

      <CircuitInputComposer disabled={isRunning} onSend={handleSend} />
    </aside>
  )
}

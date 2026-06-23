import { useMemo } from 'react'
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
  Shimmer,
} from '@circuit/ui'
import type { StreamItem } from '@circuit/protocol'

import { StreamItemRenderer, type StreamItemRendererProps } from './StreamItemRenderer.js'
import { computeBrightStreamItemIds } from './stream-emphasis.js'

export interface StreamListProps extends Omit<StreamItemRendererProps, 'item'> {
  items: StreamItem[]
  emptyDescription?: string
  showThinking?: boolean
}

function AgentThinkingIndicator(): React.ReactElement {
  return (
    <div className="text-xs">
      <Shimmer duration={1.5}>Agent is thinking…</Shimmer>
    </div>
  )
}

export function StreamList({
  items,
  workspacePath,
  emptyDescription = 'Steer the agent, ask questions, or request changes. Material steering may offer revision cards.',
  showThinking = false,
  decisionResolutions,
  onStreamAction,
  onOpenReference,
  onOpenChangedFile,
}: StreamListProps): React.ReactElement {
  const brightItemIds = useMemo(() => computeBrightStreamItemIds(items), [items])

  return (
    <Conversation className="min-h-0 flex-1">
      <ConversationContent className="gap-3 px-3 pb-3 pt-4">
        {items.length === 0 ? (
          showThinking ? (
            <AgentThinkingIndicator />
          ) : (
            <ConversationEmptyState
              title="Agent stream"
              description={emptyDescription}
              className="p-4"
            />
          )
        ) : (
          <>
            {items.map((item) => (
              <StreamItemRenderer
                key={item.id}
                item={item}
                emphasized={brightItemIds.has(item.id)}
                workspacePath={workspacePath}
                decisionResolutions={decisionResolutions}
                onStreamAction={onStreamAction}
                onOpenReference={onOpenReference}
                onOpenChangedFile={onOpenChangedFile}
              />
            ))}
            {showThinking ? <AgentThinkingIndicator /> : null}
          </>
        )}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  )
}

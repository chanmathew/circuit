import { useState } from 'react'

import type { ReferenceTarget } from '@circuit/protocol'

import type { ArtifactDto, DecisionResolutionDto, FeedEventDto } from '../../../../shared/api.js'
import { useTaskStreamItems, type LocalUserMessage } from '../../lib/useTaskStreamItems.js'
import { CircuitInputComposer } from './CircuitInputComposer.js'
import { StreamList } from './StreamList.js'

export interface CircuitAgentStreamProps {
  feedEvents: FeedEventDto[]
  artifacts: ArtifactDto[]
  decisionResolutions?: DecisionResolutionDto[]
  isRunning?: boolean
  onResolveDecision?: (decisionId: string, optionId: string, optionLabel: string) => void
  onSelectArtifact?: (artifactId: string) => void
}

function resolveArtifactId(artifacts: ArtifactDto[], target: ReferenceTarget): string | undefined {
  if (target.type !== 'artifact') return undefined
  const byId = artifacts.find((artifact) => artifact.id === target.artifactId)
  if (byId) return byId.id
  const byPath = artifacts.find(
    (artifact) =>
      artifact.path === target.artifactId ||
      artifact.path.endsWith(target.artifactId) ||
      artifact.title === target.artifactId,
  )
  return byPath?.id
}

export function CircuitAgentStream({
  feedEvents,
  artifacts,
  decisionResolutions = [],
  isRunning = false,
  onResolveDecision,
  onSelectArtifact,
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

  const handleStreamAction = (action: string, payload?: Record<string, unknown>): void => {
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
    if (target.type === 'artifact') {
      const artifactId = resolveArtifactId(artifacts, target)
      if (artifactId) onSelectArtifact?.(artifactId)
    }
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

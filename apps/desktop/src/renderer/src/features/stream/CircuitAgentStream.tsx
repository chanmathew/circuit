import { useCallback, useMemo, useState } from 'react'

import type { ReferenceTarget, StreamAction } from '@circuit/protocol'

import type { DecisionResolutionDto, FeedEventDto } from '../../../../shared/api.js'
import { useApplySteeringRevision } from './hooks/useApplySteeringRevision.js'
import { useRecordSteering } from './hooks/useRecordSteering.js'
import { useTaskStreamItems, type LocalUserMessage } from './hooks/useTaskStreamItems.js'
import { useTaskStreamLive } from './hooks/useTaskStreamLive.js'
import { CircuitInputComposer } from './CircuitInputComposer.js'
import { StreamList } from './StreamList.js'

export interface CircuitAgentStreamProps {
  taskId: string
  feedEvents: FeedEventDto[]
  decisionResolutions?: DecisionResolutionDto[]
  isRunning?: boolean
  onResolveDecision?: (
    decisionId: string,
    optionId: string,
    optionLabel: string,
    phase?: string,
  ) => void
  onOpenReference?: (target: ReferenceTarget) => void
}

function persistedSteeringTexts(feedEvents: FeedEventDto[]): Set<string> {
  const texts = new Set<string>()
  for (const event of feedEvents) {
    if (event.type !== 'workflow:steering_received') continue
    const payload = event.payload as { rawText?: string }
    if (typeof payload.rawText === 'string') {
      texts.add(payload.rawText)
    }
  }
  return texts
}

function latestSteeringText(feedEvents: FeedEventDto[]): string | undefined {
  for (let index = feedEvents.length - 1; index >= 0; index -= 1) {
    const event = feedEvents[index]
    if (event?.type !== 'workflow:steering_received') continue
    const payload = event.payload as { rawText?: string }
    if (typeof payload.rawText === 'string') return payload.rawText
  }
  return undefined
}

export function CircuitAgentStream({
  taskId,
  feedEvents,
  decisionResolutions = [],
  isRunning = false,
  onResolveDecision,
  onOpenReference,
}: CircuitAgentStreamProps): React.ReactElement {
  const [pendingMessages, setPendingMessages] = useState<LocalUserMessage[]>([])
  const liveActivities = useTaskStreamLive(taskId)
  const recordSteering = useRecordSteering(taskId)
  const applySteeringRevision = useApplySteeringRevision(taskId)

  const optimisticMessages = useMemo(() => {
    const persisted = persistedSteeringTexts(feedEvents)
    return pendingMessages.filter((message) => !persisted.has(message.text))
  }, [feedEvents, pendingMessages])

  const items = useTaskStreamItems(feedEvents, optimisticMessages, liveActivities)

  const handleSend = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return

      setPendingMessages((current) => [
        ...current,
        {
          id: `pending-${Date.now()}`,
          text: trimmed,
          createdAt: new Date().toISOString(),
        },
      ])
      recordSteering.mutate(trimmed)
    },
    [recordSteering],
  )

  const handleStreamAction = useCallback(
    (action: StreamAction['action'], payload?: StreamAction['payload']): void => {
      if (action === 'decision.resolve') {
        const decisionId = payload?.decisionId
        const optionId = payload?.optionId
        const optionLabel = payload?.optionLabel
        const phase = typeof payload?.phase === 'string' ? payload.phase : undefined
        if (
          typeof decisionId === 'string' &&
          typeof optionId === 'string' &&
          typeof optionLabel === 'string'
        ) {
          onResolveDecision?.(decisionId, optionId, optionLabel, phase)
        }
        return
      }

      if (action === 'revision.infer') {
        const affectedPhase = payload?.affectedPhase
        const optionId = payload?.optionId
        const stalePhases = payload?.stalePhases
        if (
          typeof affectedPhase === 'string' &&
          typeof optionId === 'string' &&
          Array.isArray(stalePhases)
        ) {
          applySteeringRevision.mutate({
            affectedPhase,
            optionId,
            stalePhases: stalePhases.filter((entry): entry is string => typeof entry === 'string'),
            steeringText: latestSteeringText(feedEvents),
          })
        }
      }
    },
    [applySteeringRevision, feedEvents, onResolveDecision],
  )

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

      <CircuitInputComposer
        disabled={isRunning || recordSteering.isPending || applySteeringRevision.isPending}
        onSend={handleSend}
      />
    </aside>
  )
}

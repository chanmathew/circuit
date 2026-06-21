import { useMemo } from 'react'

import { eventsToStreamItems, mergeLiveActivities, type StreamItem } from '@circuit/protocol'
import type { StreamActivityEvent } from '@circuit/protocol'
import { getPhaseNextStepLabel } from '@circuit/workflow'
import type { WorkflowType } from '@circuit/workflow'

import type { ArtifactDto, FeedEventDto, PhaseDto } from '../../../../../shared/api.js'

/** Optimistic composer echo — cleared once steering appears in feedEvents. */
export type LocalUserMessage = {
  id: string
  text: string
  createdAt: string
}

export function useTaskStreamItems(
  feedEvents: FeedEventDto[],
  pendingUserMessages: LocalUserMessage[] = [],
  liveActivities: StreamActivityEvent[] = [],
  phases: PhaseDto[] = [],
  workflowType?: WorkflowType,
  artifacts: ArtifactDto[] = [],
): StreamItem[] {
  const phaseStatuses = useMemo(
    () => Object.fromEntries(phases.map((phase) => [phase.name, phase.status])),
    [phases],
  )

  const artifactTitlesByPhase = useMemo(
    () => Object.fromEntries(artifacts.map((artifact) => [artifact.phase, artifact.title])),
    [artifacts],
  )

  const nextStepLabelsByPhase = useMemo(() => {
    if (!workflowType) return {}
    return Object.fromEntries(
      phases.map((phase) => [phase.name, getPhaseNextStepLabel(phase.name, workflowType)]),
    )
  }, [phases, workflowType])

  const persistedItems = useMemo(
    () =>
      eventsToStreamItems({
        events: feedEvents,
        userMessages: pendingUserMessages.map((message) => ({
          id: message.id,
          text: message.text,
          createdAt: message.createdAt,
        })),
        options: { phaseStatuses, artifactTitlesByPhase, nextStepLabelsByPhase },
      }),
    [feedEvents, pendingUserMessages, phaseStatuses, artifactTitlesByPhase, nextStepLabelsByPhase],
  )

  return useMemo(
    () => mergeLiveActivities(persistedItems, liveActivities),
    [persistedItems, liveActivities],
  )
}

import { useMemo } from 'react'

import { eventsToStreamItems, mergeLiveActivities, type StreamItem } from '@circuit/protocol'
import type { StreamActivityEvent } from '@circuit/protocol'

import type { FeedEventDto } from '../../../../../shared/api.js'

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
): StreamItem[] {
  const persistedItems = useMemo(
    () =>
      eventsToStreamItems({
        events: feedEvents,
        userMessages: pendingUserMessages.map((message) => ({
          id: message.id,
          text: message.text,
          createdAt: message.createdAt,
        })),
      }),
    [feedEvents, pendingUserMessages],
  )

  return useMemo(
    () => mergeLiveActivities(persistedItems, liveActivities),
    [persistedItems, liveActivities],
  )
}

import { useMemo } from 'react'

import { eventsToStreamItems, type StreamItem } from '@circuit/protocol'

import type { FeedEventDto } from '../../../shared/api.js'

export interface LocalUserMessage {
  id: string
  text: string
  createdAt: string
}

export function useTaskStreamItems(
  feedEvents: FeedEventDto[],
  localMessages: LocalUserMessage[],
): StreamItem[] {
  return useMemo(
    () =>
      eventsToStreamItems({
        events: feedEvents,
        userMessages: localMessages,
      }),
    [feedEvents, localMessages],
  )
}

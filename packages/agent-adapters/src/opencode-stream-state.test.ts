import { describe, expect, it } from 'vitest'

import {
  normalizeActivityEvent,
  mapOpenCodeToolPartToActivity,
  mapQuestionToolPartToActivity,
} from './activity-normalizer.js'
import {
  createOpenCodeStreamAccumulator,
  mapOpenCodeStreamEvent,
} from './opencode-stream-state.js'

const deps = {
  mapToolPart: mapOpenCodeToolPartToActivity,
  mapQuestionToolPart: mapQuestionToolPartToActivity,
  normalize: normalizeActivityEvent,
}

describe('mapOpenCodeStreamEvent', () => {
  it('accumulates message.part.updated deltas before part.text is populated', () => {
    const stream = createOpenCodeStreamAccumulator()

    expect(
      mapOpenCodeStreamEvent(
        {
          type: 'message.part.updated',
          properties: {
            delta: 'Hello',
            part: {
              id: 'part_text_1',
              sessionID: 'ses-1',
              messageID: 'msg_asst_1',
              type: 'text',
              text: '',
            },
          },
        } as never,
        stream,
        deps,
      ),
    ).toMatchObject({
      type: 'message',
      content: 'Hello',
      metadata: { messageID: 'msg_asst_1', status: 'running' },
    })

    expect(
      mapOpenCodeStreamEvent(
        {
          type: 'message.part.updated',
          properties: {
            delta: ' world',
            part: {
              id: 'part_text_1',
              sessionID: 'ses-1',
              messageID: 'msg_asst_1',
              type: 'text',
              text: '',
            },
          },
        } as never,
        stream,
        deps,
      ),
    ).toMatchObject({
      type: 'message',
      content: 'Hello world',
      metadata: { status: 'running' },
    })

    expect(
      mapOpenCodeStreamEvent(
        {
          type: 'message.part.updated',
          properties: {
            part: {
              id: 'part_text_1',
              sessionID: 'ses-1',
              messageID: 'msg_asst_1',
              type: 'text',
              text: 'Hello world',
              time: { start: 1, end: 2 },
            },
          },
        } as never,
        stream,
        deps,
      ),
    ).toMatchObject({
      type: 'message',
      content: 'Hello world',
      metadata: { status: 'completed' },
    })
  })

  it('streams reasoning deltas and marks completion', () => {
    const stream = createOpenCodeStreamAccumulator()

    expect(
      mapOpenCodeStreamEvent(
        {
          type: 'message.part.updated',
          properties: {
            delta: 'Checking',
            part: {
              id: 'part_reason_1',
              sessionID: 'ses-1',
              messageID: 'msg_asst_1',
              type: 'reasoning',
              text: '',
            },
          },
        } as never,
        stream,
        deps,
      ),
    ).toMatchObject({
      type: 'reasoning',
      content: 'Checking',
      metadata: { status: 'running' },
    })
  })

  it('handles message.part.delta events', () => {
    const stream = createOpenCodeStreamAccumulator()

    expect(
      mapOpenCodeStreamEvent(
        {
          type: 'message.part.delta',
          properties: {
            sessionID: 'ses-1',
            messageID: 'msg_asst_1',
            partID: 'part_text_1',
            field: 'text',
            delta: 'Done.',
          },
        } as never,
        stream,
        deps,
      ),
    ).toMatchObject({
      type: 'message',
      content: 'Done.',
    })
  })
})

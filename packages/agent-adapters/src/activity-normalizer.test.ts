import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import {
  enrichActivitiesWithFileDiffs,
  mapTaskToolToSubagentRun,
  sessionMessagesToActivities,
  summarizeActivities,
  upsertTraceActivity,
} from './activity-normalizer.js'
import type { OpenCodeSessionMessage } from './opencode-client.js'

const fixtureDir = dirname(fileURLToPath(import.meta.url))
const fixture = JSON.parse(
  readFileSync(join(fixtureDir, 'fixtures/opencode-session-turn.fixture.json'), 'utf8'),
) as { messages: OpenCodeSessionMessage[] }

describe('mapTaskToolToSubagentRun', () => {
  it('maps OpenCode task tool parts to subagent_run activities', () => {
    const activity = mapTaskToolToSubagentRun({
      timestamp: '2026-06-20T12:00:00.000Z',
      callId: 'call_task_1',
      state: {
        status: 'completed',
        title: 'Explore ShopTab and product architecture',
        input: {
          description: 'Explore ShopTab and product architecture',
          subagent_type: 'explore',
        },
        metadata: {
          sessionId: 'ses_child_1',
        },
      },
    })

    expect(activity).toMatchObject({
      type: 'subagent_run',
      content: 'Explore ShopTab and product architecture',
      metadata: {
        subagentType: 'explore',
        childSessionId: 'ses_child_1',
        callId: 'call_task_1',
        status: 'completed',
      },
    })
  })
})

describe('sessionMessagesToActivities', () => {
  it('replays reasoning, tools, and prose from an OpenCode session turn fixture', () => {
    const activities = sessionMessagesToActivities(fixture.messages, {
      timestamp: '2026-06-20T12:00:00.000Z',
    })

    expect(activities.map((activity) => activity.type)).toEqual([
      'reasoning',
      'tool_call',
      'tool_call',
      'tool_call',
      'message',
    ])

    expect(activities[0]?.content).toContain('task.status')
    expect(activities[1]?.content).toBe('Reading TaskDetailPage.tsx')
    expect(activities[3]?.content).toBe('Edited TaskDetailPage.tsx')
  })
})

describe('enrichActivitiesWithFileDiffs', () => {
  it('attaches session diff line counts to edit tool activities by filename', () => {
    const activities = enrichActivitiesWithFileDiffs(
      [
        {
          type: 'tool_call',
          timestamp: '2026-06-20T12:00:00.000Z',
          content: 'Edited tasks-summary.md',
          metadata: { tool: 'edit', status: 'completed', title: 'tasks-summary.md' },
        },
        {
          type: 'tool_call',
          timestamp: '2026-06-20T12:00:00.000Z',
          content: 'Read index.ts',
          metadata: { tool: 'read', status: 'completed', title: 'index.ts' },
        },
      ],
      [
        {
          file: '.Circuit/tasks/tasks-summary.md',
          additions: 42,
          deletions: 1,
        },
      ],
    )

    expect(activities[0]?.metadata).toMatchObject({
      additions: 42,
      deletions: 1,
      path: '.Circuit/tasks/tasks-summary.md',
    })
    expect(activities[1]?.metadata?.additions).toBeUndefined()
  })
})

describe('summarizeActivities', () => {
  it('aggregates completed file/tool work into a Cursor-style summary', () => {
    const activities = sessionMessagesToActivities(fixture.messages)
    const toolActivities = activities.filter(
      (activity) => activity.type !== 'reasoning' && activity.type !== 'message',
    )

    expect(summarizeActivities(toolActivities)).toBe('Explored 2 files · Edited 1 file')
  })

  it('prefers the running label when a tool is still active', () => {
    expect(
      summarizeActivities([
        {
          type: 'tool_call',
          timestamp: '2026-06-20T12:00:00.000Z',
          content: 'Editing TaskDetailPage.tsx',
          metadata: { status: 'running' },
        },
      ]),
    ).toBe('Editing TaskDetailPage.tsx')
  })
})

describe('upsertTraceActivity', () => {
  it('replaces duplicate streaming updates for the same tool callId', () => {
    const trace = [
      {
        type: 'tool_call' as const,
        timestamp: '2026-06-20T12:00:00.000Z',
        content: 'Reading…',
        metadata: { callId: 'call_read_1', status: 'running', tool: 'read' },
      },
    ]

    upsertTraceActivity(trace, {
      type: 'tool_call',
      timestamp: '2026-06-20T12:00:01.000Z',
      content: 'Reading README.md',
      metadata: { callId: 'call_read_1', status: 'running', tool: 'read' },
    })
    upsertTraceActivity(trace, {
      type: 'tool_call',
      timestamp: '2026-06-20T12:00:02.000Z',
      content: 'Reading README.md',
      metadata: { callId: 'call_read_1', status: 'completed', tool: 'read' },
    })

    expect(trace).toHaveLength(1)
    expect(trace[0]?.content).toBe('Reading README.md')
    expect(trace[0]?.metadata?.status).toBe('completed')
  })
})

import { describe, expect, it } from 'vitest'

import {
  openReference,
  referenceToContentView,
  referenceToInspectorSelection,
} from './content-view.js'
import type { CircuitEvent } from './events.js'
import { parseHarnessSessionTranscript, parseTranscript } from './parsers.js'
import {
  eventsToStreamItems,
  mergeLiveActivities,
  revisionInferenceToStreamItem,
} from './stream-normalizer.js'

const TASK_ID = 'task-1'
const RUN_ID = 'run-1'
const TS = '2026-06-20T12:00:00.000Z'

function feedFromTranscript(transcript: string): CircuitEvent[] {
  const parsed = parseTranscript(transcript, {
    taskId: TASK_ID,
    phaseRunId: RUN_ID,
    timestamp: TS,
  })

  return [
    {
      type: 'phase:started',
      taskId: TASK_ID,
      phaseRunId: RUN_ID,
      timestamp: TS,
      payload: { phaseRunId: RUN_ID },
    },
    ...parsed.events,
    {
      type: 'phase:completed',
      taskId: TASK_ID,
      phaseRunId: RUN_ID,
      timestamp: TS,
      payload: { phaseRunId: RUN_ID },
    },
  ]
}

describe('eventsToStreamItems', () => {
  it('maps structured feed events to action and reference cards', () => {
    const transcript = `
\`\`\`circuit-decision
{"decisionId":"d1","title":"Choose routing","options":[{"id":"labels","label":"Use labels","recommended":true},{"id":"folders","label":"Use folders"}]}
\`\`\`

\`\`\`circuit-artifact
{"phase":"design","path":".circuit/tasks/foo/03-design.md","title":"03-design.md"}
\`\`\`

\`\`\`circuit-diff
{"sliceId":"slice-2","paths":["src/a.ts","src/b.ts"],"summary":"Slice 2 ready"}
\`\`\`

\`\`\`circuit-validation
{"command":"pnpm typecheck","exitCode":1,"passed":false}
\`\`\`
`
    const items = eventsToStreamItems({ events: feedFromTranscript(transcript) })

    expect(items.map((item) => item.kind)).toEqual([
      'action_card',
      'reference_card',
      'reference_card',
      'reference_card',
    ])

    const decision = items[0]
    expect(decision?.kind).toBe('action_card')
    if (decision?.kind === 'action_card') {
      expect(decision.title).toBe('Choose routing')
      expect(decision.options).toEqual(
        expect.arrayContaining([{ id: 'folders', label: 'Use folders' }]),
      )
    }

    const artifact = items[1]
    expect(artifact).toMatchObject({
      kind: 'reference_card',
      title: '03-design.md',
      target: {
        type: 'artifact',
        artifactId: '.circuit/tasks/foo/03-design.md',
      },
    })

    const diff = items[2]
    expect(diff).toMatchObject({
      kind: 'reference_card',
      title: 'Slice 2 ready',
      target: { type: 'diff', diffId: 'slice-2' },
    })

    const validation = items[3]
    expect(validation).toMatchObject({
      kind: 'reference_card',
      title: 'Checks failed',
      target: { type: 'check', checkId: 'pnpm typecheck' },
    })
    if (validation?.kind === 'reference_card') {
      expect(validation.actions?.some((action) => action.action === 'check.ask_fix')).toBe(true)
    }
  })

  it('merges user messages and agent prose by timestamp', () => {
    const items = eventsToStreamItems({
      events: [
        {
          type: 'agent:activity',
          taskId: TASK_ID,
          timestamp: '2026-06-20T12:01:00.000Z',
          payload: { text: 'That changes the design direction.', role: 'driver' },
        },
      ],
      userMessages: [
        {
          id: 'u1',
          text: 'Actually use folders.',
          createdAt: '2026-06-20T12:00:30.000Z',
        },
      ],
    })

    expect(items.map((item) => item.kind)).toEqual(['user_message', 'agent_message'])
    expect(items[0]).toMatchObject({ kind: 'user_message', text: 'Actually use folders.' })
    expect(items[1]).toMatchObject({
      kind: 'agent_message',
      role: 'driver',
      text: 'That changes the design direction.',
    })
  })

  it('groups non-message adapter activity into an activity group', () => {
    const items = eventsToStreamItems({
      events: [],
      activityEvents: [
        {
          type: 'file_read',
          timestamp: '2026-06-20T12:00:01.000Z',
          content: 'src/auth.ts',
          metadata: { path: 'src/auth.ts' },
        },
        {
          type: 'command',
          timestamp: '2026-06-20T12:00:02.000Z',
          content: 'pnpm test',
        },
        {
          type: 'message',
          timestamp: '2026-06-20T12:00:03.000Z',
          content: 'Tests passed.',
        },
      ],
    })

    expect(items.map((item) => item.kind)).toEqual(['activity_group', 'agent_message'])
    const group = items[0]
    expect(group).toMatchObject({
      kind: 'activity_group',
      items: [
        { label: 'Read src/auth.ts', status: 'success' },
        { label: 'pnpm test', status: 'success' },
      ],
    })
    if (group?.kind === 'activity_group') {
      expect(group.title).toBe('Explored 1 file, Ran 1 command')
      expect(group.display).toBe('flat')
      expect(group.items[0]).toMatchObject({
        label: 'Read src/auth.ts',
        filePath: 'src/auth.ts',
        openAs: 'file',
      })
    }
  })

  it('attaches filePath and openAs for OpenCode tool read/edit rows', () => {
    const items = eventsToStreamItems({
      events: [
        {
          type: 'harness:turn_activities',
          taskId: TASK_ID,
          timestamp: TS,
          payload: {
            activities: [
              {
                type: 'tool_call',
                timestamp: TS,
                content: 'Reading index.html',
                metadata: { tool: 'read', status: 'completed', title: 'index.html' },
              },
              {
                type: 'tool_call',
                timestamp: TS,
                content: 'Edited index.html',
                metadata: {
                  tool: 'edit',
                  status: 'completed',
                  title: 'index.html',
                  additions: 1,
                },
              },
            ],
          },
        },
      ],
    })

    const group = items[0]
    expect(group?.kind).toBe('activity_group')
    if (group?.kind === 'activity_group') {
      expect(group.items[0]).toMatchObject({
        label: 'Reading index.html',
        filePath: 'index.html',
        openAs: 'file',
      })
      expect(group.items[1]).toMatchObject({
        label: 'Edited index.html',
        filePath: 'index.html',
        openAs: 'diff',
        additions: 1,
      })
    }
  })

  it('maps blockers to blocked action cards', () => {
    const items = eventsToStreamItems({
      events: [
        {
          type: 'blocker:raised',
          taskId: TASK_ID,
          timestamp: TS,
          payload: {
            blockerId: 'b1',
            title: 'Missing API credentials',
            description: 'Cannot call webhook endpoint.',
          },
        },
      ],
    })

    expect(items[0]).toMatchObject({
      kind: 'action_card',
      severity: 'blocked',
      title: 'Missing API credentials',
    })
  })

  it('maps workflow steering events to user messages', () => {
    const items = eventsToStreamItems({
      events: [
        {
          id: 'steer-1',
          type: 'workflow:steering_received',
          taskId: TASK_ID,
          timestamp: TS,
          payload: { rawText: 'Use folder routing instead.' },
        },
      ],
    })

    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      kind: 'user_message',
      text: 'Use folder routing instead.',
    })
  })

  it('maps workflow revision inference to action cards', () => {
    const items = eventsToStreamItems({
      events: [
        {
          id: 'infer-1',
          type: 'workflow:revision_inference',
          taskId: TASK_ID,
          timestamp: TS,
          payload: {
            source: 'chat',
            affectedPhase: 'design',
            message: 'This changes Design. Mark Structure stale?',
            stalePhases: ['structure'],
            options: [
              { id: 'revise', label: 'Revise Design', recommended: true },
              { id: 'note', label: 'Add note only' },
            ],
          },
        },
      ],
    })

    expect(items[0]).toMatchObject({
      kind: 'action_card',
      title: 'Apply to workflow?',
      severity: 'warning',
    })
  })

  it('uses summary display for larger activity batches', () => {
    const items = eventsToStreamItems({
      events: [
        {
          type: 'harness:turn_activities',
          taskId: TASK_ID,
          timestamp: TS,
          payload: {
            activities: [
              { type: 'file_read', timestamp: TS, content: 'Read a.ts' },
              { type: 'file_read', timestamp: TS, content: 'Read b.ts' },
              {
                type: 'tool_call',
                timestamp: TS,
                content: 'Edited c.ts',
                metadata: { tool: 'edit', status: 'completed', additions: 10, deletions: 2 },
              },
              {
                type: 'tool_call',
                timestamp: TS,
                content: 'Edited d.ts',
                metadata: { tool: 'edit', status: 'completed', additions: 5, deletions: 1 },
              },
            ],
          },
        },
      ],
    })

    const group = items[0]
    expect(group).toMatchObject({
      kind: 'activity_group',
      display: 'summary',
      collapsed: false,
      stats: { additions: 15, deletions: 3 },
    })
    if (group?.kind === 'activity_group') {
      expect(group.title).toBe('Edited 2 files, Explored 2 files')
    }
  })

  it('interleaves turn activities before the assistant reply on reload', () => {
    const startedAt = '2026-06-20T12:00:00.000Z'
    const completedAt = '2026-06-20T12:00:05.000Z'
    const reply = 'Root cause: task.status was used for composer running state.'
    const items = eventsToStreamItems({
      events: [
        {
          type: 'workflow:steering_received',
          taskId: TASK_ID,
          timestamp: startedAt,
          payload: { rawText: 'Why is chat submit disabled?' },
        },
        {
          type: 'phase:started',
          taskId: TASK_ID,
          phaseRunId: RUN_ID,
          timestamp: startedAt,
          payload: { phaseRunId: RUN_ID, phase: 'chat' },
        },
        {
          type: 'harness:turn_activities',
          taskId: TASK_ID,
          phaseRunId: RUN_ID,
          timestamp: completedAt,
          payload: {
            activities: [
              {
                type: 'reasoning',
                timestamp: completedAt,
                content: 'Inspect TaskDetailPage and approvePhase.',
              },
              {
                type: 'tool_call',
                timestamp: completedAt,
                content: 'Read TaskDetailPage.tsx',
                metadata: { tool: 'read', status: 'completed' },
              },
              {
                type: 'message',
                timestamp: completedAt,
                content: reply,
              },
              {
                type: 'reasoning',
                timestamp: completedAt,
                content: 'Post-reply reasoning should be trimmed.',
              },
            ],
          },
        },
        {
          type: 'agent:activity',
          taskId: TASK_ID,
          phaseRunId: RUN_ID,
          timestamp: completedAt,
          payload: {
            role: 'driver',
            text: reply,
            activityType: 'message',
          },
        },
      ],
    })

    expect(items.map((item) => item.kind)).toEqual([
      'user_message',
      'reasoning',
      'activity_group',
      'agent_message',
    ])
    expect(items.at(-1)).toMatchObject({ kind: 'agent_message', text: reply })
  })

  it('keeps the transcript reply when agent:activity precedes turn activities in the feed', () => {
    const startedAt = '2026-06-20T12:00:00.000Z'
    const completedAt = '2026-06-20T12:00:05.000Z'
    const reply = 'Sure, what file do you want me to edit?'
    const items = eventsToStreamItems({
      events: [
        {
          type: 'phase:started',
          taskId: TASK_ID,
          phaseRunId: RUN_ID,
          timestamp: startedAt,
          payload: { phaseRunId: RUN_ID, phase: 'chat' },
        },
        {
          type: 'agent:activity',
          taskId: TASK_ID,
          phaseRunId: RUN_ID,
          timestamp: completedAt,
          payload: {
            role: 'driver',
            text: reply,
            activityType: 'message',
          },
        },
        {
          type: 'harness:turn_activities',
          taskId: TASK_ID,
          phaseRunId: RUN_ID,
          timestamp: completedAt,
          payload: {
            activities: [
              {
                type: 'reasoning',
                timestamp: completedAt,
                content: 'Need to ask a clarifying question.',
              },
              {
                type: 'message',
                timestamp: completedAt,
                content: reply,
              },
            ],
          },
        },
      ],
    })

    expect(items.filter((item) => item.kind === 'agent_message')).toHaveLength(1)
    expect(items.at(-1)).toMatchObject({ kind: 'agent_message', text: reply })
  })

  it('places artifact ready after harness activities and the assistant reply', () => {
    const startedAt = '2026-06-20T12:00:00.000Z'
    const completedAt = '2026-06-20T12:00:05.000Z'
    const reply = 'Questions phase output is ready for review.'
    const items = eventsToStreamItems({
      events: [
        {
          type: 'phase:started',
          taskId: TASK_ID,
          phaseRunId: RUN_ID,
          timestamp: startedAt,
          payload: { phaseRunId: RUN_ID, phase: 'questions' },
        },
        {
          type: 'phase:completed',
          taskId: TASK_ID,
          phaseRunId: RUN_ID,
          timestamp: startedAt,
          payload: { phaseRunId: RUN_ID, phase: 'questions' },
        },
        {
          type: 'harness:turn_activities',
          taskId: TASK_ID,
          phaseRunId: RUN_ID,
          timestamp: completedAt,
          payload: {
            activities: [
              {
                type: 'reasoning',
                timestamp: completedAt,
                content: 'Reviewing ticket context.',
              },
              {
                type: 'tool_call',
                timestamp: completedAt,
                content: 'Read ticket.md',
                metadata: { tool: 'read', status: 'completed' },
              },
              {
                type: 'message',
                timestamp: completedAt,
                content: reply,
              },
            ],
          },
        },
        {
          type: 'agent:activity',
          taskId: TASK_ID,
          phaseRunId: RUN_ID,
          timestamp: completedAt,
          payload: {
            role: 'driver',
            text: reply,
            activityType: 'message',
          },
        },
      ],
      options: {
        phaseStatuses: {
          questions: 'needs_review',
        },
      },
    })

    expect(items.map((item) => item.kind)).toEqual([
      'reasoning',
      'activity_group',
      'agent_message',
      'action_card',
    ])
    expect(items.at(-1)).toMatchObject({ kind: 'action_card', title: 'Questions ready' })
  })

  it('can include collapsed phase lifecycle groups', () => {
    const items = eventsToStreamItems({
      events: feedFromTranscript(''),
      options: { includePhaseLifecycle: true },
    })

    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      kind: 'activity_group',
      collapsed: true,
      items: [
        { label: 'Phase run started', status: 'info' },
        { label: 'Phase run completed', status: 'success' },
      ],
    })
  })

  it('suppresses workflow cancelled events from the chat stream', () => {
    const events: CircuitEvent[] = [
      {
        type: 'workflow:cancelled',
        taskId: TASK_ID,
        timestamp: TS,
        payload: { workflowRunId: 'run-cancelled' },
      },
    ]

    expect(eventsToStreamItems({ events })).toEqual([])
  })

  it('suppresses workflow follow-up started events from the chat stream', () => {
    const events: CircuitEvent[] = [
      {
        type: 'workflow:follow_up_started',
        taskId: TASK_ID,
        timestamp: TS,
        payload: { priorRunId: 'run-1', newRunId: 'run-2' },
      },
    ]

    expect(eventsToStreamItems({ events })).toEqual([])
  })

  it('suppresses workflow completed events from the chat stream', () => {
    const events: CircuitEvent[] = [
      {
        type: 'workflow:completed',
        taskId: TASK_ID,
        timestamp: TS,
        payload: {
          workflowRunId: 'run-complete',
          completionSummaryArtifactId: 'artifact-summary',
        },
      },
    ]

    expect(eventsToStreamItems({ events })).toEqual([])
  })

  it('maps workflow enable and phase lifecycle events to stream action cards', () => {
    const events: CircuitEvent[] = [
      {
        type: 'workflow:enabled',
        taskId: TASK_ID,
        timestamp: TS,
        payload: { workflowType: 'structured_change', startPhase: 'questions' },
      },
      {
        type: 'phase:started',
        taskId: TASK_ID,
        phaseRunId: RUN_ID,
        timestamp: TS,
        payload: { phaseRunId: RUN_ID, phase: 'questions' },
      },
      {
        type: 'phase:completed',
        taskId: TASK_ID,
        phaseRunId: RUN_ID,
        timestamp: TS,
        payload: { phaseRunId: RUN_ID, phase: 'questions' },
      },
      {
        type: 'phase:completed',
        taskId: TASK_ID,
        phaseRunId: 'run-design',
        timestamp: TS,
        payload: { phaseRunId: 'run-design', phase: 'design' },
      },
    ]

    const items = eventsToStreamItems({
      events,
      options: {
        phaseStatuses: {
          questions: 'complete',
          design: 'needs_review',
        },
      },
    })

    expect(items.map((item) => (item.kind === 'action_card' ? item.title : item.kind))).toEqual([
      'Workflow attached',
      'Design ready',
    ])

    const completed = items[1]
    if (completed?.kind === 'action_card') {
      expect(completed.actions.map((action) => action.action)).toEqual([
        'phase.open',
        'phase.approve',
      ])
      expect(completed.footer).toBe('Need changes? Tell the agent in chat.')
    }
  })
})

describe('revisionInferenceToStreamItem', () => {
  it('creates a revision action card from chat steering inference', () => {
    const item = revisionInferenceToStreamItem(
      {
        source: 'chat',
        affectedPhase: 'design',
        message: 'This changes Design. Mark Structure and Plan stale?',
        stalePhases: ['structure', 'plan'],
        options: [
          { id: 'revise', label: 'Revise Design', recommended: true },
          { id: 'note', label: 'Add note only' },
        ],
      },
      'revision-1',
      TS,
    )

    expect(item.kind).toBe('action_card')
    if (item.kind === 'action_card') {
      expect(item.title).toBe('Apply to workflow?')
      expect(item.summary).toBe('This changes Design. Mark Structure and Plan stale?')
      expect(item.options).toEqual(
        expect.arrayContaining([{ id: 'revise', label: 'Revise Design', recommended: true }]),
      )
    }
  })

  it('maps harness question pending events to action cards', () => {
    const items = eventsToStreamItems({
      events: [
        {
          type: 'harness:question_pending',
          taskId: TASK_ID,
          timestamp: TS,
          payload: {
            cardId: 'question-req-1',
            requestId: 'req-1',
            sessionId: 'ses-1',
            questions: [
              {
                header: 'Scope',
                question: 'Should this include admin users?',
                options: [{ label: 'Yes' }, { label: 'No' }],
              },
            ],
          },
        },
      ],
    })

    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      kind: 'action_card',
      id: 'question-req-1',
      title: 'Scope',
      summary: 'Should this include admin users?',
    })
  })

  it('maps question_request in turn activities to action cards', () => {
    const items = eventsToStreamItems({
      events: [
        {
          type: 'harness:turn_activities',
          taskId: TASK_ID,
          phaseRunId: RUN_ID,
          timestamp: TS,
          payload: {
            activities: [
              {
                type: 'question_request',
                timestamp: TS,
                content: 'Which database should we target?',
                metadata: {
                  requestId: 'call_q1',
                  sessionId: 'ses-1',
                  questions: [
                    {
                      header: 'Database',
                      question: 'Which database should we target?',
                      options: [{ label: 'Postgres' }, { label: 'SQLite' }],
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    })

    expect(items).toEqual([
      expect.objectContaining({
        kind: 'action_card',
        id: 'question-call_q1',
        title: 'Database',
      }),
    ])
  })
})

describe('parseHarnessSessionTranscript', () => {
  it('parses user and assistant blocks', () => {
    const transcript = `**User:**
hello

**Assistant:**
hi there`
    expect(parseHarnessSessionTranscript(transcript)).toEqual([
      { role: 'user', text: 'hello' },
      { role: 'assistant', text: 'hi there' },
    ])
  })
})

describe('mergeLiveActivities', () => {
  it('appends live activity tail without re-processing persisted feed items', () => {
    const base = eventsToStreamItems({
      events: [],
      userMessages: [{ id: 'u1', text: 'Hello', createdAt: '2026-06-20T12:00:00.000Z' }],
    })

    const merged = mergeLiveActivities(base, [
      {
        type: 'message',
        timestamp: '2026-06-20T12:00:01.000Z',
        content: 'Running questions phase…',
      },
    ])

    expect(merged).toHaveLength(2)
    expect(merged[0]?.kind).toBe('user_message')
    expect(merged[1]?.kind).toBe('agent_message')
  })

  it('pins live tool activity as a single working group after messages', () => {
    const base = eventsToStreamItems({
      events: [],
      userMessages: [{ id: 'u1', text: 'Hello', createdAt: '2026-06-20T12:00:00.000Z' }],
    })

    const merged = mergeLiveActivities(base, [
      {
        type: 'file_read',
        timestamp: '2026-06-20T12:00:01.000Z',
        content: 'src/index.ts',
      },
      {
        type: 'command',
        timestamp: '2026-06-20T12:00:02.000Z',
        content: 'pnpm test',
      },
    ])

    expect(merged).toHaveLength(2)
    expect(merged[0]?.kind).toBe('user_message')
    const live = merged[1]
    expect(live).toMatchObject({
      kind: 'activity_group',
      live: true,
    })
    if (live?.kind === 'activity_group') {
      expect(live.title).toBe('Explored 1 file, Ran 1 command')
      expect(live.display).toBe('flat')
      expect(live.items.at(-1)?.status).toBe('running')
    }
  })

  it('pins live activity after prior agent replies when no new user message (phase harness)', () => {
    const base = eventsToStreamItems({
      events: [
        {
          type: 'agent:activity',
          taskId: TASK_ID,
          timestamp: '2026-06-20T12:00:30.000Z',
          payload: { text: 'Prior chat reply.', role: 'driver' },
        },
        {
          type: 'workflow:enabled',
          taskId: TASK_ID,
          timestamp: '2026-06-20T12:01:00.000Z',
          payload: { workflowType: 'feature', workflowRunId: 'run-1' },
        },
      ],
      userMessages: [{ id: 'u1', text: 'Start a workflow', createdAt: '2026-06-20T12:00:00.000Z' }],
    })

    const merged = mergeLiveActivities(base, [
      {
        type: 'file_read',
        timestamp: '2026-06-20T12:02:00.000Z',
        content: 'src/index.ts',
      },
    ])

    expect(merged.map((item) => item.kind)).toEqual([
      'user_message',
      'agent_message',
      'action_card',
      'activity_group',
    ])
    expect(merged.at(-1)).toMatchObject({ kind: 'activity_group', live: true })
  })

  it('pins live activity before trailing artifact ready cards', () => {
    const base = eventsToStreamItems({
      events: [
        {
          type: 'phase:completed',
          taskId: TASK_ID,
          phaseRunId: RUN_ID,
          timestamp: TS,
          payload: { phaseRunId: RUN_ID, phase: 'questions' },
        },
      ],
      options: { phaseStatuses: { questions: 'needs_review' } },
    })

    const merged = mergeLiveActivities(base, [
      {
        type: 'file_read',
        timestamp: '2026-06-20T12:00:01.000Z',
        content: 'src/index.ts',
      },
    ])

    expect(merged.map((item) => item.kind)).toEqual(['activity_group', 'action_card'])
  })

  it('skips live messages already present in the persisted feed', () => {
    const base = eventsToStreamItems({
      events: [],
      userMessages: [{ id: 'u1', text: 'Hello', createdAt: TS }],
      activityEvents: [],
    })
    const withAgent = mergeLiveActivities(base, [
      {
        type: 'message',
        timestamp: '2026-06-20T12:00:01.000Z',
        content: 'Already saved',
      },
    ])
    const merged = mergeLiveActivities(withAgent, [
      {
        type: 'message',
        timestamp: '2026-06-20T12:00:02.000Z',
        content: 'Already saved',
      },
      {
        type: 'message',
        timestamp: '2026-06-20T12:00:03.000Z',
        content: 'New live only',
      },
    ])

    expect(merged.filter((item) => item.kind === 'agent_message')).toHaveLength(2)
    expect(merged.at(-1)).toMatchObject({ kind: 'agent_message', text: 'New live only' })
  })

  it('renders live subagent runs as subagent_run stream items', () => {
    const base = eventsToStreamItems({
      events: [],
      userMessages: [{ id: 'u1', text: 'Hello', createdAt: '2026-06-20T12:00:00.000Z' }],
    })

    const merged = mergeLiveActivities(base, [
      {
        type: 'subagent_run',
        timestamp: '2026-06-20T12:00:01.000Z',
        content: 'Explore ShopTab and product architecture',
        metadata: {
          subagentType: 'explore',
          description: 'Explore ShopTab and product architecture',
          status: 'running',
          callId: 'call_task_1',
          childActivities: [
            {
              type: 'tool_call',
              timestamp: '2026-06-20T12:00:02.000Z',
              content: 'Read ShopTab.svelte',
              metadata: { tool: 'read', status: 'completed', title: 'ShopTab.svelte' },
            },
          ],
        },
      },
    ])

    const subagent = merged.find((item) => item.kind === 'subagent_run')
    expect(subagent).toMatchObject({
      kind: 'subagent_run',
      subagentType: 'Explore',
      description: 'Explore ShopTab and product architecture',
      status: 'running',
      stepCount: 1,
      live: true,
    })
  })

  it('skips phase harness prompts leaked as live message activities', () => {
    const harnessPrompt = `# questions phase

## Context pack

## .Circuit/tasks/ticket/00-ticket.md

Ticket body

Run the questions phase using the context above.`

    const base = eventsToStreamItems({ events: [] })
    const merged = mergeLiveActivities(base, [
      {
        type: 'message',
        timestamp: TS,
        content: harnessPrompt,
      },
      {
        type: 'message',
        timestamp: TS,
        content: 'Here are clarifying questions for the ticket.',
      },
    ])

    expect(merged.filter((item) => item.kind === 'agent_message')).toEqual([
      expect.objectContaining({
        kind: 'agent_message',
        text: 'Here are clarifying questions for the ticket.',
      }),
    ])
  })

  it('renders live question requests as action cards', () => {
    const base = eventsToStreamItems({ events: [] })
    const merged = mergeLiveActivities(base, [
      {
        type: 'question_request',
        timestamp: TS,
        content: 'Which API should we use?',
        metadata: {
          requestId: 'req-1',
          sessionId: 'ses-1',
          questions: [
            {
              header: 'API choice',
              question: 'Which API should we use?',
              options: [
                { label: 'REST', description: 'Existing stack' },
                { label: 'GraphQL', description: 'New approach' },
              ],
            },
          ],
        },
      },
    ])

    const card = merged.find((item) => item.kind === 'action_card')
    expect(card).toMatchObject({
      kind: 'action_card',
      id: 'question-req-1',
      title: 'API choice',
      summary: 'Which API should we use?',
    })
    if (card?.kind === 'action_card') {
      expect(card.actions[0]?.action).toBe('question.reply')
    }
  })
})

describe('content navigation helpers', () => {
  it('opens artifact references in the artifact content view and inspector tab', () => {
    const target = { type: 'artifact' as const, artifactId: 'art-1' }
    expect(referenceToContentView(target)).toEqual({ type: 'artifact', artifactId: 'art-1' })
    expect(referenceToInspectorSelection(target)).toEqual({
      tab: 'workflow',
      selectedId: 'art-1',
    })
    expect(openReference(target)).toEqual({
      contentView: { type: 'artifact', artifactId: 'art-1' },
      inspector: { tab: 'workflow', selectedId: 'art-1' },
    })
  })

  it('opens diff and check references in matching views', () => {
    expect(openReference({ type: 'diff', diffId: 'slice-2' })).toEqual({
      contentView: { type: 'diff', diffId: 'slice-2' },
      inspector: { tab: 'changes', selectedId: 'slice-2', changesKind: 'diff' },
    })
    expect(openReference({ type: 'check', checkId: 'pnpm typecheck' })).toEqual({
      contentView: { type: 'check', checkId: 'pnpm typecheck' },
      inspector: { tab: 'changes', selectedId: 'pnpm typecheck', changesKind: 'check' },
    })
  })
})

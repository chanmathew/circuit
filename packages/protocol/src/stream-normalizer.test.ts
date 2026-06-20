import { describe, expect, it } from 'vitest'

import { openReference, referenceToContentView, referenceToInspectorSelection } from './content-view.js'
import type { CircuitEvent } from './events.js'
import { parseTranscript } from './parsers.js'
import { eventsToStreamItems, mergeLiveActivities, revisionInferenceToStreamItem } from './stream-normalizer.js'

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
      title: 'Activity',
      items: [
        { label: 'Read src/auth.ts', status: 'success' },
        { label: 'pnpm test', status: 'success' },
      ],
    })
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
      title: 'Revise design?',
      severity: 'warning',
    })
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
      expect(item.title).toBe('Revise design?')
      expect(item.summary).toBe('This changes Design. Mark Structure and Plan stale?')
      expect(item.options).toEqual(
        expect.arrayContaining([{ id: 'revise', label: 'Revise Design', recommended: true }]),
      )
    }
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
})

describe('content navigation helpers', () => {
  it('opens artifact references in the artifact content view and inspector tab', () => {
    const target = { type: 'artifact' as const, artifactId: 'art-1' }
    expect(referenceToContentView(target)).toEqual({ type: 'artifact', artifactId: 'art-1' })
    expect(referenceToInspectorSelection(target)).toEqual({
      tab: 'artifacts',
      selectedId: 'art-1',
    })
    expect(openReference(target)).toEqual({
      contentView: { type: 'artifact', artifactId: 'art-1' },
      inspector: { tab: 'artifacts', selectedId: 'art-1' },
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

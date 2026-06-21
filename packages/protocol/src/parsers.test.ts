import { describe, expect, it } from 'vitest'

import {
  isHarnessMetaMessage,
  isPhaseHarnessPrompt,
  parseCircuitBlocks,
  parseTranscript,
  stripCircuitBlocks,
} from './parsers.js'

describe('parseCircuitBlocks', () => {
  it('parses fenced JSON circuit blocks', () => {
    const content = `
Here is my analysis.

\`\`\`circuit-decision
{"decisionId":"d1","title":"Choose routing","options":[{"id":"labels","label":"Use labels"}]}
\`\`\`

Done.
`
    const blocks = parseCircuitBlocks(content)
    expect(blocks).toHaveLength(1)
    expect(blocks[0]?.type).toBe('circuit-decision')
    expect(blocks[0]?.data).toMatchObject({
      decisionId: 'd1',
      title: 'Choose routing',
    })
  })

  it('ignores invalid block types and malformed JSON', () => {
    const content = `
\`\`\`circuit-unknown
{"x":1}
\`\`\`

\`\`\`circuit-validation
not json
\`\`\`
`
    expect(parseCircuitBlocks(content)).toHaveLength(0)
  })

  it('ignores structurally invalid decision payloads', () => {
    const content = `
\`\`\`circuit-decision
{"decisionId":"d1","title":"Choose routing","options":[]}
\`\`\`
`
    expect(parseCircuitBlocks(content)).toHaveLength(0)
  })
})

describe('stripCircuitBlocks', () => {
  it('removes blocks and keeps prose', () => {
    const content = `Intro text.

\`\`\`circuit-diff
{"paths":["src/a.ts"],"summary":"Slice 1 ready"}
\`\`\`

Outro text.`
    expect(stripCircuitBlocks(content)).toBe('Intro text.\n\nOutro text.')
  })
})

describe('parseTranscript', () => {
  it('returns blocks, events, and prose', () => {
    const content = `Working on slice.

\`\`\`circuit-validation
{"command":"pnpm test","exitCode":0,"passed":true}
\`\`\`
`
    const result = parseTranscript(content, { taskId: 'task-1', phaseRunId: 'run-1' })

    expect(result.blocks).toHaveLength(1)
    expect(result.events).toHaveLength(1)
    expect(result.events[0]?.type).toBe('validation:passed')
    expect(result.events[0]?.id).toBe('circuit-validation-0')
    expect(result.events[0]?.taskId).toBe('task-1')
    expect(result.prose).toBe('Working on slice.')
  })
})

describe('harness message filters', () => {
  it('detects session banner meta lines', () => {
    expect(isHarnessMetaMessage('OpenCode session abc12345 · provider/model')).toBe(true)
    expect(isHarnessMetaMessage('Hello from the agent')).toBe(false)
  })

  it('detects phase harness prompts with context pack', () => {
    const prompt = `# design phase

## Context pack

## .Circuit/tasks/ticket/00-ticket.md

Fix the bug

Run the design phase using the context above.`
    expect(isPhaseHarnessPrompt(prompt)).toBe(true)
    expect(isPhaseHarnessPrompt('Here is my design doc')).toBe(false)
  })
})

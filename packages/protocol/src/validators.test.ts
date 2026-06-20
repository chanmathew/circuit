import { describe, expect, it } from 'vitest'

import { parseDecisionPayload, parseValidationPayload } from './validators.js'

describe('parseDecisionPayload', () => {
  it('accepts valid payloads', () => {
    expect(
      parseDecisionPayload({
        decisionId: 'd1',
        title: 'Choose routing',
        options: [{ id: 'a', label: 'Option A' }],
      }),
    ).toMatchObject({ decisionId: 'd1' })
  })

  it('rejects missing options', () => {
    expect(parseDecisionPayload({ decisionId: 'd1', title: 'X', options: [] })).toBeUndefined()
  })

  it('rejects invalid option entries', () => {
    expect(
      parseDecisionPayload({
        decisionId: 'd1',
        title: 'X',
        options: [{ id: '', label: 'Bad' }],
      }),
    ).toBeUndefined()
  })
})

describe('parseValidationPayload', () => {
  it('requires command, exitCode, and passed', () => {
    expect(
      parseValidationPayload({ command: 'pnpm test', exitCode: 0, passed: true }),
    ).toBeDefined()
    expect(
      parseValidationPayload({ command: 'pnpm test', exitCode: '0', passed: true }),
    ).toBeUndefined()
  })
})

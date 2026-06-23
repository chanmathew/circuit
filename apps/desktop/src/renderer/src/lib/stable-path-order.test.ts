import { describe, expect, it } from 'vitest'

import { mergeStablePathOrder } from './stable-path-order.js'

describe('mergeStablePathOrder', () => {
  it('keeps existing order when the path set is unchanged', () => {
    expect(mergeStablePathOrder(['b.ts', 'a.ts', 'c.ts'], ['b.ts', 'a.ts', 'c.ts'])).toEqual([
      'b.ts',
      'a.ts',
      'c.ts',
    ])
  })

  it('drops removed paths and appends new paths alphabetically', () => {
    expect(mergeStablePathOrder(['b.ts', 'a.ts'], ['b.ts', 'd.ts', 'c.ts'])).toEqual([
      'b.ts',
      'c.ts',
      'd.ts',
    ])
  })

  it('appends patch paths missing from a preferred inspector order', () => {
    expect(mergeStablePathOrder(['b.ts', 'a.ts'], ['b.ts', 'a.ts', 'z.ts'])).toEqual([
      'b.ts',
      'a.ts',
      'z.ts',
    ])
  })
})

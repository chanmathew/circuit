import { describe, expect, it } from 'vitest'

import { activityRowLabelParts, resolveActivityRowFileTarget } from './activity-file-target.js'

describe('resolveActivityRowFileTarget', () => {
  it('prefers structured filePath and openAs', () => {
    expect(
      resolveActivityRowFileTarget({
        label: 'Edited index.html',
        filePath: 'index.html',
        openAs: 'diff',
      }),
    ).toEqual({ filePath: 'index.html', openAs: 'diff' })
  })

  it('parses Reading and Edited labels when fields are missing', () => {
    expect(
      resolveActivityRowFileTarget({
        label: 'Reading index.html',
      }),
    ).toEqual({ filePath: 'index.html', openAs: 'file' })

    expect(
      resolveActivityRowFileTarget({
        label: 'Edited index.html',
      }),
    ).toEqual({ filePath: 'index.html', openAs: 'diff' })
  })

  it('infers diff openAs from line stats when openAs is missing', () => {
    expect(
      resolveActivityRowFileTarget({
        label: 'Edited index.html',
        filePath: 'index.html',
        additions: 1,
      }),
    ).toEqual({ filePath: 'index.html', openAs: 'diff' })
  })
})

describe('activityRowLabelParts', () => {
  it('splits verb prefix from filename', () => {
    expect(
      activityRowLabelParts({
        label: 'Reading index.html',
        filePath: 'index.html',
        openAs: 'file',
      }),
    ).toEqual({
      prefix: 'Reading ',
      fileName: 'index.html',
      filePath: 'index.html',
      openAs: 'file',
    })

    expect(
      activityRowLabelParts({
        label: 'Edited index.html',
        filePath: 'index.html',
        openAs: 'diff',
        additions: 1,
      }),
    ).toEqual({
      prefix: 'Edited ',
      fileName: 'index.html',
      filePath: 'index.html',
      openAs: 'diff',
    })
  })
})

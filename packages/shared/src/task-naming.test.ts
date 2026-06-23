import { describe, expect, it } from 'vitest'

import {
  ensureUniqueSlug,
  generateBranchName,
  generateTitle,
  renderTicketMarkdown,
  slugify,
} from './task-naming.js'

describe('slugify', () => {
  it('converts titles to kebab-case', () => {
    expect(slugify('Invoice Inbox Triage')).toBe('invoice-inbox-triage')
  })

  it('strips punctuation', () => {
    expect(slugify('Fix: auth bug (urgent)!')).toBe('fix-auth-bug-urgent')
  })
})

describe('generateTitle', () => {
  it('uses the first sentence from a description', () => {
    expect(
      generateTitle(
        'Add invoice inbox triage for AP emails. Classify incoming emails into PDF invoice.',
      ),
    ).toBe('Add invoice inbox triage for AP emails')
  })

  it('returns Untitled task for empty input', () => {
    expect(generateTitle('   ')).toBe('Untitled task')
  })
})

describe('generateBranchName', () => {
  it('prefixes slug with Circuit/', () => {
    expect(generateBranchName('invoice-inbox-triage')).toBe('Circuit/invoice-inbox-triage')
  })
})

describe('ensureUniqueSlug', () => {
  it('appends a numeric suffix when slug collides', () => {
    expect(ensureUniqueSlug('invoice-inbox-triage', ['invoice-inbox-triage'])).toBe(
      'invoice-inbox-triage-2',
    )
  })
})

describe('renderTicketMarkdown', () => {
  it('renders the ticket artifact template', () => {
    const markdown = renderTicketMarkdown({
      title: 'Invoice inbox triage',
      description: 'Add invoice inbox triage for AP emails.',
      workflowLabel: 'Guided Build',
      branchName: 'Circuit/invoice-inbox-triage',
      createdAt: '2026-06-18T12:00:00.000Z',
    })

    expect(markdown).toContain('# Invoice inbox triage')
    expect(markdown).toContain('## Description')
    expect(markdown).toContain('Add invoice inbox triage for AP emails.')
    expect(markdown).toContain('Guided Build')
    expect(markdown).toContain('Circuit/invoice-inbox-triage')
    expect(markdown).toContain('2026-06-18T12:00:00.000Z')
  })
})

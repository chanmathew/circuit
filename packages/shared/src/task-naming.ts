const MAX_TITLE_LENGTH = 60

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
}

export function generateTitle(description: string): string {
  const trimmed = description.trim()
  if (!trimmed) {
    return 'Untitled task'
  }

  const firstLine =
    trimmed
      .split('\n')
      .find((line) => line.trim())
      ?.trim() ?? trimmed
  const sentenceMatch = firstLine.match(/^[^.!?]+[.!?]?/)
  const candidate = (sentenceMatch?.[0] ?? firstLine).trim()

  if (candidate.length <= MAX_TITLE_LENGTH) {
    return candidate.replace(/[.!?]+$/, '').trim() || 'Untitled task'
  }

  const truncated = candidate.slice(0, MAX_TITLE_LENGTH).trim()
  const lastSpace = truncated.lastIndexOf(' ')
  if (lastSpace > MAX_TITLE_LENGTH * 0.5) {
    return truncated.slice(0, lastSpace)
  }

  return truncated
}

export function generateBranchName(slug: string): string {
  return `Circuit/${slug}`
}

export function ensureUniqueSlug(baseSlug: string, existingSlugs: string[]): string {
  if (!existingSlugs.includes(baseSlug)) {
    return baseSlug
  }

  let counter = 2
  while (existingSlugs.includes(`${baseSlug}-${counter}`)) {
    counter += 1
  }

  return `${baseSlug}-${counter}`
}

export interface TicketContentInput {
  title: string
  description: string
  workflowLabel: string
  branchName: string
  createdAt: string
}

export function renderTicketMarkdown(input: TicketContentInput): string {
  return `# ${input.title}

## Description

${input.description.trim()}

## Workflow

${input.workflowLabel}

## Branch

${input.branchName}

## Created

${input.createdAt}
`
}

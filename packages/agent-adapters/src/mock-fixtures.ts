export interface MockPhaseOutput {
  artifactContent: string
  transcript: string
  filesRead: string[]
}

const QUESTIONS_ARTIFACT = `# Questions

## Product / scope

1. Should classification run before or after existing webhook dispatch?
2. Are there categories beyond PDF invoice, no-PDF invoice, and needs review?

## Research targets

- \`src/email/processor.ts\` — current routing entrypoint
- Webhook payload schema and tests
`

const RESEARCH_ARTIFACT = `# Research

## Current behavior

- Incoming AP emails are routed in \`src/email/processor.ts\`.
- Webhook payload is built in \`src/webhook/buildPayload.ts\`.
- Existing tests live under \`tests/email/\`.

## Risks

- Classification must not break current webhook consumers.
`

const DESIGN_ARTIFACT = `# Design

## Recommended approach

Add a classifier primitive and call it from the processor before webhook dispatch.

## Key decisions

- Use label-based routing for MVP.
- Preserve existing webhook fields; add optional \`category\`.

## Assumptions

- No new external API dependencies for MVP.
`

const STRUCTURE_ARTIFACT = `# Structure

## Vertical slices

1. Classifier types + pure function
2. Processor integration + webhook extension
3. End-to-end tests

## File map

| File | Change |
|------|--------|
| \`src/email/classifier.ts\` | Create |
| \`src/email/processor.ts\` | Modify |
`

const PLAN_ARTIFACT = `# Plan

## Slice 1 — Classifier foundation

- Add types and classifier function
- Unit tests

**Validation:** \`pnpm test --filter classifier\`

## Slice 2 — Processor integration

- Wire classifier into processor
- Extend webhook payload

**Validation:** \`pnpm test tests/email\`
`

const FIXTURES: Record<string, MockPhaseOutput> = {
  questions: {
    artifactContent: QUESTIONS_ARTIFACT,
    filesRead: [],
    transcript: `Starting Questions phase.

Reviewing the ticket and drafting clarifying questions.

\`\`\`circuit-decision
{"decisionId":"classifier-order","title":"Should classification run before or after webhook dispatch?","options":[{"id":"before","label":"Before dispatch","recommended":true},{"id":"after","label":"After dispatch"},{"id":"defer","label":"Defer — research first"}],"phase":"questions"}
\`\`\`

\`\`\`circuit-decision
{"decisionId":"category-set","title":"Are there categories beyond PDF invoice, no-PDF invoice, and needs review?","options":[{"id":"three","label":"Three categories only","recommended":true},{"id":"more","label":"Add more categories now"},{"id":"unsure","label":"Unsure — needs research"}],"phase":"questions"}
\`\`\`

\`\`\`circuit-artifact
{"phase":"questions","path":".Circuit/tasks/example/01-questions.md","title":"01-questions.md","status":"needs_review"}
\`\`\`

Questions artifact ready for review.`,
  },
  research: {
    artifactContent: RESEARCH_ARTIFACT,
    filesRead: [
      'src/email/processor.ts',
      'src/webhook/buildPayload.ts',
      'tests/email/processor.test.ts',
    ],
    transcript: `Starting Research phase.

Reading codebase paths from the research plan.

\`\`\`circuit-artifact
{"phase":"research","path":".Circuit/tasks/example/02-research.md","title":"02-research.md","status":"needs_review"}
\`\`\`

Research complete — findings written to artifact.`,
  },
  design: {
    artifactContent: DESIGN_ARTIFACT,
    filesRead: ['src/email/processor.ts'],
    transcript: `Starting Design phase.

Proposing approach and surfacing decisions.

\`\`\`circuit-decision
{"decisionId":"routing-strategy","title":"Choose routing strategy","options":[{"id":"labels","label":"Use labels","recommended":true},{"id":"folders","label":"Use folders"},{"id":"compare","label":"Compare more"}],"phase":"design"}
\`\`\`

\`\`\`circuit-artifact
{"phase":"design","path":".Circuit/tasks/example/03-design.md","title":"03-design.md","status":"needs_review"}
\`\`\`

Design artifact ready for review.`,
  },
  structure: {
    artifactContent: STRUCTURE_ARTIFACT,
    filesRead: [],
    transcript: `Starting Structure phase.

\`\`\`circuit-artifact
{"phase":"structure","path":".Circuit/tasks/example/04-structure.md","title":"04-structure.md","status":"needs_review"}
\`\`\`

Structure artifact ready.`,
  },
  plan: {
    artifactContent: PLAN_ARTIFACT,
    filesRead: [],
    transcript: `Starting Plan phase.

\`\`\`circuit-artifact
{"phase":"plan","path":".Circuit/tasks/example/05-plan.md","title":"05-plan.md","status":"needs_review"}
\`\`\`

Plan artifact ready.`,
  },
}

export function getMockPhaseOutput(phase: string): MockPhaseOutput {
  return (
    FIXTURES[phase] ?? {
      artifactContent: `# ${phase}\n\nMock output for ${phase} phase.\n`,
      filesRead: [],
      transcript: `Completed mock run for ${phase}.`,
    }
  )
}

export const MOCK_RUNNABLE_PHASES = new Set(Object.keys(FIXTURES))

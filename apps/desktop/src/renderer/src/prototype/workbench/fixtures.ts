import type {
  ActivityEvent,
  ChangedFile,
  ImplementationSlice,
  PrototypeArtifact,
  PrototypePhase,
  RevisionDraft,
  ScenarioId,
  WorkbenchState,
} from './types.js'
import { getFocusPhaseForScenario, getStructuredForScenario } from './structured-data.js'

const DEFAULT_REVISION: RevisionDraft = { note: '' }

function withScenarioDefaults(
  scenario: ScenarioId,
  state: Omit<
    WorkbenchState,
    'structured' | 'focusPhase' | 'revisionOpen' | 'revisionDraft' | 'revisionLog' | 'sliceFeedback'
  >,
): WorkbenchState {
  return {
    ...state,
    structured: getStructuredForScenario(scenario),
    focusPhase: getFocusPhaseForScenario(scenario),
    revisionOpen: false,
    revisionDraft: { ...DEFAULT_REVISION },
    revisionLog: [],
    sliceFeedback: '',
  }
}

const PHASE_LABELS: Record<string, string> = {
  questions: 'Questions',
  research: 'Research',
  design: 'Design',
  structure: 'Structure',
  plan: 'Plan',
  implement: 'Implement',
  review: 'Review',
}

export const PHASE_ORDER = [
  'questions',
  'research',
  'design',
  'structure',
  'plan',
  'implement',
  'review',
] as const

const TICKET = `# Invoice inbox triage

## Description

Add invoice inbox triage for AP emails. Classify incoming emails into PDF invoice, invoice without PDF, and needs review. Preserve existing webhook behavior and add tests.

## Workflow

Structured Change

## Branch

\`Circuit/invoice-inbox-triage\`
`

const QUESTIONS = `# Questions

## Codebase research targets

- \`src/inbox/\` — current email ingestion pipeline
- \`src/webhooks/\` — existing webhook handlers and event shapes
- \`tests/inbox/\` — coverage for classification edge cases

## Human judgment needed

1. Should "needs review" emails block downstream AP automation or only flag in UI?
2. Is there an existing classification enum we must extend vs. a new type?
3. What SLA applies before an email escalates from "needs review"?

## Risks

- Webhook payload changes may break external consumers
- PDF detection may differ between MIME types and attachments
`

const RESEARCH = `# Research

## Current behavior

- Inbound emails land in \`InboxProcessor.handleMessage()\` (\`src/inbox/processor.ts:42\`)
- Webhooks emit \`inbox.message.received\` with a fixed schema (\`src/webhooks/events.ts\`)
- No classification step exists today — all messages route to the same handler

## Relevant tests

- \`tests/inbox/processor.test.ts\` — 12 cases, none for attachment types
- \`tests/webhooks/emit.test.ts\` — asserts payload shape

## Unknowns

- Whether PDF detection should use libmagic or filename heuristics
`

const DESIGN = `# Design

## Current state

Single handler path for all inbound AP emails.

## Desired end state

Three-way classification at ingestion with unchanged webhook contract for existing event types.

## Recommended approach

Add a \`Classifier\` module invoked before routing. Extend webhook payload with optional \`classification\` field (backward compatible).

## Options considered

| Option | Pros | Cons |
|--------|------|------|
| Pre-route classifier | Minimal churn | New dependency on MIME parsing |
| Separate microservice | Isolated | Overkill for MVP |

## Key decisions

- **Decision:** Extend payload additively — needs your approval
- **Decision:** Use existing \`AttachmentInspector\` for PDF detection

\`\`\`mermaid
flowchart LR
  Email --> Classifier
  Classifier --> PDFInvoice
  Classifier --> NoPDF
  Classifier --> NeedsReview
\`\`\`
`

const STRUCTURE = `# Structure

## File map

| File | Role |
|------|------|
| \`src/inbox/classifier.ts\` | Classification logic |
| \`src/inbox/types.ts\` | \`EmailClassification\` enum |
| \`src/inbox/processor.ts\` | Wire classifier before route |
| \`tests/inbox/classifier.test.ts\` | Unit tests |

## Vertical slices

1. **Slice 1:** Types + classifier (no routing change)
2. **Slice 2:** Wire into processor + webhook extension
3. **Slice 3:** Integration tests + docs

## Validation

\`pnpm test --filter inbox\`
`

const PLAN = `# Plan

## Slice 1 — Classifier foundation

**Scope:** Types and pure classification logic

**Files:** \`classifier.ts\`, \`types.ts\`, \`classifier.test.ts\`

**Steps:**
1. Add \`EmailClassification\` enum
2. Implement \`classifyInboundEmail()\`
3. Unit tests for PDF, no-PDF, ambiguous cases

**Validation:** \`pnpm test src/inbox/classifier.test.ts\`

---

## Slice 2 — Processor integration

**Scope:** Wire classifier, extend webhook payload

**Validation:** \`pnpm test --filter inbox\`

---

## Slice 3 — End-to-end

**Scope:** Integration tests, update README

**Validation:** \`pnpm test\`
`

const REVIEW = `# Review

## Plan alignment

All three slices implemented. Webhook contract preserved via additive field.

## Diff summary

- +248 / −12 across 6 files
- New classifier module with 94% branch coverage

## Validation

\`\`\`
pnpm test — 847 passed
\`\`\`

## PR summary

### Summary

- Add three-way AP email classification at inbox ingestion
- Extend webhook payload with optional \`classification\` field (backward compatible)
- Preserve existing webhook event types and handlers

### Test plan

- [ ] Classify email with PDF attachment → \`pdf_invoice\`
- [ ] Classify email without PDF → \`invoice_without_pdf\`
- [ ] Ambiguous content → \`needs_review\`
- [ ] Existing webhook consumers receive unchanged base payload
`

function buildPhases(statuses: Record<string, PrototypePhase['status']>): PrototypePhase[] {
  return PHASE_ORDER.map((name) => ({
    name,
    label: PHASE_LABELS[name] ?? name,
    status: statuses[name] ?? 'locked',
  }))
}

function artifact(
  phase: string,
  filename: string,
  content: string,
  status: PrototypeArtifact['status'],
): PrototypeArtifact {
  return {
    id: filename,
    filename,
    phase,
    title: filename,
    content,
    status,
  }
}

const BASE_ACTIVITY: ActivityEvent[] = [
  {
    id: 'a1',
    timestamp: '10:02:14',
    type: 'message',
    content: 'Starting Questions phase for invoice inbox triage.',
  },
  {
    id: 'a2',
    timestamp: '10:02:18',
    type: 'file_read',
    content: 'Read src/inbox/processor.ts',
  },
  {
    id: 'a3',
    timestamp: '10:02:22',
    type: 'file_read',
    content: 'Read src/webhooks/events.ts',
  },
  {
    id: 'a4',
    timestamp: '10:03:01',
    type: 'message',
    content: 'Wrote 01-questions.md — awaiting approval.',
  },
]

const SLICES: ImplementationSlice[] = [
  {
    id: 's1',
    title: 'Slice 1 — Classifier foundation',
    scope: 'Types and pure classification logic',
    status: 'done',
    filesExpected: ['src/inbox/classifier.ts', 'src/inbox/types.ts'],
  },
  {
    id: 's2',
    title: 'Slice 2 — Processor integration',
    scope: 'Wire classifier, extend webhook payload',
    status: 'active',
    filesExpected: ['src/inbox/processor.ts', 'src/webhooks/events.ts'],
  },
  {
    id: 's3',
    title: 'Slice 3 — End-to-end',
    scope: 'Integration tests and docs',
    status: 'pending',
    filesExpected: ['tests/inbox/integration.test.ts'],
  },
]

const CHANGED_FILES: ChangedFile[] = [
  { path: 'src/inbox/classifier.ts', additions: 87, deletions: 0 },
  { path: 'src/inbox/types.ts', additions: 12, deletions: 0 },
  { path: 'src/inbox/processor.ts', additions: 34, deletions: 8 },
  { path: 'src/webhooks/events.ts', additions: 6, deletions: 1 },
  { path: 'tests/inbox/classifier.test.ts', additions: 109, deletions: 0 },
]

export function createScenarioState(scenario: ScenarioId): WorkbenchState {
  const baseArtifacts = [
    artifact('ticket', '00-ticket.md', TICKET, 'approved'),
    artifact('questions', '01-questions.md', QUESTIONS, 'draft'),
    artifact('research', '02-research.md', RESEARCH, 'draft'),
    artifact('design', '03-design.md', DESIGN, 'draft'),
    artifact('structure', '04-structure.md', STRUCTURE, 'draft'),
    artifact('plan', '05-plan.md', PLAN, 'draft'),
    artifact('implement', '06-implementation-log.md', '# Implementation log\n\n_(empty)_', 'draft'),
    artifact('review', '07-review.md', REVIEW, 'draft'),
  ]

  switch (scenario) {
    case 'early':
      return withScenarioDefaults('early', {
        task: {
          title: 'Invoice inbox triage',
          repoName: 'chorus-client-runtime',
          branchName: 'Circuit/invoice-inbox-triage',
          slug: 'invoice-inbox-triage',
          workflowLabel: 'Structured Change',
          status: 'needs_review',
          nextAction: 'Approve questions',
        },
        phases: buildPhases({
          questions: 'needs_review',
          research: 'locked',
        }),
        artifacts: baseArtifacts.map((a) =>
          a.filename === '01-questions.md'
            ? { ...a, content: QUESTIONS, status: 'needs_review' as const }
            : a.filename === '00-ticket.md'
              ? { ...a, status: 'approved' as const }
              : a,
        ),
        activity: BASE_ACTIVITY,
        changedFiles: [],
        slices: [],
        selectedArtifactId: '01-questions.md',
        mainMode: 'artifact',
        rightTab: 'artifacts',
        validationOutput: null,
        isAgentRunning: false,
        activeSliceIndex: 0,
      })

    case 'research':
      return withScenarioDefaults('research', {
        task: {
          title: 'Invoice inbox triage',
          repoName: 'chorus-client-runtime',
          branchName: 'Circuit/invoice-inbox-triage',
          slug: 'invoice-inbox-triage',
          workflowLabel: 'Structured Change',
          status: 'needs_review',
          nextAction: 'Verify research findings',
        },
        phases: buildPhases({
          questions: 'approved',
          research: 'needs_review',
        }),
        artifacts: baseArtifacts.map((a) => {
          if (a.filename === '01-questions.md')
            return { ...a, content: QUESTIONS, status: 'approved' as const }
          if (a.filename === '02-research.md')
            return { ...a, content: RESEARCH, status: 'needs_review' as const }
          if (a.filename === '00-ticket.md') return { ...a, status: 'approved' as const }
          return a
        }),
        activity: [
          ...BASE_ACTIVITY,
          {
            id: 'r1',
            timestamp: '10:10:00',
            type: 'message',
            content: 'Questions approved. Running research.',
          },
          { id: 'r2', timestamp: '10:14:00', type: 'message', content: 'Wrote 02-research.md.' },
        ],
        changedFiles: [],
        slices: [],
        selectedArtifactId: '02-research.md',
        mainMode: 'artifact',
        rightTab: 'artifacts',
        validationOutput: null,
        isAgentRunning: false,
        activeSliceIndex: 0,
      })

    case 'design':
      return withScenarioDefaults('design', {
        task: {
          title: 'Invoice inbox triage',
          repoName: 'chorus-client-runtime',
          branchName: 'Circuit/invoice-inbox-triage',
          slug: 'invoice-inbox-triage',
          workflowLabel: 'Structured Change',
          status: 'needs_review',
          nextAction: 'Resolve design decisions',
        },
        phases: buildPhases({
          questions: 'approved',
          research: 'approved',
          design: 'needs_review',
        }),
        artifacts: baseArtifacts.map((a) => {
          if (a.filename === '01-questions.md')
            return { ...a, content: QUESTIONS, status: 'approved' as const }
          if (a.filename === '02-research.md')
            return { ...a, content: RESEARCH, status: 'approved' as const }
          if (a.filename === '03-design.md')
            return { ...a, content: DESIGN, status: 'needs_review' as const }
          if (a.filename === '00-ticket.md') return { ...a, status: 'approved' as const }
          return a
        }),
        activity: [
          ...BASE_ACTIVITY,
          {
            id: 'd1',
            timestamp: '10:20:00',
            type: 'message',
            content: 'Research approved. Running design.',
          },
          {
            id: 'd2',
            timestamp: '10:26:00',
            type: 'message',
            content: 'Wrote 03-design.md — decisions need approval.',
          },
        ],
        changedFiles: [],
        slices: [],
        selectedArtifactId: '03-design.md',
        mainMode: 'artifact',
        rightTab: 'artifacts',
        validationOutput: null,
        isAgentRunning: false,
        activeSliceIndex: 0,
      })

    case 'mid':
      return withScenarioDefaults('mid', {
        task: {
          title: 'Invoice inbox triage',
          repoName: 'chorus-client-runtime',
          branchName: 'Circuit/invoice-inbox-triage',
          slug: 'invoice-inbox-triage',
          workflowLabel: 'Structured Change',
          status: 'needs_review',
          nextAction: 'Approve structure',
        },
        phases: buildPhases({
          questions: 'approved',
          research: 'approved',
          design: 'approved',
          structure: 'needs_review',
          plan: 'locked',
        }),
        artifacts: baseArtifacts.map((a) => {
          if (a.filename === '01-questions.md')
            return { ...a, content: QUESTIONS, status: 'approved' as const }
          if (a.filename === '02-research.md')
            return { ...a, content: RESEARCH, status: 'approved' as const }
          if (a.filename === '03-design.md')
            return { ...a, content: DESIGN, status: 'approved' as const }
          if (a.filename === '04-structure.md')
            return { ...a, content: STRUCTURE, status: 'needs_review' as const }
          if (a.filename === '00-ticket.md') return { ...a, status: 'approved' as const }
          return a
        }),
        activity: [
          ...BASE_ACTIVITY,
          {
            id: 'a5',
            timestamp: '10:15:00',
            type: 'message',
            content: 'Research complete — 02-research.md approved.',
          },
          {
            id: 'a6',
            timestamp: '10:28:00',
            type: 'message',
            content: 'Design complete — awaiting structure.',
          },
          { id: 'a7', timestamp: '10:35:12', type: 'message', content: 'Wrote 04-structure.md.' },
        ],
        changedFiles: [],
        slices: [],
        selectedArtifactId: '04-structure.md',
        mainMode: 'artifact',
        rightTab: 'artifacts',
        validationOutput: null,
        isAgentRunning: false,
        activeSliceIndex: 0,
      })

    case 'plan':
      return withScenarioDefaults('plan', {
        task: {
          title: 'Invoice inbox triage',
          repoName: 'chorus-client-runtime',
          branchName: 'Circuit/invoice-inbox-triage',
          slug: 'invoice-inbox-triage',
          workflowLabel: 'Structured Change',
          status: 'needs_review',
          nextAction: 'Unlock implementation',
        },
        phases: buildPhases({
          questions: 'approved',
          research: 'approved',
          design: 'approved',
          structure: 'approved',
          plan: 'needs_review',
        }),
        artifacts: baseArtifacts.map((a) => {
          if (
            [
              '00-ticket.md',
              '01-questions.md',
              '02-research.md',
              '03-design.md',
              '04-structure.md',
            ].includes(a.filename)
          ) {
            const content =
              a.filename === '04-structure.md'
                ? STRUCTURE
                : a.filename === '03-design.md'
                  ? DESIGN
                  : a.filename === '02-research.md'
                    ? RESEARCH
                    : a.filename === '01-questions.md'
                      ? QUESTIONS
                      : a.content
            return { ...a, content, status: 'approved' as const }
          }
          if (a.filename === '05-plan.md')
            return { ...a, content: PLAN, status: 'needs_review' as const }
          return a
        }),
        activity: [
          {
            id: 'p1',
            timestamp: '11:00:00',
            type: 'message',
            content: 'Structure approved. Generating plan.',
          },
          { id: 'p2', timestamp: '11:08:00', type: 'message', content: 'Wrote 05-plan.md.' },
        ],
        changedFiles: [],
        slices: [],
        selectedArtifactId: '05-plan.md',
        mainMode: 'artifact',
        rightTab: 'artifacts',
        validationOutput: null,
        isAgentRunning: false,
        activeSliceIndex: 0,
      })

    case 'implementing':
      return withScenarioDefaults('implementing', {
        task: {
          title: 'Invoice inbox triage',
          repoName: 'chorus-client-runtime',
          branchName: 'Circuit/invoice-inbox-triage',
          slug: 'invoice-inbox-triage',
          workflowLabel: 'Structured Change',
          status: 'implementing',
          nextAction: 'Review diff for slice 2',
        },
        phases: buildPhases({
          questions: 'approved',
          research: 'approved',
          design: 'approved',
          structure: 'approved',
          plan: 'approved',
          implement: 'running',
        }),
        artifacts: baseArtifacts.map((a) => {
          if (
            [
              '00-ticket.md',
              '01-questions.md',
              '02-research.md',
              '03-design.md',
              '04-structure.md',
              '05-plan.md',
            ].includes(a.filename)
          ) {
            const content =
              a.filename === '05-plan.md'
                ? PLAN
                : a.filename === '04-structure.md'
                  ? STRUCTURE
                  : a.filename === '03-design.md'
                    ? DESIGN
                    : a.filename === '02-research.md'
                      ? RESEARCH
                      : a.filename === '01-questions.md'
                        ? QUESTIONS
                        : a.content
            return { ...a, content, status: 'approved' as const }
          }
          if (a.filename === '06-implementation-log.md') {
            return {
              ...a,
              content:
                '# Implementation log\n\n## Slice 1 ✓\n- Added classifier + types\n- 109 tests passing\n\n## Slice 2 (in progress)\n- Wired processor\n- Extended webhook payload',
              status: 'draft' as const,
            }
          }
          return a
        }),
        activity: [
          {
            id: 'b1',
            timestamp: '11:00:00',
            type: 'message',
            content: 'Implementing slice 2 — processor integration.',
          },
          {
            id: 'b2',
            timestamp: '11:02:14',
            type: 'file_read',
            content: 'Read src/inbox/processor.ts',
          },
          {
            id: 'b3',
            timestamp: '11:05:33',
            type: 'command',
            content: 'pnpm test src/inbox/classifier.test.ts — 24 passed',
          },
          {
            id: 'b4',
            timestamp: '11:08:01',
            type: 'message',
            content: 'Modified 4 files. Ready for diff review.',
          },
        ],
        changedFiles: CHANGED_FILES,
        slices: SLICES,
        selectedArtifactId: '05-plan.md',
        mainMode: 'diff',
        rightTab: 'files',
        validationOutput: '24 passed · 0 failed · 1.2s',
        isAgentRunning: false,
        activeSliceIndex: 1,
      })

    case 'final':
      return withScenarioDefaults('final', {
        task: {
          title: 'Invoice inbox triage',
          repoName: 'chorus-client-runtime',
          branchName: 'Circuit/invoice-inbox-triage',
          slug: 'invoice-inbox-triage',
          workflowLabel: 'Structured Change',
          status: 'diff_ready',
          nextAction: 'Copy PR summary',
        },
        phases: buildPhases({
          questions: 'approved',
          research: 'approved',
          design: 'approved',
          structure: 'approved',
          plan: 'approved',
          implement: 'approved',
          review: 'needs_review',
        }),
        artifacts: baseArtifacts.map((a) => {
          if (a.filename === '07-review.md')
            return { ...a, content: REVIEW, status: 'needs_review' as const }
          if (a.filename === '06-implementation-log.md') {
            return {
              ...a,
              content: '# Implementation log\n\nAll 3 slices complete.',
              status: 'approved' as const,
            }
          }
          if (a.filename !== '00-ticket.md') return { ...a, status: 'approved' as const }
          return { ...a, status: 'approved' as const }
        }),
        activity: [
          {
            id: 'c1',
            timestamp: '14:00:00',
            type: 'message',
            content: 'All slices approved. Generating final review.',
          },
          { id: 'c2', timestamp: '14:01:22', type: 'command', content: 'pnpm test — 847 passed' },
          {
            id: 'c3',
            timestamp: '14:02:00',
            type: 'message',
            content: 'Wrote 07-review.md with PR summary.',
          },
        ],
        changedFiles: CHANGED_FILES,
        slices: SLICES.map((s) => ({ ...s, status: 'done' as const })),
        selectedArtifactId: '07-review.md',
        mainMode: 'final_review',
        rightTab: 'artifacts',
        validationOutput: '847 passed · 0 failed · 12.4s',
        isAgentRunning: false,
        activeSliceIndex: 2,
      })
  }
}

export const SCENARIO_LABELS: Record<ScenarioId, string> = {
  early: 'Questions',
  research: 'Research',
  design: 'Design',
  mid: 'Structure',
  plan: 'Plan',
  implementing: 'Implement',
  final: 'Review',
}

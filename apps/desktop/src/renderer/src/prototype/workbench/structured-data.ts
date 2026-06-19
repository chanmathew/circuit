import type {
  HumanQaItem,
  PhaseStructuredData,
  PlanSliceDetail,
  ResearchFinding,
  ReviewChecklistItem,
  ScenarioId,
  StructureSliceItem,
} from './types.js'

export const QUESTIONS_HUMAN_QA: HumanQaItem[] = [
  {
    id: 'hq1',
    question: 'Should "needs review" emails block downstream AP automation or only flag in UI?',
    answer: '',
    status: 'pending',
    owner: 'human',
    choices: [
      { id: 'hq1-a', label: 'Flag in UI only', recommended: true },
      { id: 'hq1-b', label: 'Block downstream automation' },
      { id: 'hq1-c', label: 'Block only high-value invoices' },
    ],
  },
  {
    id: 'hq2',
    question: 'Is there an existing classification enum we must extend vs. a new type?',
    answer: '',
    status: 'pending',
    owner: 'human',
    choices: [
      { id: 'hq2-a', label: 'Extend existing enum', recommended: true },
      { id: 'hq2-b', label: 'New enum / type' },
    ],
  },
  {
    id: 'hq3',
    question: 'What SLA applies before an email escalates from "needs review"?',
    answer: '',
    status: 'pending',
    owner: 'human',
    choices: [
      { id: 'hq3-a', label: '24 hours', recommended: true },
      { id: 'hq3-b', label: '4 business hours' },
      { id: 'hq3-c', label: 'No SLA — manual only' },
    ],
  },
]

export const DESIGN_DECISIONS: HumanQaItem[] = [
  {
    id: 'd1',
    question: 'Extend webhook payload additively with optional classification field?',
    answer: '',
    status: 'pending',
    owner: 'human',
    choices: [
      { id: 'd1-a', label: 'Accept — backward compatible', recommended: true },
      { id: 'd1-b', label: 'Reject' },
      { id: 'd1-c', label: 'Override with different approach' },
    ],
  },
  {
    id: 'd2',
    question: 'Use AttachmentInspector for PDF detection vs libmagic?',
    answer: '',
    status: 'pending',
    owner: 'human',
    choices: [
      { id: 'd2-a', label: 'AttachmentInspector (already in inbox pipeline)', recommended: true },
      { id: 'd2-b', label: 'libmagic' },
      { id: 'd2-c', label: 'Override with different approach' },
    ],
  },
]

export const DESIGN_OPEN_QUESTIONS: HumanQaItem[] = [
  {
    id: 'oq1',
    question: 'Should ambiguous MIME types default to "needs review" or "invoice without PDF"?',
    answer: '',
    status: 'pending',
    owner: 'human',
    choices: [
      { id: 'oq1-a', label: 'Default to needs review', recommended: true },
      { id: 'oq1-b', label: 'Default to invoice without PDF' },
    ],
  },
]

export const RESEARCH_FINDINGS: ResearchFinding[] = [
  {
    id: 'f1',
    path: 'src/inbox/processor.ts:42',
    fact: 'All inbound messages route through InboxProcessor.handleMessage() with no classification',
    status: 'unverified',
  },
  {
    id: 'f2',
    path: 'src/webhooks/events.ts',
    fact: 'Webhook emits inbox.message.received with fixed schema — no classification field today',
    status: 'unverified',
  },
  {
    id: 'f3',
    path: 'tests/inbox/processor.test.ts',
    fact: '12 test cases — none cover attachment type variants',
    status: 'unverified',
  },
]

export const STRUCTURE_SLICES: StructureSliceItem[] = [
  {
    id: 'ss1',
    title: 'Slice 1 — Classifier foundation',
    scope: 'Types + pure classification logic',
    files: ['src/inbox/classifier.ts', 'src/inbox/types.ts'],
    status: 'pending',
  },
  {
    id: 'ss2',
    title: 'Slice 2 — Processor integration',
    scope: 'Wire classifier, extend webhook payload',
    files: ['src/inbox/processor.ts', 'src/webhooks/events.ts'],
    status: 'pending',
  },
  {
    id: 'ss3',
    title: 'Slice 3 — End-to-end',
    scope: 'Integration tests + docs',
    files: ['tests/inbox/integration.test.ts'],
    status: 'pending',
  },
]

export const PLAN_SLICES: PlanSliceDetail[] = [
  {
    id: 'ps1',
    title: 'Slice 1 — Classifier foundation',
    goal: 'Types and pure classification logic',
    steps: ['Add EmailClassification enum', 'Implement classifyInboundEmail()', 'Unit tests'],
    validation: 'pnpm test src/inbox/classifier.test.ts',
    status: 'pending',
  },
  {
    id: 'ps2',
    title: 'Slice 2 — Processor integration',
    goal: 'Wire classifier before routing',
    steps: ['Invoke classifier in processor', 'Extend webhook payload additively'],
    validation: 'pnpm test --filter inbox',
    status: 'pending',
  },
  {
    id: 'ps3',
    title: 'Slice 3 — End-to-end',
    goal: 'Integration tests and README',
    steps: ['Add integration tests', 'Update docs'],
    validation: 'pnpm test',
    status: 'pending',
  },
]

export const REVIEW_CHECKLIST: ReviewChecklistItem[] = [
  { id: 'rc1', label: 'All plan slices implemented', checked: false },
  { id: 'rc2', label: 'Webhook contract preserved (additive only)', checked: false },
  { id: 'rc3', label: 'Validation passed locally', checked: false },
]

export function getStructuredForScenario(scenario: ScenarioId): PhaseStructuredData {
  switch (scenario) {
    case 'early':
      return { mode: 'human_qa', items: structuredClone(QUESTIONS_HUMAN_QA) }
    case 'research':
      return { mode: 'research_verify', findings: structuredClone(RESEARCH_FINDINGS) }
    case 'design':
      return {
        mode: 'design_review',
        decisions: structuredClone(DESIGN_DECISIONS),
        openQuestions: structuredClone(DESIGN_OPEN_QUESTIONS),
      }
    case 'mid':
      return { mode: 'structure_slices', slices: structuredClone(STRUCTURE_SLICES) }
    case 'plan':
      return { mode: 'plan_slices', slices: structuredClone(PLAN_SLICES) }
    case 'final':
      return {
        mode: 'review_checklist',
        items: structuredClone(REVIEW_CHECKLIST),
        prSummary: `### Summary\n- Add three-way AP email classification at inbox ingestion\n- Extend webhook payload with optional classification field\n\n### Test plan\n- [ ] PDF attachment → pdf_invoice\n- [ ] No PDF → invoice_without_pdf`,
      }
    default:
      return { mode: 'none' }
  }
}

export function getFocusPhaseForScenario(scenario: ScenarioId): string | null {
  switch (scenario) {
    case 'early':
      return 'questions'
    case 'research':
      return 'research'
    case 'design':
      return 'design'
    case 'mid':
      return 'structure'
    case 'plan':
      return 'plan'
    case 'implementing':
      return 'implement'
    case 'final':
      return 'review'
    default:
      return null
  }
}

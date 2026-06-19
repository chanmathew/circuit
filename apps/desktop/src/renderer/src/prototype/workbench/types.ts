export type PhaseStatus =
  | 'locked'
  | 'ready'
  | 'running'
  | 'needs_review'
  | 'approved'
  | 'needs_revision'
  | 'stale'
  | 'failed'
  | 'skipped'

export type ArtifactStatus = 'draft' | 'needs_review' | 'approved' | 'stale'

export type MainMode = 'artifact' | 'implementation' | 'diff' | 'final_review'

export type RightTab = 'artifacts' | 'files' | 'git'

/** @deprecated use RightTab */
export type LeftTab = RightTab

export type ScenarioId =
  | 'early'
  | 'research'
  | 'design'
  | 'mid'
  | 'plan'
  | 'implementing'
  | 'final'

export type QaItemStatus = 'pending' | 'answered' | 'deferred'

export interface QaChoice {
  id: string
  label: string
  recommended?: boolean
}

export interface HumanQaItem {
  id: string
  question: string
  answer: string
  status: QaItemStatus
  owner: 'human' | 'agent'
  /** Multiple-choice options; agent may mark one as recommended. */
  choices?: QaChoice[]
  /** Set when user answered via custom text instead of a choice. */
  usedCustomAnswer?: boolean
}

export type FindingStatus = 'unverified' | 'confirmed' | 'disputed'

export interface ResearchFinding {
  id: string
  path: string
  fact: string
  status: FindingStatus
}

export interface StructureSliceItem {
  id: string
  title: string
  scope: string
  files: string[]
  status: 'pending' | 'approved' | 'needs_change'
}

export interface PlanSliceDetail {
  id: string
  title: string
  goal: string
  steps: string[]
  validation: string
  status: 'pending' | 'approved'
}

export interface ReviewChecklistItem {
  id: string
  label: string
  checked: boolean
}

export type PhaseStructuredData =
  | { mode: 'human_qa'; items: HumanQaItem[] }
  | { mode: 'research_verify'; findings: ResearchFinding[] }
  | { mode: 'design_review'; decisions: HumanQaItem[]; openQuestions: HumanQaItem[] }
  | { mode: 'structure_slices'; slices: StructureSliceItem[] }
  | { mode: 'plan_slices'; slices: PlanSliceDetail[] }
  | { mode: 'review_checklist'; items: ReviewChecklistItem[]; prSummary: string }
  | { mode: 'none' }

export interface RevisionDraft {
  note: string
}

export interface RevisionLogEntry {
  id: string
  timestamp: string
  phase: string
  note: string
}

export interface PrototypePhase {
  name: string
  label: string
  status: PhaseStatus
}

export interface PrototypeArtifact {
  id: string
  filename: string
  phase: string
  title: string
  content: string
  status: ArtifactStatus
}

export interface ActivityEvent {
  id: string
  timestamp: string
  type: 'message' | 'file_read' | 'command'
  content: string
}

export interface ChangedFile {
  path: string
  additions: number
  deletions: number
}

export interface ImplementationSlice {
  id: string
  title: string
  scope: string
  status: 'pending' | 'active' | 'done'
  filesExpected: string[]
}

export interface WorkbenchTask {
  title: string
  repoName: string
  branchName: string
  slug: string
  workflowLabel: string
  status: string
  nextAction: string
}

export interface WorkbenchState {
  task: WorkbenchTask
  phases: PrototypePhase[]
  artifacts: PrototypeArtifact[]
  activity: ActivityEvent[]
  changedFiles: ChangedFile[]
  slices: ImplementationSlice[]
  selectedArtifactId: string
  mainMode: MainMode
  rightTab: RightTab
  validationOutput: string | null
  isAgentRunning: boolean
  activeSliceIndex: number
  structured: PhaseStructuredData
  focusPhase: string | null
  revisionOpen: boolean
  revisionDraft: RevisionDraft
  revisionLog: RevisionLogEntry[]
  sliceFeedback: string
}

export interface WorkbenchActions {
  selectArtifact: (id: string) => void
  selectPhase: (name: string) => void
  setRightTab: (tab: RightTab) => void
  setMainMode: (mode: MainMode) => void
  approveCurrentPhase: () => void
  requestRevision: () => void
  runCurrentPhase: () => void
  implementNextSlice: () => void
  approveSlice: () => void
  requestSliceChanges: () => void
  runValidation: () => void
  resetScenario: (scenario: ScenarioId) => void
  openRevision: () => void
  closeRevision: () => void
  setRevisionNote: (note: string) => void
  submitRevision: () => void
  answerHumanQa: (id: string, answer: string, usedCustom?: boolean) => void
  deferHumanQa: (id: string) => void
  verifyFinding: (id: string, status: FindingStatus) => void
  approveStructureSlice: (id: string) => void
  approvePlanSlice: (id: string) => void
  toggleReviewChecklist: (id: string) => void
  setSliceFeedback: (text: string) => void
}

export interface WorkbenchLayoutProps {
  state: WorkbenchState
  actions: WorkbenchActions
}

/** @deprecated Use WorkbenchLayoutProps */
export type WorkbenchVariantProps = WorkbenchLayoutProps

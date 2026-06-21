import type { ReferenceTarget } from './stream-items.js'

/** Center panel content modes — heavy content renders here, not in the stream. */
export type ContentView =
  | { type: 'artifact'; artifactId: string }
  | { type: 'diff'; diffId: string; path?: string }
  | { type: 'check'; checkId: string }
  | { type: 'file'; path: string }
  | { type: 'implementation'; sliceId: string }
  | { type: 'final_review' }
  | { type: 'workflow_overview' }

export type InspectorTab = 'workflow' | 'files' | 'changes'

export interface InspectorSelection {
  tab: InspectorTab
  selectedId?: string
  /** When the changes tab is active, which subsection owns the selection. */
  changesKind?: 'diff' | 'check'
}

export interface ContentNavigationState {
  contentView: ContentView
  inspector: InspectorSelection
}

const INSPECTOR_TAB_BY_TARGET: Record<ReferenceTarget['type'], InspectorTab> = {
  artifact: 'workflow',
  file: 'files',
  diff: 'changes',
  check: 'changes',
  review: 'workflow',
}

function selectedIdForTarget(target: ReferenceTarget): string | undefined {
  switch (target.type) {
    case 'artifact':
      return target.artifactId
    case 'file':
      return target.path
    case 'diff':
      return target.diffId
    case 'check':
      return target.checkId
    case 'review':
      return target.reviewId
  }
}

/** Map a reference-card target to the center content view selection. */
export function referenceToContentView(target: ReferenceTarget): ContentView {
  switch (target.type) {
    case 'artifact':
      return { type: 'artifact', artifactId: target.artifactId }
    case 'file':
      return { type: 'file', path: target.path }
    case 'diff':
      return { type: 'diff', diffId: target.diffId }
    case 'check':
      return { type: 'check', checkId: target.checkId }
    case 'review':
      return { type: 'final_review' }
  }
}

/** Map a reference-card target to the right inspector tab + selection. */
export function referenceToInspectorSelection(target: ReferenceTarget): InspectorSelection {
  const tab = INSPECTOR_TAB_BY_TARGET[target.type]
  const selectedId = selectedIdForTarget(target)
  const changesKind =
    target.type === 'diff' ? 'diff' : target.type === 'check' ? 'check' : undefined

  return {
    tab,
    selectedId,
    ...(changesKind ? { changesKind } : {}),
  }
}

/** Update both content view and inspector when opening a stream reference card. */
export function openReference(target: ReferenceTarget): ContentNavigationState {
  return {
    contentView: referenceToContentView(target),
    inspector: referenceToInspectorSelection(target),
  }
}

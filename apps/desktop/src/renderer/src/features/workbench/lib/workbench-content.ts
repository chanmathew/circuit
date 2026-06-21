import type {
  CircuitDiffBlock,
  CircuitValidationBlock,
  ContentNavigationState,
  ContentView,
  InspectorSelection,
  InspectorTab,
  ReferenceTarget,
} from '@circuit/protocol'
import { openReference } from '@circuit/protocol'

import type { ArtifactDto, FeedEventDto, TaskDto } from '../../../../../shared/api.js'
import {
  isAwaitingFirstPhase,
  isWorkflowActive,
} from '../../../../../shared/workflow-status.js'

export interface DiffEntry {
  id: string
  title: string
  summary?: string
  paths: string[]
  timestamp: string
}

/** Ad-hoc diff when opening a changed file from the stream without a diff:ready slice. */
export const WORKSPACE_DIFF_ID = '__workspace__'

export function resolveDiffEntry(
  diffId: string,
  diffs: DiffEntry[],
  path?: string,
  allChangedPaths?: string[],
): DiffEntry | undefined {
  const fromFeed = diffs.find((entry) => entry.id === diffId)
  if (fromFeed) return fromFeed

  if (diffId === WORKSPACE_DIFF_ID) {
    if (path) {
      return {
        id: WORKSPACE_DIFF_ID,
        title: 'File changes',
        summary: path,
        paths: [path],
        timestamp: new Date().toISOString(),
      }
    }

    if (allChangedPaths && allChangedPaths.length > 0) {
      return {
        id: WORKSPACE_DIFF_ID,
        title: 'All changes',
        summary: `${allChangedPaths.length} file${allChangedPaths.length === 1 ? '' : 's'} changed`,
        paths: allChangedPaths,
        timestamp: new Date().toISOString(),
      }
    }
  }

  return undefined
}

export function findDiffForPath(diffs: DiffEntry[], path: string): DiffEntry | undefined {
  return [...diffs].reverse().find((entry) => entry.paths.includes(path))
}

export interface CheckEntry {
  id: string
  command: string
  passed: boolean
  exitCode: number
  output?: string
  timestamp: string
}

/** Inspector selection aligned with the active center content view. */
export function inspectorSelectionForTab(
  tab: InspectorTab,
  contentView: ContentView,
): InspectorSelection {
  switch (tab) {
    case 'workflow':
      if (contentView.type === 'artifact') {
        return { tab, selectedId: contentView.artifactId }
      }
      return { tab }
    case 'changes':
      if (contentView.type === 'diff') {
        return { tab, selectedId: contentView.diffId, changesKind: 'diff' }
      }
      if (contentView.type === 'check') {
        return { tab, selectedId: contentView.checkId, changesKind: 'check' }
      }
      return { tab }
    case 'files':
      if (contentView.type === 'file') {
        return { tab, selectedId: contentView.path }
      }
      return { tab }
  }
}

export function resolveArtifactRef(
  artifacts: ArtifactDto[],
  artifactRef: string,
): ArtifactDto | undefined {
  return (
    artifacts.find((artifact) => artifact.id === artifactRef) ??
    artifacts.find(
      (artifact) =>
        artifact.path === artifactRef ||
        artifact.path.endsWith(artifactRef) ||
        artifact.title === artifactRef,
    )
  )
}

function isNewerArtifact(candidate: ArtifactDto, current: ArtifactDto): boolean {
  if (candidate.version !== current.version) {
    return candidate.version > current.version
  }
  return candidate.updatedAt > current.updatedAt
}

/** Latest artifact for a phase — prefers phase.currentArtifactId, then highest version. */
export function resolvePhaseArtifact(
  task: Pick<TaskDto, 'phases' | 'artifacts'>,
  phaseName: string,
): ArtifactDto | undefined {
  const phase = task.phases.find((entry) => entry.name === phaseName)
  if (phase?.currentArtifactId) {
    const byId = task.artifacts.find((artifact) => artifact.id === phase.currentArtifactId)
    if (byId) return byId
  }

  let latest: ArtifactDto | undefined
  for (const artifact of task.artifacts) {
    if (artifact.phase !== phaseName) continue
    if (!latest || isNewerArtifact(artifact, latest)) {
      latest = artifact
    }
  }
  return latest
}

export function resolveArtifactId(artifacts: ArtifactDto[], target: ReferenceTarget): string | undefined {
  if (target.type !== 'artifact') return undefined
  return resolveArtifactRef(artifacts, target.artifactId)?.id
}

export function diffIdFromEvent(event: FeedEventDto, index: number): string {
  const payload = event.payload as CircuitDiffBlock
  return payload.sliceId ?? event.id ?? `diff-${index}`
}

export function diffsFromFeed(events: FeedEventDto[]): DiffEntry[] {
  const diffs: DiffEntry[] = []

  for (const [index, event] of events.entries()) {
    if (event.type !== 'diff:ready') continue
    const payload = event.payload as CircuitDiffBlock
    diffs.push({
      id: diffIdFromEvent(event, index),
      title: payload.summary ?? 'Diff ready',
      summary: `${payload.paths.length} file${payload.paths.length === 1 ? '' : 's'} changed`,
      paths: payload.paths,
      timestamp: event.timestamp,
    })
  }

  return diffs
}

export function checksFromFeed(events: FeedEventDto[]): CheckEntry[] {
  const byCommand = new Map<string, CheckEntry>()

  for (const event of events) {
    if (event.type !== 'validation:passed' && event.type !== 'validation:failed') continue
    const payload = event.payload as CircuitValidationBlock
    byCommand.set(payload.command, {
      id: payload.command,
      command: payload.command,
      passed: event.type === 'validation:passed',
      exitCode: payload.exitCode,
      output: payload.output,
      timestamp: event.timestamp,
    })
  }

  return [...byCommand.values()]
}

export function navigationForReference(
  target: ReferenceTarget,
  artifacts: ArtifactDto[],
): ContentNavigationState {
  const base = openReference(target)

  if (target.type === 'artifact') {
    const artifact = resolveArtifactRef(artifacts, target.artifactId)
    if (artifact) {
      return {
        contentView: { type: 'artifact', artifactId: artifact.id },
        inspector: { tab: 'workflow', selectedId: artifact.id },
      }
    }
  }

  if (target.type === 'diff') {
    return {
      contentView: base.contentView,
      inspector: { tab: 'changes', selectedId: target.diffId, changesKind: 'diff' },
    }
  }

  if (target.type === 'check') {
    return {
      contentView: base.contentView,
      inspector: { tab: 'changes', selectedId: target.checkId, changesKind: 'check' },
    }
  }

  return base
}

export function shouldShowWorkflowOverview(task: TaskDto): boolean {
  return isAwaitingFirstPhase(task.workflowStatus, task.phases)
}

function primaryArtifactId(task: TaskDto): string {
  const needsReviewPhase = task.phases.find((phase) => phase.status === 'needs_review')
  const activePhase = task.phases.find((phase) => phase.name === task.currentPhase)
  const phaseForArtifact = needsReviewPhase ?? activePhase
  const fromPhase = phaseForArtifact
    ? resolvePhaseArtifact(task, phaseForArtifact.name)
    : undefined
  return (
    fromPhase?.id ??
    resolvePhaseArtifact(task, task.currentPhase)?.id ??
    resolvePhaseArtifact(task, 'ticket')?.id ??
    task.artifacts[0]?.id ??
    ''
  )
}

export function defaultInspectorTab(task: TaskDto): InspectorTab {
  if (isWorkflowActive(task.workflowStatus)) {
    return 'workflow'
  }
  return 'files'
}

export function defaultNavigationForTask(task: TaskDto): ContentNavigationState {
  // Progressive disclosure: inspector defaults only; content opens on explicit user action.
  if (isAwaitingFirstPhase(task.workflowStatus, task.phases)) {
    return {
      contentView: { type: 'workflow_overview' },
      inspector: { tab: 'workflow' },
    }
  }

  if (isWorkflowActive(task.workflowStatus)) {
    return {
      contentView: { type: 'workflow_overview' },
      inspector: { tab: 'workflow' },
    }
  }

  const artifactId = primaryArtifactId(task)
  if (!artifactId) {
    return {
      contentView: { type: 'workflow_overview' },
      inspector: { tab: defaultInspectorTab(task) },
    }
  }

  return {
    contentView: { type: 'artifact', artifactId },
    inspector: { tab: 'workflow', selectedId: artifactId },
  }
}

export function defaultNavigation(artifactId: string): ContentNavigationState {
  return {
    contentView: { type: 'artifact', artifactId },
    inspector: { tab: 'workflow', selectedId: artifactId },
  }
}

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

import type { ArtifactDto, FeedEventDto } from '../../../../../shared/api.js'

export interface DiffEntry {
  id: string
  title: string
  summary?: string
  paths: string[]
  timestamp: string
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
    case 'artifacts':
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
        inspector: { tab: 'artifacts', selectedId: artifact.id },
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

export function defaultNavigation(artifactId: string): ContentNavigationState {
  return {
    contentView: { type: 'artifact', artifactId },
    inspector: { tab: 'artifacts', selectedId: artifactId },
  }
}

import { describe, expect, it } from 'vitest'

import { latestArtifactPerPhase, type ArtifactRow } from '@circuit/db'
import { openReference } from '@circuit/protocol'

import type { ArtifactDto, PhaseDto, TaskDto } from '../../../../../shared/api.js'
import { inspectorSelectionForTab, resolvePhaseArtifact, resolveDiffEntry, findDiffForPath, WORKSPACE_DIFF_ID } from './workbench-content.js'

function dbArtifact(
  overrides: Partial<ArtifactRow> & Pick<ArtifactRow, 'id' | 'phase'>,
): ArtifactRow {
  return {
    taskId: 'task-1',
    workflowRunId: 'run-1',
    path: `/tmp/${overrides.phase}.md`,
    title: `${overrides.phase}.md`,
    content: 'content',
    status: 'draft',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    version: 1,
    ...overrides,
  }
}

describe('latestArtifactPerPhase', () => {
  it('keeps the highest version per phase', () => {
    const rows = latestArtifactPerPhase([
      dbArtifact({ id: 'design-v1', phase: 'design', version: 1, updatedAt: '2026-01-01T00:00:00.000Z' }),
      dbArtifact({ id: 'design-v2', phase: 'design', version: 2, updatedAt: '2026-01-02T00:00:00.000Z' }),
      dbArtifact({ id: 'plan-v1', phase: 'plan', version: 1 }),
    ])

    expect(rows.map((row) => row.id).sort()).toEqual(['design-v2', 'plan-v1'])
  })
})

function phase(name: string, currentArtifactId: string | null = null): PhaseDto {
  return {
    id: `${name}-phase`,
    taskId: 'task-1',
    name,
    label: name,
    status: 'needs_review',
    order: 1,
    currentArtifactId,
    staleReason: null,
  }
}

function artifact(
  overrides: Partial<ArtifactDto> & Pick<ArtifactDto, 'id' | 'phase'>,
): ArtifactDto {
  return {
    taskId: 'task-1',
    path: `/tmp/${overrides.phase}.md`,
    title: `${overrides.phase}.md`,
    content: overrides.id,
    status: 'needs_review',
    version: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function task(phases: PhaseDto[], artifacts: ArtifactDto[]): TaskDto {
  return {
    id: 'task-1',
    repoId: 'repo-1',
    repoName: 'Repo',
    repoPath: '/repo',
    title: 'Task',
    slug: 'task',
    description: 'desc',
    workflowType: 'balanced',
    status: 'needs_review',
    currentPhase: phases[0]?.name ?? 'questions',
    branchName: 'branch',
    workspacePath: '/repo',
    workspaceStrategy: 'direct',
    interactionMode: 'chat',
    taskMode: 'auto',
    workflowStatus: 'active',
    pausedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ticketContent: '',
    phases,
    artifacts,
    feedEvents: [],
    decisionResolutions: [],
    requiredDecisionsByPhase: {},
    needsIntake: false,
  }
}

describe('resolvePhaseArtifact', () => {
  it('prefers phase.currentArtifactId', () => {
    const resolved = resolvePhaseArtifact(
      task(
        [phase('design', 'design-v2')],
        [
          artifact({ id: 'design-v1', phase: 'design', version: 1 }),
          artifact({ id: 'design-v2', phase: 'design', version: 2 }),
        ],
      ),
      'design',
    )

    expect(resolved?.id).toBe('design-v2')
  })

  it('falls back to the highest version when currentArtifactId is missing', () => {
    const resolved = resolvePhaseArtifact(
      task(
        [phase('design')],
        [
          artifact({ id: 'design-v1', phase: 'design', version: 1 }),
          artifact({ id: 'design-v2', phase: 'design', version: 2 }),
        ],
      ),
      'design',
    )

    expect(resolved?.id).toBe('design-v2')
  })
})

describe('file navigation', () => {
  it('maps file references to the files inspector tab', () => {
    const navigation = openReference({ type: 'file', path: 'src/index.ts' })
    expect(navigation.contentView).toEqual({ type: 'file', path: 'src/index.ts' })
    expect(navigation.inspector).toEqual({ tab: 'files', selectedId: 'src/index.ts' })
  })

  it('keeps file selection when switching to the files tab', () => {
    const selection = inspectorSelectionForTab('files', { type: 'file', path: 'README.md' })
    expect(selection).toEqual({ tab: 'files', selectedId: 'README.md' })
  })

  it('resolves workspace diff entries for changed files without a diff slice', () => {
    const diff = resolveDiffEntry(WORKSPACE_DIFF_ID, [], 'src/index.ts', ['a.ts', 'src/index.ts'])
    expect(diff?.title).toBe('All changes')
    expect(diff?.paths).toEqual(['a.ts', 'src/index.ts'])
  })

  it('falls back to a single path when git status paths are unavailable', () => {
    const diff = resolveDiffEntry(WORKSPACE_DIFF_ID, [], 'src/index.ts')
    expect(diff?.paths).toEqual(['src/index.ts'])
  })

  it('resolves aggregate workspace diff entries from git status paths', () => {
    const diff = resolveDiffEntry(WORKSPACE_DIFF_ID, [], undefined, ['a.ts', 'b.ts'])
    expect(diff?.title).toBe('All changes')
    expect(diff?.paths).toEqual(['a.ts', 'b.ts'])
  })

  it('finds the latest diff slice containing a path', () => {
    const diffs = [
      { id: 'd1', title: 'A', paths: ['a.ts'], timestamp: '1' },
      { id: 'd2', title: 'B', paths: ['b.ts', 'c.ts'], timestamp: '2' },
    ]
    expect(findDiffForPath(diffs, 'c.ts')?.id).toBe('d2')
  })
})

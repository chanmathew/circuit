import { describe, expect, it } from 'vitest'

import { latestArtifactPerPhase, type ArtifactRow } from '@circuit/db'

import type { ArtifactDto, PhaseDto, TaskDto } from '../../../../../shared/api.js'
import { resolvePhaseArtifact } from './workbench-content.js'

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

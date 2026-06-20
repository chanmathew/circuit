import { useMemo, useState } from 'react'

import { Badge, cn, ScrollArea } from '@circuit/ui'
import type { PhaseStatus } from '@circuit/workflow'

import type { ArtifactDto, PhaseDto, TaskDto } from '../../../shared/api.js'

const PHASE_STATUS_DOT: Record<PhaseStatus, string> = {
  locked: 'bg-muted-foreground/30',
  ready: 'bg-primary',
  running: 'bg-amber-500',
  needs_review: 'bg-sky-500',
  approved: 'bg-emerald-500',
  needs_revision: 'bg-orange-500',
  stale: 'bg-red-400',
  failed: 'bg-red-600',
  skipped: 'bg-muted-foreground/40',
}

function PhaseRail({
  phases,
  currentPhase,
}: {
  phases: PhaseDto[]
  currentPhase: string
}): React.ReactElement {
  return (
    <div className="flex min-w-0 flex-1 items-center justify-center gap-0.5 overflow-x-auto px-2">
      {phases.map((phase, i) => (
        <div key={phase.id} className="flex shrink-0 items-center">
          <div
            className={cn(
              'flex items-center gap-1 rounded-full px-2 py-1 text-[11px]',
              phase.name === currentPhase && 'bg-primary/10 text-primary ring-1 ring-primary/30',
              phase.status === 'needs_review' &&
                'bg-sky-500/15 text-sky-800 dark:text-sky-200 ring-1 ring-sky-500/30',
              phase.status === 'running' &&
                'bg-amber-500/15 text-amber-800 dark:text-amber-200 animate-pulse',
              phase.status === 'approved' && phase.name !== currentPhase && 'text-muted-foreground',
              phase.status === 'locked' && 'opacity-30',
            )}
            title={`${phase.label} (${phase.status})`}
          >
            <span
              className={cn('h-1.5 w-1.5 rounded-full shrink-0', PHASE_STATUS_DOT[phase.status])}
            />
            <span className="font-medium whitespace-nowrap">{phase.label}</span>
          </div>
          {i < phases.length - 1 && (
            <span className="mx-0.5 text-muted-foreground/30 text-[10px]">·</span>
          )}
        </div>
      ))}
    </div>
  )
}

function ArtifactTree({
  artifacts,
  selectedId,
  onSelect,
}: {
  artifacts: ArtifactDto[]
  selectedId: string
  onSelect: (id: string) => void
}): React.ReactElement {
  return (
    <ScrollArea className="flex-1">
      <ul className="space-y-0.5 p-2">
        {artifacts.map((artifact) => (
          <li key={artifact.id}>
            <button
              type="button"
              onClick={() => onSelect(artifact.id)}
              className={cn(
                'flex w-full flex-col items-start rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent',
                selectedId === artifact.id && 'bg-accent',
              )}
            >
              <span className="font-mono font-medium">{artifact.title}</span>
              <span className="text-[10px] text-muted-foreground capitalize">
                {artifact.status}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </ScrollArea>
  )
}

export interface TaskWorkbenchProps {
  task: TaskDto
}

export function TaskWorkbench({ task }: TaskWorkbenchProps): React.ReactElement {
  const defaultArtifactId = useMemo(() => {
    const current = task.artifacts.find((a) => a.phase === task.currentPhase)
    return (
      current?.id ??
      task.artifacts.find((a) => a.phase === 'ticket')?.id ??
      task.artifacts[0]?.id ??
      ''
    )
  }, [task])

  const [selectedArtifactId, setSelectedArtifactId] = useState(defaultArtifactId)
  const selectedArtifact = task.artifacts.find((a) => a.id === selectedArtifactId)

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
      <header className="shrink-0 border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-3">
          <div className="min-w-0 shrink-0">
            <p className="truncate text-sm font-semibold">{task.title}</p>
            <p className="truncate font-mono text-[10px] text-muted-foreground">
              {task.branchName}
            </p>
          </div>
          {task.phases.length > 0 ? (
            <PhaseRail phases={task.phases} currentPhase={task.currentPhase} />
          ) : (
            <p className="text-xs text-muted-foreground">No workflow phases</p>
          )}
          <Badge variant="outline" className="shrink-0 text-[10px] capitalize">
            {task.status.replace(/_/g, ' ')}
          </Badge>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-52 shrink-0 flex-col border-r border-border">
          <p className="shrink-0 border-b border-border px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Artifacts
          </p>
          <ArtifactTree
            artifacts={task.artifacts}
            selectedId={selectedArtifactId}
            onSelect={setSelectedArtifactId}
          />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col min-h-0">
          {selectedArtifact ? (
            <>
              <div className="shrink-0 border-b border-border px-4 py-2">
                <h2 className="text-sm font-semibold">{selectedArtifact.title}</h2>
                <p className="font-mono text-[10px] text-muted-foreground truncate">
                  {selectedArtifact.path.replace(task.repoPath, '.')}
                </p>
              </div>
              <ScrollArea className="flex-1">
                <pre className="whitespace-pre-wrap p-4 font-mono text-sm leading-relaxed">
                  {selectedArtifact.content}
                </pre>
              </ScrollArea>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              Select an artifact
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

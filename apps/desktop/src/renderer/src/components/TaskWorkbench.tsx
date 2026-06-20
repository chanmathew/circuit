import { useEffect, useMemo, useState } from 'react'

import { Badge, Button, cn, ScrollArea, Textarea } from '@circuit/ui'
import type { PhaseStatus } from '@circuit/workflow'

import type { ArtifactDto, FeedEventDto, PhaseDto, TaskDto } from '../../../shared/api.js'

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

function formatEventLabel(event: FeedEventDto): string {
  switch (event.type) {
    case 'phase:started':
      return 'Phase started'
    case 'phase:completed':
      return 'Phase completed'
    case 'artifact:written':
      return 'Artifact written'
    case 'decision:required':
      return 'Decision required'
    case 'validation:passed':
      return 'Validation passed'
    case 'validation:failed':
      return 'Validation failed'
    case 'diff:ready':
      return 'Diff ready'
    case 'blocker:raised':
      return 'Blocker'
    default:
      return event.type
  }
}

function EventFeed({
  events,
  showRaw,
}: {
  events: FeedEventDto[]
  showRaw: boolean
}): React.ReactElement {
  const visible = showRaw
    ? events
    : events.filter((e) => e.type !== 'phase:started' && e.type !== 'phase:completed')

  return (
    <ScrollArea className="flex-1">
      <ul className="space-y-2 p-3">
        {visible.length === 0 && (
          <li className="text-xs text-muted-foreground">No activity yet.</li>
        )}
        {visible.map((event, i) => (
          <li
            key={event.id ?? `${event.type}-${i}`}
            className="rounded-md border border-border p-2"
          >
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {formatEventLabel(event)}
            </p>
            {event.type === 'decision:required' && isDecisionPayload(event.payload) && (
              <div className="mt-1 space-y-1">
                <p className="text-xs font-medium">{event.payload.title}</p>
                <div className="flex flex-wrap gap-1">
                  {event.payload.options.map((opt) => (
                    <Badge
                      key={opt.id}
                      variant={opt.recommended ? 'default' : 'outline'}
                      className="text-[10px]"
                    >
                      {opt.label}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {showRaw && (
              <pre className="mt-1 whitespace-pre-wrap font-mono text-[10px] text-muted-foreground">
                {JSON.stringify(event.payload, null, 2)}
              </pre>
            )}
          </li>
        ))}
      </ul>
    </ScrollArea>
  )
}

function isDecisionPayload(
  payload: unknown,
): payload is { title: string; options: { id: string; label: string; recommended?: boolean }[] } {
  if (typeof payload !== 'object' || payload === null) return false
  const p = payload as Record<string, unknown>
  return typeof p.title === 'string' && Array.isArray(p.options)
}

export interface TaskWorkbenchProps {
  task: TaskDto
  isRunning?: boolean
  onRunPhase: (phaseName: string) => void
  onApprovePhase: (phaseName: string) => void
  onRequestRevision: (phaseName: string, note: string) => void
}

export function TaskWorkbench({
  task,
  isRunning = false,
  onRunPhase,
  onApprovePhase,
  onRequestRevision,
}: TaskWorkbenchProps): React.ReactElement {
  const activePhase = task.phases.find((p) => p.name === task.currentPhase)
  const needsReviewPhase = task.phases.find((p) => p.status === 'needs_review')

  const defaultArtifactId = useMemo(() => {
    const phaseForArtifact = needsReviewPhase ?? activePhase
    const fromPhase = task.artifacts.find((a) => a.phase === phaseForArtifact?.name)
    return (
      fromPhase?.id ??
      task.artifacts.find((a) => a.phase === task.currentPhase)?.id ??
      task.artifacts.find((a) => a.phase === 'ticket')?.id ??
      task.artifacts[0]?.id ??
      ''
    )
  }, [task, activePhase, needsReviewPhase])

  const [selectedArtifactId, setSelectedArtifactId] = useState(defaultArtifactId)
  const [showRawFeed, setShowRawFeed] = useState(false)
  const [revisionOpen, setRevisionOpen] = useState(false)
  const [revisionNote, setRevisionNote] = useState('')

  useEffect(() => {
    setSelectedArtifactId(defaultArtifactId)
  }, [defaultArtifactId])

  const selectedArtifact = task.artifacts.find((a) => a.id === selectedArtifactId)
  const actionPhase = needsReviewPhase ?? activePhase

  const canRun =
    actionPhase &&
    (actionPhase.status === 'ready' || actionPhase.status === 'needs_revision') &&
    !isRunning

  const canApprove = actionPhase?.status === 'needs_review' && !isRunning
  const canRevise = actionPhase?.status === 'needs_review' && !isRunning

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

          <div className="shrink-0 border-t border-border px-4 py-2 flex flex-wrap items-center gap-2">
            {canRun && actionPhase && (
              <Button
                type="button"
                size="sm"
                disabled={isRunning}
                onClick={() => onRunPhase(actionPhase.name)}
              >
                {isRunning ? 'Running…' : `Run ${actionPhase.label}`}
              </Button>
            )}
            {canApprove && actionPhase && (
              <Button
                type="button"
                size="sm"
                variant="default"
                disabled={isRunning}
                onClick={() => onApprovePhase(actionPhase.name)}
              >
                Approve {actionPhase.label}
              </Button>
            )}
            {canRevise && actionPhase && !revisionOpen && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isRunning}
                onClick={() => setRevisionOpen(true)}
              >
                Request revision
              </Button>
            )}
            {revisionOpen && actionPhase && (
              <div className="flex w-full flex-col gap-2">
                <Textarea
                  value={revisionNote}
                  onChange={(e) => setRevisionNote(e.target.value)}
                  placeholder="What should change?"
                  className="min-h-16 text-sm"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={!revisionNote.trim() || isRunning}
                    onClick={() => {
                      onRequestRevision(actionPhase.name, revisionNote.trim())
                      setRevisionNote('')
                      setRevisionOpen(false)
                    }}
                  >
                    Submit revision
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setRevisionOpen(false)
                      setRevisionNote('')
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <aside className="flex w-64 shrink-0 flex-col border-l border-border">
          <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Activity
            </p>
            <button
              type="button"
              className="text-[10px] text-primary hover:underline"
              onClick={() => setShowRawFeed((v) => !v)}
            >
              {showRawFeed ? 'Structured' : 'Raw'}
            </button>
          </div>
          <EventFeed events={task.feedEvents} showRaw={showRawFeed} />
        </aside>
      </div>
    </div>
  )
}

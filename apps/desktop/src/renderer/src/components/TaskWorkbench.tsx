import { useEffect, useMemo, useState } from 'react'

import { Badge, ScrollArea } from '@circuit/ui'

import type { PhaseDto, TaskDto } from '../../../shared/api.js'
import { DecisionCards, decisionsFromFeed } from './DecisionCards.js'
import { PhaseRail } from './PhaseRail.js'
import { TaskRightSidebar } from './TaskRightSidebar.js'
import { WorkbenchActionBar } from './WorkbenchActionBar.js'

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

  const phaseDecisions = useMemo(
    () => decisionsFromFeed(task.feedEvents, actionPhase?.name),
    [task.feedEvents, actionPhase?.name],
  )

  const feedWithoutDecisions = useMemo(
    () =>
      showRawFeed ? task.feedEvents : task.feedEvents.filter((e) => e.type !== 'decision:required'),
    [task.feedEvents, showRawFeed],
  )

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <header className="shrink-0 border-b border-border bg-card">
        <div className="flex items-center gap-3 px-4 py-2.5">
          <div className="min-w-0 shrink-0 max-w-[200px]">
            <p className="truncate text-sm font-semibold">{task.title}</p>
            <p className="truncate font-mono text-[10px] text-muted-foreground">{task.branchName}</p>
          </div>
          {task.phases.length > 0 ? (
            <PhaseRail
              phases={task.phases.map((p) => ({
                name: p.name,
                label: p.label,
                status: p.status,
              }))}
              currentPhase={task.currentPhase}
            />
          ) : (
            <p className="text-xs text-muted-foreground">No workflow phases</p>
          )}
          <Badge variant="outline" className="shrink-0 text-[10px] capitalize">
            {task.status.replace(/_/g, ' ')}
          </Badge>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col min-h-0">
          {selectedArtifact ? (
            <>
              <div className="shrink-0 border-b border-border px-4 py-2">
                <h2 className="text-sm font-semibold">{selectedArtifact.title}</h2>
                <p className="truncate font-mono text-[10px] text-muted-foreground">
                  {selectedArtifact.path.replace(task.repoPath, '.')}
                </p>
              </div>
              <ScrollArea className="min-h-0 flex-1">
                <pre className="whitespace-pre-wrap p-4 font-mono text-sm leading-relaxed">
                  {selectedArtifact.content}
                </pre>
                {actionPhase?.status === 'needs_review' && (
                  <DecisionCards decisions={phaseDecisions} />
                )}
              </ScrollArea>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-sm text-muted-foreground">
              <p>Select an artifact from the sidebar</p>
            </div>
          )}

          <WorkbenchActionBar
            actionPhase={actionPhase}
            isRunning={isRunning}
            canRun={Boolean(canRun)}
            canApprove={Boolean(canApprove)}
            canRevise={Boolean(canRevise)}
            showRunHint={Boolean(canRun && actionPhase && task.feedEvents.length === 0)}
            revisionOpen={revisionOpen}
            revisionNote={revisionNote}
            onRevisionNoteChange={setRevisionNote}
            onRunPhase={onRunPhase}
            onApprovePhase={onApprovePhase}
            onOpenRevision={() => setRevisionOpen(true)}
            onCloseRevision={() => {
              setRevisionOpen(false)
              setRevisionNote('')
            }}
            onSubmitRevision={(phaseName, note) => {
              onRequestRevision(phaseName, note)
              setRevisionNote('')
              setRevisionOpen(false)
            }}
          />
        </div>

        <TaskRightSidebar
          task={task}
          artifacts={task.artifacts}
          selectedArtifactId={selectedArtifactId}
          onSelectArtifact={setSelectedArtifactId}
          feedEvents={feedWithoutDecisions}
          showRawFeed={showRawFeed}
          onToggleRawFeed={() => setShowRawFeed((v) => !v)}
        />
      </div>
    </div>
  )
}

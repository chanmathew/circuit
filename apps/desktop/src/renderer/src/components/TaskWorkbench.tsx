import { useEffect, useMemo, useState } from 'react'

import { ScrollArea } from '@circuit/ui'

import type { TaskDto } from '../../../shared/api.js'
import { ArtifactPanel } from './ArtifactPanel.js'
import { DecisionCards, decisionsFromFeed } from './DecisionCards.js'
import { TaskChatPanel } from './TaskChatPanel.js'
import { TaskRightSidebar } from './TaskRightSidebar.js'
import { TaskWorkbenchHeader } from './TaskWorkbenchHeader.js'
import { WorkbenchActionBar } from './WorkbenchActionBar.js'
import {
  canApprovePhase,
  getApproveBlockedReason,
  getProceedLabel,
} from '../lib/phase-approval.js'

export interface TaskWorkbenchProps {
  task: TaskDto
  isRunning?: boolean
  onRunPhase: (phaseName: string) => void
  onApprovePhase: (phaseName: string) => void
  onRequestRevision: (phaseName: string, note: string) => void
  onResolveDecision: (
    phase: string,
    decisionId: string,
    optionId: string,
    optionLabel: string,
  ) => void
}

export function TaskWorkbench({
  task,
  isRunning = false,
  onRunPhase,
  onApprovePhase,
  onRequestRevision,
  onResolveDecision,
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
  const [preview, setPreview] = useState(true)
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

  const phaseResolutions = useMemo(
    () =>
      actionPhase
        ? task.decisionResolutions.filter((r) => r.phase === actionPhase.name)
        : [],
    [task.decisionResolutions, actionPhase],
  )

  const approveBlockedReason = useMemo(() => {
    if (!actionPhase || !canApprove) return null
    if (!canApprovePhase(task.feedEvents, phaseResolutions, actionPhase.name)) {
      return getApproveBlockedReason(task.feedEvents, phaseResolutions, actionPhase.name)
    }
    return null
  }, [actionPhase, canApprove, task.feedEvents, phaseResolutions])

  const proceedLabel = actionPhase ? getProceedLabel(actionPhase.name) : undefined

  const showStructuredPanel =
    Boolean(actionPhase?.status === 'needs_review') &&
    selectedArtifact?.phase === actionPhase?.name &&
    phaseDecisions.length > 0

  const feedWithoutDecisions = useMemo(
    () =>
      showRawFeed ? task.feedEvents : task.feedEvents.filter((e) => e.type !== 'decision:required'),
    [task.feedEvents, showRawFeed],
  )

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <TaskWorkbenchHeader task={task} />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <TaskChatPanel feedEvents={task.feedEvents} />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {selectedArtifact ? (
            <ScrollArea className="min-h-0 flex-1">
              <ArtifactPanel
                title={selectedArtifact.title}
                relativePath={selectedArtifact.path.replace(task.repoPath, '.')}
                content={selectedArtifact.content}
                preview={preview}
                onPreviewChange={setPreview}
              />
              {showStructuredPanel && actionPhase && (
                <DecisionCards
                  decisions={phaseDecisions}
                  resolutions={phaseResolutions}
                  onSelectOption={(decisionId, option) =>
                    onResolveDecision(actionPhase.name, decisionId, option.id, option.label)
                  }
                />
              )}
            </ScrollArea>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-sm text-muted-foreground">
              <p>Select an artifact from the inspector</p>
            </div>
          )}

          <WorkbenchActionBar
            actionPhase={actionPhase}
            isRunning={isRunning}
            canRun={Boolean(canRun)}
            canApprove={Boolean(canApprove)}
            canRevise={Boolean(canRevise)}
            approveBlockedReason={approveBlockedReason}
            proceedLabel={proceedLabel}
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

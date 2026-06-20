import { useEffect, useMemo, useState } from 'react'

import { ScrollArea } from '@circuit/ui'

import type { TaskDto } from '../../../shared/api.js'
import { ArtifactPanel } from './ArtifactPanel.js'
import { CircuitAgentStream } from './stream/CircuitAgentStream.js'
import { TaskRightSidebar } from './TaskRightSidebar.js'
import { TaskWorkbenchHeader } from './TaskWorkbenchHeader.js'
import { WorkbenchActionBar } from './WorkbenchActionBar.js'
import { WorkbenchPanelLayout } from './WorkbenchPanelLayout.js'
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

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <TaskWorkbenchHeader task={task} />

      <WorkbenchPanelLayout
        stream={
          <CircuitAgentStream
            feedEvents={task.feedEvents}
            artifacts={task.artifacts}
            decisionResolutions={phaseResolutions}
            isRunning={isRunning}
            onResolveDecision={(decisionId, optionId, optionLabel) => {
              if (!actionPhase) return
              onResolveDecision(actionPhase.name, decisionId, optionId, optionLabel)
            }}
            onSelectArtifact={setSelectedArtifactId}
          />
        }
        content={
          <div className="flex h-full min-h-0 flex-col overflow-hidden">
            {selectedArtifact ? (
              <ScrollArea className="min-h-0 flex-1">
                <ArtifactPanel
                  title={selectedArtifact.title}
                  relativePath={selectedArtifact.path.replace(task.repoPath, '.')}
                  content={selectedArtifact.content}
                  preview={preview}
                  onPreviewChange={setPreview}
                />
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
        }
        inspector={
          <TaskRightSidebar
            task={task}
            artifacts={task.artifacts}
            selectedArtifactId={selectedArtifactId}
            onSelectArtifact={setSelectedArtifactId}
          />
        }
      />
    </div>
  )
}

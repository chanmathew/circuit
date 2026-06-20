import { useEffect, useMemo, useState } from 'react'

import type { ContentNavigationState, InspectorTab, ReferenceTarget } from '@circuit/protocol'
import { ScrollArea } from '@circuit/ui'

import type { TaskDto } from '../../../../shared/api.js'
import { CircuitAgentStream } from '../stream/CircuitAgentStream.js'
import { ContentViewPanel } from './ContentViewPanel.js'
import { TaskRightSidebar } from './TaskRightSidebar.js'
import { TaskWorkbenchHeader } from './TaskWorkbenchHeader.js'
import { WorkbenchActionBar } from './WorkbenchActionBar.js'
import { WorkbenchPanelLayout } from './WorkbenchPanelLayout.js'
import {
  canApprovePhase,
  getApproveBlockedReason,
  getProceedLabel,
} from './lib/phase-approval.js'
import {
  checksFromFeed,
  defaultNavigation,
  diffsFromFeed,
  inspectorSelectionForTab,
  navigationForReference,
} from './lib/workbench-content.js'

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

  const [navigation, setNavigation] = useState<ContentNavigationState>(() =>
    defaultNavigation(defaultArtifactId),
  )
  const [preview, setPreview] = useState(true)
  const [revisionOpen, setRevisionOpen] = useState(false)
  const [revisionNote, setRevisionNote] = useState('')

  useEffect(() => {
    setNavigation(defaultNavigation(defaultArtifactId))
  }, [defaultArtifactId])

  const diffs = useMemo(() => diffsFromFeed(task.feedEvents), [task.feedEvents])
  const checks = useMemo(() => checksFromFeed(task.feedEvents), [task.feedEvents])

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

  const requiredDecisions = actionPhase
    ? (task.requiredDecisionsByPhase[actionPhase.name] ?? [])
    : []

  const approveBlockedReason = useMemo(() => {
    if (!actionPhase || !canApprove) return null
    if (!canApprovePhase(requiredDecisions, phaseResolutions)) {
      return getApproveBlockedReason(requiredDecisions, phaseResolutions)
    }
    return null
  }, [actionPhase, canApprove, requiredDecisions, phaseResolutions])

  const proceedLabel = actionPhase ? getProceedLabel(actionPhase.name) : undefined

  const applyNavigation = (next: ContentNavigationState): void => {
    setNavigation(next)
  }

  const handleOpenReference = (target: ReferenceTarget): void => {
    applyNavigation(navigationForReference(target, task.artifacts))
  }

  const handleSelectArtifact = (artifactId: string): void => {
    applyNavigation({
      contentView: { type: 'artifact', artifactId },
      inspector: { tab: 'artifacts', selectedId: artifactId },
    })
  }

  const handleSelectDiff = (diffId: string): void => {
    applyNavigation({
      contentView: { type: 'diff', diffId },
      inspector: { tab: 'changes', selectedId: diffId, changesKind: 'diff' },
    })
  }

  const handleSelectCheck = (checkId: string): void => {
    applyNavigation({
      contentView: { type: 'check', checkId },
      inspector: { tab: 'changes', selectedId: checkId, changesKind: 'check' },
    })
  }

  const handleInspectorTabChange = (tab: InspectorTab): void => {
    setNavigation((current) => ({
      ...current,
      inspector: inspectorSelectionForTab(tab, current.contentView),
    }))
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <TaskWorkbenchHeader task={task} />

      <WorkbenchPanelLayout
        stream={
          <CircuitAgentStream
            taskId={task.id}
            feedEvents={task.feedEvents}
            decisionResolutions={task.decisionResolutions}
            isRunning={isRunning}
            onResolveDecision={(decisionId, optionId, optionLabel, phase) => {
              const resolvePhase = phase ?? actionPhase?.name
              if (!resolvePhase) return
              onResolveDecision(resolvePhase, decisionId, optionId, optionLabel)
            }}
            onOpenReference={handleOpenReference}
          />
        }
        content={
          <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <ScrollArea className="min-h-0 flex-1">
              <ContentViewPanel
                contentView={navigation.contentView}
                artifacts={task.artifacts}
                repoPath={task.repoPath}
                diffs={diffs}
                checks={checks}
                preview={preview}
                onPreviewChange={setPreview}
              />
            </ScrollArea>

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
            diffs={diffs}
            checks={checks}
            activeTab={navigation.inspector.tab}
            selectedId={navigation.inspector.selectedId}
            changesKind={navigation.inspector.changesKind}
            onTabChange={handleInspectorTabChange}
            onSelectArtifact={handleSelectArtifact}
            onSelectDiff={handleSelectDiff}
            onSelectCheck={handleSelectCheck}
          />
        }
      />
    </div>
  )
}

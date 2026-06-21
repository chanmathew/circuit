import { useEffect, useMemo, useState } from 'react'

import type { ContentNavigationState, InspectorTab, ReferenceTarget } from '@circuit/protocol'
import { ScrollArea, cn } from '@circuit/ui'

import type { TaskDto } from '../../../../shared/api.js'
import {
  hasStartedPhase,
  isWorkflowActive,
} from '../../../../shared/workflow-status.js'
import { CircuitAgentStream } from '../stream/CircuitAgentStream.js'
import { ContentViewPanel } from './ContentViewPanel.js'
import { TaskRightSidebar } from './TaskRightSidebar.js'
import { WorkbenchActionBar } from './WorkbenchActionBar.js'
import { WorkbenchPanelLayout } from './WorkbenchPanelLayout.js'
import {
  checksFromFeed,
  defaultNavigationForTask,
  diffsFromFeed,
  inspectorSelectionForTab,
  navigationForReference,
  resolvePhaseArtifact,
} from './lib/workbench-content.js'

export interface TaskWorkbenchProps {
  task: TaskDto
  className?: string
  isRunning?: boolean
  needsIntake?: boolean
  onRunPhase: (phaseName: string) => void
  onApprovePhase: (phaseName: string) => void
  onResolveDecision: (
    phase: string,
    decisionId: string,
    optionId: string,
    optionLabel: string,
  ) => void
}

function shouldOpenContentPanel(navigation: ContentNavigationState): boolean {
  const { contentView } = navigation
  return (
    contentView.type === 'artifact' ||
    contentView.type === 'diff' ||
    contentView.type === 'check' ||
    contentView.type === 'file'
  )
}

export function TaskWorkbench({
  task,
  className,
  isRunning = false,
  needsIntake = false,
  onRunPhase,
  onApprovePhase,
  onResolveDecision,
}: TaskWorkbenchProps): React.ReactElement {
  const activePhase = task.phases.find((p) => p.name === task.currentPhase)
  const needsReviewPhase = task.phases.find((p) => p.status === 'needs_review')

  const [navigation, setNavigation] = useState<ContentNavigationState>(() =>
    defaultNavigationForTask(task),
  )
  const [contentVisible, setContentVisible] = useState(() =>
    shouldOpenContentPanel(defaultNavigationForTask(task)),
  )
  const [inspectorPinned, setInspectorPinned] = useState(false)
  const [preview, setPreview] = useState(true)

  const showInspector =
    inspectorPinned ||
    isWorkflowActive(task.workflowStatus)

  const navigationKey = `${task.id}:${task.workflowStatus}:${hasStartedPhase(task.phases)}`

  useEffect(() => {
    const nextNavigation = defaultNavigationForTask(task)
    setNavigation(nextNavigation)
    setContentVisible(shouldOpenContentPanel(nextNavigation))
    setInspectorPinned(false)
  }, [navigationKey])

  useEffect(() => {
    if (!needsReviewPhase) return
    const artifact = resolvePhaseArtifact(task, needsReviewPhase.name)
    if (!artifact) return

    setContentVisible(true)
    setNavigation({
      contentView: { type: 'artifact', artifactId: artifact.id },
      inspector: { tab: 'workflow', selectedId: artifact.id },
    })
  }, [needsReviewPhase?.name, needsReviewPhase?.status, task])

  const diffs = useMemo(() => diffsFromFeed(task.feedEvents), [task.feedEvents])
  const checks = useMemo(() => checksFromFeed(task.feedEvents), [task.feedEvents])

  const actionPhase = needsReviewPhase ?? activePhase

  const canRun =
    actionPhase &&
    (actionPhase.status === 'ready' || actionPhase.status === 'needs_revision') &&
    !isRunning

  const revealContent = (next: ContentNavigationState): void => {
    setContentVisible(true)
    setNavigation(next)
  }

  const handleOpenReference = (target: ReferenceTarget): void => {
    revealContent(navigationForReference(target, task.artifacts))
  }

  const handleSelectArtifact = (artifactId: string): void => {
    revealContent({
      contentView: { type: 'artifact', artifactId },
      inspector: { tab: 'workflow', selectedId: artifactId },
    })
  }

  const handleSelectDiff = (diffId: string): void => {
    revealContent({
      contentView: { type: 'diff', diffId },
      inspector: { tab: 'changes', selectedId: diffId, changesKind: 'diff' },
    })
  }

  const handleSelectCheck = (checkId: string): void => {
    revealContent({
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

  const focusWorkflowPanel = (): void => {
    setInspectorPinned(true)
    setNavigation((current) => ({
      ...current,
      inspector: { tab: 'workflow', selectedId: current.inspector.selectedId },
    }))
  }

  const openWorkflowOverview = (): void => {
    revealContent({
      contentView: { type: 'workflow_overview' },
      inspector: { tab: 'workflow' },
    })
  }

  const openPhaseArtifact = (phaseName: string): void => {
    const artifact = resolvePhaseArtifact(task, phaseName)
    if (artifact) {
      handleSelectArtifact(artifact.id)
      return
    }
    openWorkflowOverview()
  }

  const openArtifactById = (artifactId: string): void => {
    const known = task.artifacts.find((entry) => entry.id === artifactId)
    if (known) {
      handleSelectArtifact(artifactId)
      return
    }
    void import('../../ipc/client.js').then(({ circuitApi }) =>
      circuitApi.getArtifact(artifactId).then((artifact) => {
        handleSelectArtifact(artifact.id)
      }),
    )
  }

  const streamPanel = (
    <CircuitAgentStream
      taskId={task.id}
      workspacePath={task.repoPath}
      feedEvents={task.feedEvents}
      phases={task.phases}
      artifacts={task.artifacts}
      decisionResolutions={task.decisionResolutions}
      needsIntake={needsIntake}
      workflowStatus={task.workflowStatus}
      workflowType={task.workflowType}
      isRunning={isRunning}
      needsReview={Boolean(needsReviewPhase)}
      onFocusWorkflowPanel={focusWorkflowPanel}
      onOpenWorkflowOverview={openWorkflowOverview}
      onOpenPhase={openPhaseArtifact}
      onOpenArtifact={openArtifactById}
      onApprovePhase={onApprovePhase}
      onResolveDecision={(decisionId, optionId, optionLabel, phase) => {
        const resolvePhase = phase ?? actionPhase?.name
        if (!resolvePhase) return
        onResolveDecision(resolvePhase, decisionId, optionId, optionLabel)
      }}
      onOpenReference={handleOpenReference}
    />
  )

  return (
    <div className={cn('flex h-full min-h-0 flex-col overflow-hidden', className)}>
      <WorkbenchPanelLayout
        layoutKey={`${task.id}-${contentVisible}-${showInspector}`}
        showContent={contentVisible}
        showInspector={showInspector}
        stream={streamPanel}
        content={
          <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <ScrollArea className="min-h-0 flex-1">
              <ContentViewPanel
                contentView={navigation.contentView}
                task={task}
                artifacts={task.artifacts}
                repoPath={task.repoPath}
                diffs={diffs}
                checks={checks}
                preview={preview}
                isRunning={isRunning}
                onPreviewChange={setPreview}
              />
            </ScrollArea>

            <WorkbenchActionBar
              actionPhase={actionPhase}
              isRunning={isRunning}
              canRun={Boolean(canRun)}
              showRunHint={Boolean(canRun && actionPhase && task.feedEvents.length === 0)}
              onRunPhase={onRunPhase}
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
            isRunning={isRunning}
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

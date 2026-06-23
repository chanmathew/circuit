import { useEffect, useMemo, useState } from 'react'

import type { ContentNavigationState, InspectorTab, ReferenceTarget } from '@circuit/protocol'
import { cn } from '@circuit/ui'

import type { TaskDto } from '../../../../shared/api.js'
import { hasStartedPhase } from '../../../../shared/workflow-status.js'
import { useStableWorkspacePathOrder } from '../../hooks/useStableWorkspacePathOrder.js'
import { CircuitAgentStream } from '../stream/CircuitAgentStream.js'
import { TitleBar } from '../../app/layout/TitleBar.js'
import { useWindowState } from '../../app/layout/useWindowState.js'
import { ContentViewPanel } from './ContentViewPanel.js'
import { PierreHighlightProvider } from '../../lib/pierre/PierreHighlightProvider.js'
import { TaskRightSidebar } from './TaskRightSidebar.js'
import { WorkbenchPanelLayout } from './WorkbenchPanelLayout.js'
import {
  checksFromFeed,
  defaultNavigationForTask,
  diffsFromFeed,
  findDiffForPath,
  inspectorSelectionForTab,
  navigationForReference,
  resolvePhaseArtifact,
  WORKSPACE_DIFF_ID,
} from './lib/workbench-content.js'

export interface TaskWorkbenchProps {
  task: TaskDto
  className?: string
  isRunning?: boolean
  needsIntake?: boolean
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
  const [inspectorOpen, setInspectorOpen] = useState(false)
  const [preview, setPreview] = useState(true)

  const showInspector = inspectorOpen
  const windowState = useWindowState()
  const isMac = windowState?.platform === 'darwin'

  const navigationKey = `${task.id}:${task.workflowStatus}:${hasStartedPhase(task.phases)}`

  useEffect(() => {
    const nextNavigation = defaultNavigationForTask(task)
    setNavigation(nextNavigation)
    setContentVisible(shouldOpenContentPanel(nextNavigation))
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
  const gitStatusQuery = useStableWorkspacePathOrder(task.workspacePath)
  const allChangedPaths = gitStatusQuery.orderedPaths

  const actionPhase = needsReviewPhase ?? activePhase

  const revealContent = (next: ContentNavigationState): void => {
    setContentVisible(true)
    setNavigation(next)
  }

  const openAllChanges = (): void => {
    revealContent({
      contentView: { type: 'diff', diffId: WORKSPACE_DIFF_ID },
      inspector: { tab: 'changes', selectedId: WORKSPACE_DIFF_ID, changesKind: 'diff' },
    })
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

  const handleSelectDiffPath = (diffId: string, path: string): void => {
    revealContent({
      contentView: { type: 'diff', diffId, path },
      inspector: { tab: 'changes', selectedId: diffId, changesKind: 'diff' },
    })
  }

  const handleSelectFile = (path: string): void => {
    revealContent({
      contentView: { type: 'file', path },
      inspector: { tab: 'files', selectedId: path },
    })
  }

  const handleOpenChangedFile = (path: string): void => {
    const matchingDiff = findDiffForPath(diffs, path)
    if (matchingDiff) {
      handleSelectDiffPath(matchingDiff.id, path)
      return
    }

    revealContent({
      contentView: { type: 'diff', diffId: WORKSPACE_DIFF_ID, path },
      inspector: { tab: 'changes', selectedId: WORKSPACE_DIFF_ID, changesKind: 'diff' },
    })
  }

  const handleSelectCheck = (checkId: string): void => {
    revealContent({
      contentView: { type: 'check', checkId },
      inspector: { tab: 'changes', selectedId: checkId, changesKind: 'check' },
    })
  }

  const handleInspectorTabChange = (tab: InspectorTab): void => {
    if (tab === 'changes' && allChangedPaths.length > 0) {
      openAllChanges()
      return
    }

    setNavigation((current) => ({
      ...current,
      inspector: inspectorSelectionForTab(tab, current.contentView),
    }))
  }

  const openInspector = (): void => {
    setInspectorOpen(true)
    setNavigation((current) => ({
      ...current,
      inspector: { tab: 'workflow', selectedId: current.inspector.selectedId },
    }))
  }

  const toggleInspector = (): void => {
    setInspectorOpen((current) => {
      const next = !current
      if (next) {
        setNavigation((nav) => ({
          ...nav,
          inspector: { tab: 'workflow', selectedId: nav.inspector.selectedId },
        }))
      }
      return next
    })
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
      workspacePath={task.workspacePath}
      feedEvents={task.feedEvents}
      phases={task.phases}
      artifacts={task.artifacts}
      decisionResolutions={task.decisionResolutions}
      needsIntake={needsIntake}
      workflowStatus={task.workflowStatus}
      workflowType={task.workflowType}
      taskMode={task.taskMode}
      activeWorkflowType={task.activeWorkflowRun?.workflowType}
      isRunning={isRunning}
      needsReview={Boolean(needsReviewPhase)}
      onFocusWorkflowPanel={openInspector}
      onOpenWorkflowOverview={openWorkflowOverview}
      onOpenPhase={openPhaseArtifact}
      onResolveDecision={(decisionId, optionId, optionLabel, phase) => {
        const resolvePhase = phase ?? actionPhase?.name
        if (!resolvePhase) return
        onResolveDecision(resolvePhase, decisionId, optionId, optionLabel)
      }}
      onOpenReference={handleOpenReference}
      onOpenChangedFile={handleOpenChangedFile}
    />
  )

  return (
    <PierreHighlightProvider>
      <div className={cn('flex h-full min-h-0 flex-col overflow-hidden', className)}>
        <WorkbenchPanelLayout
          layoutKey={task.id}
          titleBar={
            <TitleBar
              showWindowControls={!isMac && !showInspector}
              inspectorOpen={showInspector}
              onToggleInspector={toggleInspector}
            />
          }
          showContent={contentVisible}
          showInspector={showInspector}
          onInspectorExpand={() => setInspectorOpen(true)}
          onInspectorCollapse={() => setInspectorOpen(false)}
          stream={streamPanel}
          content={
            <div className="flex h-full min-h-0 flex-col overflow-hidden">
              <ContentViewPanel
                contentView={navigation.contentView}
                task={task}
                artifacts={task.artifacts}
                repoPath={task.repoPath}
                workspacePath={task.workspacePath}
                diffs={diffs}
                checks={checks}
                allChangedPaths={allChangedPaths}
                orderedPaths={allChangedPaths}
                preview={preview}
                isRunning={isRunning}
                onPreviewChange={setPreview}
                onSelectDiffPath={handleSelectDiffPath}
                onSelectFile={handleSelectFile}
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
              contentView={navigation.contentView}
              selectedId={navigation.inspector.selectedId}
              changesKind={navigation.inspector.changesKind}
              isRunning={isRunning}
              onTabChange={handleInspectorTabChange}
              onSelectArtifact={openArtifactById}
              onSelectFile={handleSelectFile}
              onSelectDiff={handleSelectDiff}
              onSelectCheck={handleSelectCheck}
                onOpenChangedFile={handleOpenChangedFile}
                onOpenAllChanges={openAllChanges}
                orderedChanges={gitStatusQuery.orderedChanges}
                onToggleInspector={toggleInspector}
              showWindowControls={!isMac && showInspector}
            />
          }
        />
      </div>
    </PierreHighlightProvider>
  )
}

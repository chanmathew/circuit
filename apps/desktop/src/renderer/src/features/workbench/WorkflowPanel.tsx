import { useState } from 'react'

import { Button } from '@circuit/ui'

import type { ArtifactDto, TaskDto } from '../../../../shared/api.js'
import type { WorkflowRunDto } from '../../../../shared/workflow-run.js'
import {
  canEnableWorkflow,
  hasPastWorkflowRuns,
  isWorkflowActive,
} from '../../../../shared/workflow-status.js'
import { useEnableWorkflow } from '../stream/hooks/useEnableWorkflow.js'
import { useStartFollowUpWorkflow } from '../stream/hooks/useStartFollowUpWorkflow.js'
import { ActiveWorkflowConflictDialog } from './ActiveWorkflowConflictDialog.js'
import { CurrentWorkflowSection } from './CurrentWorkflowSection.js'
import { PastWorkflowDetail } from './PastWorkflowDetail.js'
import { PastWorkflowsList } from './PastWorkflowsList.js'

export interface WorkflowPanelProps {
  task: TaskDto
  isRunning?: boolean
  onSelectArtifact?: (artifactId: string) => void
  onSelectPhase?: (phaseName: string) => void
}

type PendingAction = 'enable' | 'follow_up'

export function WorkflowPanel({
  task,
  isRunning = false,
  onSelectArtifact,
  onSelectPhase,
}: WorkflowPanelProps): React.ReactElement {
  const enableWorkflow = useEnableWorkflow(task.id)
  const startFollowUp = useStartFollowUpWorkflow(task.id)

  const [selectedPastRunId, setSelectedPastRunId] = useState<string | undefined>()
  const [conflictOpen, setConflictOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<PendingAction>('enable')

  const pastRuns = task.pastWorkflowRuns ?? []
  const hasPast = hasPastWorkflowRuns(pastRuns)
  const hasActive = Boolean(task.activeWorkflowRun) || isWorkflowActive(task.workflowStatus)
  const busy = isRunning || enableWorkflow.isPending || startFollowUp.isPending

  const openEnable = () => {
    if (hasActive) {
      setPendingAction('enable')
      setConflictOpen(true)
      return
    }
    enableWorkflow.mutate({})
  }

  const openFollowUp = () => {
    if (hasActive) {
      setPendingAction('follow_up')
      setConflictOpen(true)
      return
    }
    startFollowUp.mutate({})
  }

  const handleViewSummary = (run: WorkflowRunDto) => {
    if (run.completionSummaryArtifactId) {
      onSelectArtifact?.(run.completionSummaryArtifactId)
    }
    setSelectedPastRunId(run.id)
  }

  const showPastDetail = selectedPastRunId && !hasActive

  const conflictDialog = (
    <ActiveWorkflowConflictDialog
      open={conflictOpen}
      onOpenChange={setConflictOpen}
      pending={busy}
      startLabel={
        pendingAction === 'follow_up'
          ? 'Cancel current and start follow-up'
          : 'Cancel current and start new'
      }
      onContinue={() => setConflictOpen(false)}
      onCancelAndStart={async () => {
        setConflictOpen(false)
        if (pendingAction === 'follow_up') {
          await startFollowUp.mutateAsync({ replaceActive: true })
        } else {
          await enableWorkflow.mutateAsync({ replaceActive: true })
        }
      }}
    />
  )

  if (!hasActive && canEnableWorkflow(task.workflowStatus)) {
    return (
      <div className="space-y-4 p-3">
        <p className="text-xs text-muted-foreground">
          {hasPast
            ? 'Start a follow-up workflow or enable a fresh structured process.'
            : 'Attach a structured workflow with phases, artifacts, and review gates.'}
        </p>

        <div className="space-y-2">
          {hasPast ? (
            <Button
              type="button"
              size="sm"
              className="w-full"
              disabled={busy}
              onClick={openFollowUp}
            >
              Start follow-up workflow
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant={hasPast ? 'outline' : 'default'}
            className="w-full"
            disabled={busy}
            onClick={openEnable}
          >
            Enable workflow
          </Button>
        </div>

        {showPastDetail ? (
          <PastWorkflowDetail
            taskId={task.id}
            runId={selectedPastRunId!}
            onSelectArtifact={onSelectArtifact}
            onSelectPhase={(phaseName) => {
              void circuitApiGetRunPhase(task.id, selectedPastRunId!, phaseName, onSelectArtifact)
            }}
          />
        ) : (
          <PastWorkflowsList
            runs={pastRuns}
            selectedRunId={selectedPastRunId}
            onSelectRun={setSelectedPastRunId}
            onViewSummary={handleViewSummary}
          />
        )}

        {conflictDialog}
      </div>
    )
  }

  if (hasActive) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-4 p-3">
        <CurrentWorkflowSection
          task={task}
          isRunning={isRunning}
          onSelectArtifact={onSelectArtifact}
          onSelectPhase={onSelectPhase}
        />

        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-full"
          disabled={busy}
          onClick={openEnable}
        >
          Replace with new workflow
        </Button>

        <PastWorkflowsList
          runs={pastRuns}
          selectedRunId={selectedPastRunId}
          onSelectRun={setSelectedPastRunId}
          onViewSummary={handleViewSummary}
        />

        {selectedPastRunId && (
          <PastWorkflowDetail
            taskId={task.id}
            runId={selectedPastRunId}
            onSelectArtifact={onSelectArtifact}
            onSelectPhase={(phaseName) => {
              void circuitApiGetRunPhase(task.id, selectedPastRunId, phaseName, onSelectArtifact)
            }}
          />
        )}

        {conflictDialog}
      </div>
    )
  }

  return (
    <div className="space-y-4 p-3">
      {showPastDetail ? (
        <PastWorkflowDetail
          taskId={task.id}
          runId={selectedPastRunId!}
          onSelectArtifact={onSelectArtifact}
          onSelectPhase={(phaseName) => {
            void circuitApiGetRunPhase(task.id, selectedPastRunId!, phaseName, onSelectArtifact)
          }}
        />
      ) : (
        <PastWorkflowsList
          runs={pastRuns}
          selectedRunId={selectedPastRunId}
          onSelectRun={setSelectedPastRunId}
          onViewSummary={handleViewSummary}
        />
      )}

      <Button type="button" size="sm" className="w-full" disabled={busy} onClick={openFollowUp}>
        Start follow-up workflow
      </Button>

      {conflictDialog}
    </div>
  )
}

async function circuitApiGetRunPhase(
  taskId: string,
  runId: string,
  phaseName: string,
  onSelectArtifact?: (artifactId: string) => void,
): Promise<void> {
  const { circuitApi } = await import('../../ipc/client.js')
  const detail = await circuitApi.getWorkflowRun({ taskId, runId })
  const artifact = detail.artifacts.find((entry: ArtifactDto) => entry.phase === phaseName)
  if (artifact) onSelectArtifact?.(artifact.id)
}

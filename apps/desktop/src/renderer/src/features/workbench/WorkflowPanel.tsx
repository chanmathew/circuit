import { useState } from 'react'

import { Button } from '@circuit/ui'

import type { TaskDto } from '../../../../shared/api.js'
import type { WorkflowRunDto } from '../../../../shared/workflow-run.js'
import {
  canEnableWorkflow,
  hasPastWorkflowRuns,
  isWorkflowActive,
} from '../../../../shared/workflow-status.js'
import { useStartWorkflow } from '../stream/hooks/useStartWorkflow.js'
import { CurrentWorkflowSection } from './CurrentWorkflowSection.js'
import { PastWorkflowDetail } from './PastWorkflowDetail.js'
import { PastWorkflowsList } from './PastWorkflowsList.js'
import { ArtifactTree } from './ArtifactTree.js'
import type { ArtifactDto } from '../../../../shared/api.js'

export interface WorkflowPanelProps {
  task: TaskDto
  artifacts?: ArtifactDto[]
  isRunning?: boolean
  selectedArtifactId?: string
  onSelectArtifact?: (artifactId: string) => void
  onSelectPhase?: (phaseName: string) => void
}

export function WorkflowPanel({
  task,
  artifacts = task.artifacts,
  isRunning = false,
  selectedArtifactId,
  onSelectArtifact,
  onSelectPhase,
}: WorkflowPanelProps): React.ReactElement {
  const startWorkflow = useStartWorkflow(task.id)

  const [selectedPastRunId, setSelectedPastRunId] = useState<string | undefined>()

  const pastRuns = task.pastWorkflowRuns ?? []
  const hasPast = hasPastWorkflowRuns(pastRuns)
  const hasActive = Boolean(task.activeWorkflowRun) || isWorkflowActive(task.workflowStatus)
  const canStart = !hasActive && canEnableWorkflow(task.workflowStatus)
  const busy = isRunning || startWorkflow.isPending
  const hasContentAbovePast = canStart || hasActive

  const handleViewSummary = (run: WorkflowRunDto) => {
    if (run.completionSummaryArtifactId) {
      onSelectArtifact?.(run.completionSummaryArtifactId)
    }
  }

  if (selectedPastRunId) {
    return (
      <div className="flex min-h-0 flex-1 flex-col p-3 pt-4">
        <PastWorkflowDetail
          taskId={task.id}
          runId={selectedPastRunId}
          onBack={() => setSelectedPastRunId(undefined)}
          onSelectArtifact={onSelectArtifact}
        />
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-3">
      {canStart && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Run structured phases with artifacts and review gates on this task.
            {hasPast ? ' Prior run context will seed the new ticket.' : null}
          </p>
          <Button
            type="button"
            size="sm"
            className="w-full"
            disabled={busy}
            onClick={() => startWorkflow.mutate({ useFollowUp: hasPast })}
          >
            Start workflow
          </Button>
        </div>
      )}

      {hasActive && (
        <CurrentWorkflowSection
          task={task}
          isRunning={isRunning}
          onSelectArtifact={onSelectArtifact}
          onSelectPhase={onSelectPhase}
        />
      )}

      <PastWorkflowsList
        runs={pastRuns}
        showDivider={hasContentAbovePast}
        onSelectRun={setSelectedPastRunId}
        onViewSummary={handleViewSummary}
      />

      <section className="space-y-2">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Artifacts
        </p>
        <ArtifactTree
          artifacts={artifacts}
          selectedId={selectedArtifactId}
          onSelect={(id) => onSelectArtifact?.(id)}
        />
      </section>
    </div>
  )
}

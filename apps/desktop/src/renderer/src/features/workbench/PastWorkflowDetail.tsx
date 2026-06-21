import { useQuery } from '@tanstack/react-query'
import { getPhaseLabel, getWorkflowDefinition } from '@circuit/workflow'
import type { WorkflowType } from '@circuit/workflow'
import { Button } from '@circuit/ui'

import type { ArtifactDto } from '../../../../shared/api.js'
import type { WorkflowRunDetailDto } from '../../../../shared/workflow-run.js'
import { circuitApi } from '../../ipc/client.js'
import { queryKeys } from '../../ipc/query-keys.js'
import { PhaseTimeline } from './PhaseTimeline.js'

export interface PastWorkflowDetailProps {
  taskId: string
  runId: string
  onSelectArtifact?: (artifactId: string) => void
  onSelectPhase?: (phaseName: string) => void
}

export function PastWorkflowDetail({
  taskId,
  runId,
  onSelectArtifact,
  onSelectPhase,
}: PastWorkflowDetailProps): React.ReactElement {
  const detailQuery = useQuery({
    queryKey: queryKeys.tasks.workflowRun(taskId, runId),
    queryFn: () => circuitApi.getWorkflowRun({ taskId, runId }),
  })

  const detail = detailQuery.data as WorkflowRunDetailDto | undefined

  if (detailQuery.isLoading) {
    return <p className="p-3 text-xs text-muted-foreground">Loading workflow…</p>
  }

  if (!detail) {
    return <p className="p-3 text-xs text-muted-foreground">Workflow not found.</p>
  }

  const ticketArtifact = detail.artifacts.find((artifact) => artifact.phase === 'ticket')
  const phases = detail.phases.map((phase) => ({
    name: phase.name,
    label: getPhaseLabel(phase.name),
    status: phase.status,
  }))

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
      {detail.status === 'cancelled' && (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/5 px-2.5 py-2 text-xs text-muted-foreground">
          Partial attempt — outputs are not authoritative.
        </p>
      )}

      {ticketArtifact && (
        <div className="rounded-md border border-border bg-card px-2.5 py-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Ticket
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-1 h-auto w-auto justify-start px-0 py-0 font-mono text-xs"
            onClick={() => onSelectArtifact?.(ticketArtifact.id)}
          >
            {ticketArtifact.title}
          </Button>
        </div>
      )}

      {phases.length > 0 && (
        <div className="min-h-0 flex-1">
          <p className="mb-2 px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Phases
          </p>
          <PhaseTimeline phases={phases} onSelectPhase={onSelectPhase} />
        </div>
      )}
    </div>
  )
}

export function plannedPhasesFromDefinition(
  workflowType: string,
  existingPhases: Array<{ name: string; status: string }>,
): Array<{ name: string; label: string; status: string }> {
  if (existingPhases.length > 0) {
    return existingPhases.map((phase) => ({
      name: phase.name,
      label: getPhaseLabel(phase.name),
      status: phase.status,
    }))
  }

  const definition = getWorkflowDefinition(workflowType as WorkflowType)
  return (definition?.phases ?? []).map((name) => ({
    name,
    label: getPhaseLabel(name),
    status: 'locked',
  }))
}

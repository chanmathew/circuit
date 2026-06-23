import { useQuery } from '@tanstack/react-query'
import { getPhaseLabel, getWorkflowDefinition } from '@circuit/workflow'
import type { WorkflowType } from '@circuit/workflow'
import { Badge, Button } from '@circuit/ui'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons'

import type { WorkflowRunDetailDto } from '../../../../shared/workflow-run.js'
import { circuitApi } from '../../ipc/client.js'
import { queryKeys } from '../../ipc/query-keys.js'
import { PhaseTimeline } from './PhaseTimeline.js'
import { resolvePhaseArtifact } from './lib/workbench-content.js'

export interface PastWorkflowDetailProps {
  taskId: string
  runId: string
  onBack: () => void
  onSelectArtifact?: (artifactId: string) => void
}

function formatRunDate(run: WorkflowRunDetailDto): string {
  const date = run.completedAt ?? run.cancelledAt ?? run.startedAt
  try {
    return new Date(date).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return date
  }
}

export function PastWorkflowDetail({
  taskId,
  runId,
  onBack,
  onSelectArtifact,
}: PastWorkflowDetailProps): React.ReactElement {
  const detailQuery = useQuery({
    queryKey: queryKeys.tasks.workflowRun(taskId, runId),
    queryFn: () => circuitApi.getWorkflowRun({ taskId, runId }),
  })

  const detail = detailQuery.data as WorkflowRunDetailDto | undefined

  if (detailQuery.isLoading) {
    return <p className="text-xs text-muted-foreground">Loading workflow…</p>
  }

  if (!detail) {
    return <p className="text-xs text-muted-foreground">Workflow not found.</p>
  }

  const ticketArtifact = detail.artifacts.find((artifact) => artifact.phase === 'ticket')
  const artifactPhases = new Set(detail.artifacts.map((artifact) => artifact.phase))
  const phases = detail.phases.map((phase) => ({
    name: phase.name,
    label: getPhaseLabel(phase.name),
    status: phase.status,
    hasArtifact: artifactPhases.has(phase.name),
  }))

  const handleSelectPhase = (phaseName: string): void => {
    const artifact = resolvePhaseArtifact(detail, phaseName)
    if (artifact) onSelectArtifact?.(artifact.id)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="space-y-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-auto gap-1.5 px-0 py-1 text-xs text-muted-foreground hover:text-foreground"
          onClick={onBack}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-3.5" aria-hidden />
          Past workflows
        </Button>

        <div className="flex items-start justify-between gap-2 px-1">
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium leading-snug">{detail.title}</p>
            <p className="text-[10px] text-muted-foreground">{formatRunDate(detail)}</p>
          </div>
          <Badge variant={detail.status === 'completed' ? 'outline' : 'secondary'} className="shrink-0 text-[9px] capitalize">
            {detail.status}
          </Badge>
        </div>
      </div>

      {detail.status === 'cancelled' && (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/5 px-2.5 py-2 text-xs text-muted-foreground">
          Partial attempt — outputs are not authoritative.
        </p>
      )}

      {detail.status === 'completed' && detail.completionSummaryArtifactId && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => onSelectArtifact?.(detail.completionSummaryArtifactId!)}
        >
          View summary
        </Button>
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
          <PhaseTimeline
            phases={phases}
            readOnly
            onSelectPhase={handleSelectPhase}
          />
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

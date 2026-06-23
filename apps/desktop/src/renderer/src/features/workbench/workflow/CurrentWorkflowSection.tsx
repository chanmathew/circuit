import { getPhaseLabel, getPhaseRunLabel } from '@circuit/workflow'
import type { PhaseStatus, WorkflowType } from '@circuit/workflow'
import { Button } from '@circuit/ui'

import type { PhaseDto, TaskDto } from '../../../../../shared/api.js'
import { hasStartedPhase, isAwaitingFirstPhase } from '../../../../../shared/workflow-status.js'
import { canDiscardWorkflowDraft } from '../../../../../shared/workflow-run.js'
import { useApprovePhase } from '../../tasks/hooks/workflow/useApprovePhase.js'
import { useCancelWorkflow } from '../../tasks/hooks/workflow/useCancelWorkflow.js'
import { useDiscardWorkflowDraft } from '../../tasks/hooks/workflow/useDiscardWorkflowDraft.js'
import { useStartPhase } from '../../tasks/hooks/workflow/useStartPhase.js'
import { canApprovePhase, getApproveBlockedReason } from '../lib/phase-approval.js'
import { PhaseTimeline } from './PhaseTimeline.js'
import { plannedPhasesFromDefinition } from './PastWorkflowDetail.js'

export interface CurrentWorkflowSectionProps {
  task: TaskDto
  isRunning?: boolean
  onSelectArtifact?: (artifactId: string) => void
  onSelectPhase?: (phaseName: string) => void
}

function runPhaseLabel(status: PhaseStatus, label: string): string {
  if (status === 'needs_revision') return `Re-run ${label}`
  return `Run ${label}`
}

export function CurrentWorkflowSection({
  task,
  isRunning = false,
  onSelectArtifact,
  onSelectPhase,
}: CurrentWorkflowSectionProps): React.ReactElement {
  const startPhase = useStartPhase(task.id)
  const approvePhase = useApprovePhase(task.id)
  const cancelWorkflow = useCancelWorkflow(task.id)
  const discardDraft = useDiscardWorkflowDraft(task.id)

  const busy =
    isRunning ||
    startPhase.isPending ||
    approvePhase.isPending ||
    cancelWorkflow.isPending ||
    discardDraft.isPending

  const ticketArtifact = task.artifacts.find((artifact) => artifact.phase === 'ticket')
  const currentPhase = task.phases.find((phase) => phase.name === task.currentPhase)
  const currentStatus = currentPhase?.status as PhaseStatus | undefined
  const firstPhase = task.currentPhase
  const firstPhaseLabel = getPhaseLabel(firstPhase)
  const awaitingFirstPhase = isAwaitingFirstPhase(task.workflowStatus, task.phases)
  const startedPhase = hasStartedPhase(task.phases)
  const canRunCurrentPhase = currentStatus === 'ready' || currentStatus === 'needs_revision'
  const needsReview = currentStatus === 'needs_review'
  const canDiscard = canDiscardWorkflowDraft(task.activeWorkflowRun, task.phases)
  const canCancel = startedPhase
  const workflowType = task.workflowType as WorkflowType

  const phaseResolutions = task.decisionResolutions.filter((entry) => entry.phase === firstPhase)
  const requiredDecisions = task.requiredDecisionsByPhase[firstPhase] ?? []
  const approveBlockedReason = needsReview
    ? getApproveBlockedReason(requiredDecisions, phaseResolutions)
    : null
  const canProceed =
    needsReview && canApprovePhase(requiredDecisions, phaseResolutions) && !isRunning

  const nextStepLabel = getPhaseRunLabel(firstPhase, workflowType)

  const phases = plannedPhasesFromDefinition(
    task.workflowType,
    task.phases.map((phase: PhaseDto) => ({ name: phase.name, status: phase.status })),
  )

  return (
    <section className="space-y-3">
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

      <div className="min-h-0 flex-1">
        <p className="mb-2 px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Phases
        </p>
        <PhaseTimeline
          phases={phases}
          currentPhase={task.currentPhase}
          runningPhase={isRunning ? task.currentPhase : undefined}
          onSelectPhase={onSelectPhase}
        />
      </div>

      <div className="shrink-0 space-y-2 border-t border-border pt-3">
        {needsReview && (
          <div className="space-y-2">
            {approveBlockedReason && (
              <p className="px-1 text-[11px] text-muted-foreground">{approveBlockedReason}</p>
            )}
            <Button
              type="button"
              size="sm"
              className="w-full"
              disabled={busy || !canProceed}
              onClick={() => approvePhase.mutate(firstPhase)}
            >
              {nextStepLabel}
            </Button>
          </div>
        )}

        {(awaitingFirstPhase || canRunCurrentPhase) && !isRunning && (
          <Button
            type="button"
            size="sm"
            className="w-full"
            disabled={busy}
            onClick={() => startPhase.mutate(firstPhase)}
          >
            {awaitingFirstPhase
              ? `Start ${firstPhaseLabel}`
              : runPhaseLabel(currentStatus!, getPhaseLabel(firstPhase))}
          </Button>
        )}

        {(canDiscard || canCancel) && (
          <div className="flex justify-center pt-0.5">
            {canDiscard && (
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto text-xs text-muted-foreground hover:text-destructive"
                disabled={busy}
                onClick={() => discardDraft.mutate()}
              >
                Discard draft
              </Button>
            )}
            {canCancel && (
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto text-xs text-muted-foreground hover:text-destructive"
                disabled={busy}
                onClick={() => cancelWorkflow.mutate()}
              >
                Cancel workflow
              </Button>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

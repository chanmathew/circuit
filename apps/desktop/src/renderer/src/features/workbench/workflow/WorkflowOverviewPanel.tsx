import { getPhaseLabel, getWorkflowDefinition } from '@circuit/workflow'
import { Badge, Button } from '@circuit/ui'

import type { TaskDto } from '../../../../../shared/api.js'
import { isAwaitingFirstPhase } from '../../../../../shared/workflow-status.js'
import { useStartPhase } from '../../tasks/hooks/workflow/useStartPhase.js'

export interface WorkflowOverviewPanelProps {
  task: TaskDto
  isRunning?: boolean
}

export function WorkflowOverviewPanel({
  task,
  isRunning = false,
}: WorkflowOverviewPanelProps): React.ReactElement {
  const startPhase = useStartPhase(task.id)
  const definition = getWorkflowDefinition(
    task.workflowType as import('@circuit/workflow').WorkflowType,
  )
  const plannedSteps = definition?.phases ?? []
  const firstPhase = task.currentPhase
  const firstPhaseLabel = getPhaseLabel(firstPhase)
  const awaitingFirstPhase = isAwaitingFirstPhase(task.workflowStatus, task.phases)
  const busy = isRunning || startPhase.isPending

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Workflow overview
        </p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight">{task.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{task.description}</p>
      </div>

      {definition && (
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Template
          </p>
          <p className="mt-1 text-sm font-medium">{definition.label}</p>
          <ol className="mt-3 space-y-2">
            {plannedSteps.map((step, index) => (
              <li key={step} className="flex items-center gap-2 text-sm">
                <span className="font-mono text-[10px] text-muted-foreground">{index + 1}.</span>
                <span>{getPhaseLabel(step)}</span>
                {step === firstPhase && awaitingFirstPhase && (
                  <Badge variant="secondary" className="text-[9px]">
                    next
                  </Badge>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      {task.ticketContent && (
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Ticket brief
          </p>
          <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-muted-foreground">
            {task.ticketContent}
          </pre>
        </div>
      )}

      {awaitingFirstPhase && (
        <div>
          <Button type="button" disabled={busy} onClick={() => startPhase.mutate(firstPhase)}>
            Start {firstPhaseLabel}
          </Button>
        </div>
      )}
    </div>
  )
}

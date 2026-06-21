import type { WorkflowRunDto } from '../../../../shared/api.js'
import { PastWorkflowRow } from './PastWorkflowRow.js'

export interface PastWorkflowsListProps {
  runs: WorkflowRunDto[]
  selectedRunId?: string
  onSelectRun: (runId: string) => void
  onViewSummary?: (run: WorkflowRunDto) => void
}

export function PastWorkflowsList({
  runs,
  selectedRunId,
  onSelectRun,
  onViewSummary,
}: PastWorkflowsListProps): React.ReactElement | null {
  if (runs.length === 0) return null

  return (
    <section className="space-y-2">
      <p className="px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        Past workflows
      </p>
      <ul className="space-y-2">
        {runs.map((run) => (
          <li key={run.id}>
            <PastWorkflowRow
              run={run}
              selected={selectedRunId === run.id}
              onSelect={() => onSelectRun(run.id)}
              onViewSummary={
                run.completionSummaryArtifactId && onViewSummary
                  ? () => onViewSummary(run)
                  : undefined
              }
            />
          </li>
        ))}
      </ul>
    </section>
  )
}

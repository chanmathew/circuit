import { Separator } from '@circuit/ui'

import type { WorkflowRunDto } from '../../../../../shared/api.js'
import { PastWorkflowRow } from './PastWorkflowRow.js'

export interface PastWorkflowsListProps {
  runs: WorkflowRunDto[]
  /** When true, render a divider above the section (e.g. below current workflow). */
  showDivider?: boolean
  onSelectRun: (runId: string) => void
  onViewSummary?: (run: WorkflowRunDto) => void
}

export function PastWorkflowsList({
  runs,
  showDivider = false,
  onSelectRun,
  onViewSummary,
}: PastWorkflowsListProps): React.ReactElement | null {
  if (runs.length === 0) return null

  return (
    <section className={showDivider ? 'mt-1 space-y-3 pt-2' : 'space-y-2'}>
      {showDivider && <Separator className="mb-4" />}
      <p className="px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        Past workflows
      </p>
      <ul className="space-y-2">
        {runs.map((run) => (
          <li key={run.id}>
            <PastWorkflowRow
              run={run}
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

import { Badge, Button, cn } from '@circuit/ui'

import type { WorkflowRunDto } from '../../../../shared/workflow-run.js'

function formatRunDate(run: WorkflowRunDto): string {
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

export interface PastWorkflowRowProps {
  run: WorkflowRunDto
  selected?: boolean
  onSelect: () => void
  onViewSummary?: () => void
}

export function PastWorkflowRow({
  run,
  selected = false,
  onSelect,
  onViewSummary,
}: PastWorkflowRowProps): React.ReactElement {
  const isCompleted = run.status === 'completed'

  return (
    <div
      className={cn(
        'rounded-md border px-2.5 py-2',
        selected ? 'border-primary/40 bg-accent/40' : 'border-border bg-card',
      )}
    >
      <button
        type="button"
        className="w-full text-left"
        onClick={onSelect}
      >
        <div className="flex items-start justify-between gap-2">
          <span className="text-xs font-medium leading-snug">{run.title}</span>
          <Badge variant={isCompleted ? 'outline' : 'secondary'} className="shrink-0 text-[9px] capitalize">
            {run.status}
          </Badge>
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">{formatRunDate(run)}</p>
      </button>
      {isCompleted && run.completionSummaryArtifactId && onViewSummary && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-1 h-auto px-0 py-0 text-[10px] text-primary"
          onClick={onViewSummary}
        >
          View summary
        </Button>
      )}
    </div>
  )
}

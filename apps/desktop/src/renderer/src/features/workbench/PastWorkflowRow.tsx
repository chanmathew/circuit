import { Badge, Button, Card, cn } from '@circuit/ui'

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
  onSelect: () => void
  onViewSummary?: () => void
}

export function PastWorkflowRow({
  run,
  onSelect,
  onViewSummary,
}: PastWorkflowRowProps): React.ReactElement {
  const isCompleted = run.status === 'completed'
  const showSummary =
    isCompleted && run.completionSummaryArtifactId != null && onViewSummary != null

  return (
    <Card
      size="sm"
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect()
        }
      }}
      className={cn(
        'w-full cursor-pointer gap-0 rounded-md border-border bg-background py-0 shadow-xs transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
      )}
    >
      <div className="flex flex-col gap-1 p-2.5">
        <div className="flex items-start justify-between gap-2">
          <span className="min-w-0 flex-1 text-xs font-medium leading-snug line-clamp-2">
            {run.title}
          </span>
          <Badge
            variant={isCompleted ? 'outline' : 'secondary'}
            className="shrink-0 text-[9px] capitalize"
          >
            {run.status}
          </Badge>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] text-muted-foreground">{formatRunDate(run)}</span>
          {showSummary ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto shrink-0 px-2 py-0 text-[10px] text-primary"
              onClick={(event) => {
                event.stopPropagation()
                onViewSummary()
              }}
            >
              View summary
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  )
}

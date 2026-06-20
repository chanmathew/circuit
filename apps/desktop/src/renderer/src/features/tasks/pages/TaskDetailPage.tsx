import { Card, CardContent } from '@circuit/ui'

import { TaskWorkbench } from '../../workbench/TaskWorkbench.js'
import { useTask } from '../hooks/useTask.js'
import { useTaskWorkflow } from '../hooks/useTaskWorkflow.js'

export function TaskDetailPage({ taskId }: { taskId: string }): React.ReactElement {
  const taskQuery = useTask(taskId)
  const workflowMutation = useTaskWorkflow(taskId)

  if (taskQuery.isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
        Loading task…
      </div>
    )
  }

  if (taskQuery.isError || !taskQuery.data) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-xl font-semibold tracking-tight">Task not found</h1>
        <p className="text-sm text-muted-foreground">Select another task from the project tree.</p>
      </div>
    )
  }

  const task = taskQuery.data

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {workflowMutation.isError && (
        <Card className="shrink-0 rounded-none border-x-0 border-t-0 border-destructive/30 bg-destructive/5 shadow-none">
          <CardContent className="py-2 text-sm text-destructive">
            {workflowMutation.error instanceof Error
              ? workflowMutation.error.message
              : 'Workflow action failed'}
          </CardContent>
        </Card>
      )}

      <TaskWorkbench
        task={task}
        isRunning={workflowMutation.isPending}
        onRunPhase={(phaseName) => workflowMutation.mutate({ type: 'run', phaseName })}
        onApprovePhase={(phaseName) => workflowMutation.mutate({ type: 'approve', phaseName })}
        onRequestRevision={(phaseName, note) =>
          workflowMutation.mutate({ type: 'revise', phaseName, note })
        }
        onResolveDecision={(phase, decisionId, optionId, optionLabel) =>
          workflowMutation.mutate({
            type: 'resolve',
            phaseName: phase,
            decisionId,
            optionId,
            optionLabel,
          })
        }
      />
    </div>
  )
}

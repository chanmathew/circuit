import { getPhaseLabel, resolvePreviewWorkflowType, type TaskMode } from '@circuit/workflow'

import type { TaskDto } from '../../../../../shared/api.js'

export interface WorkflowModePreviewProps {
  task: TaskDto
}

function previewHeading(taskMode: TaskMode, templateLabel: string, inferred: boolean): string {
  if (taskMode === 'auto' && inferred) {
    return `Auto → ${templateLabel}`
  }
  return templateLabel
}

export function WorkflowModePreview({ task }: WorkflowModePreviewProps): React.ReactElement | null {
  const taskMode = (task.taskMode ?? 'auto') as TaskMode
  const description = task.description.trim()
  const preview = resolvePreviewWorkflowType(taskMode, description)

  if (!preview) {
    return (
      <div className="rounded-md border border-border bg-muted/20 p-3">
        <p className="text-xs font-medium">Mode: Auto</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Describe the task in chat — Circuit will infer the best workflow when you start.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <p className="text-xs font-medium">
        {previewHeading(taskMode, preview.label, preview.inferred)} · Ready to start
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {preview.inferred
          ? 'Inferred from your task description. Change mode in the composer to override.'
          : 'Structured phases with artifacts and review gates.'}
      </p>
      <ol className="mt-3 space-y-1.5">
        {preview.phases.map((phase, index) => (
          <li key={phase} className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono text-[10px]">{index + 1}.</span>
            <span>{getPhaseLabel(phase)}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

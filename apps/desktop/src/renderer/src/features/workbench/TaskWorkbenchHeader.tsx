import { Badge } from '@circuit/ui'

import type { TaskDto } from '../../../../shared/api.js'
import { useAppConfig } from '../app/hooks/useAppConfig.js'
import { PhaseRail } from './PhaseRail.js'

export interface TaskWorkbenchHeaderProps {
  task: TaskDto
  actions?: React.ReactNode
  /** Intake mode — title and adapter badge only. */
  minimal?: boolean
}

export function TaskWorkbenchHeader({
  task,
  actions,
  minimal = false,
}: TaskWorkbenchHeaderProps): React.ReactElement {
  const appConfig = useAppConfig()
  const agentAdapter = appConfig.data?.agentAdapter ?? '…'

  return (
    <header className="shrink-0 border-b border-border bg-card">
      <div className="flex items-center gap-3 px-4 py-2.5">
        <div className="min-w-0 shrink-0 max-w-[200px]">
          <p className="truncate text-sm font-semibold">{task.title}</p>
          {!minimal && (
            <p className="truncate font-mono text-[10px] text-muted-foreground">{task.branchName}</p>
          )}
        </div>
        {!minimal &&
          (task.phases.length > 0 ? (
            <PhaseRail
              phases={task.phases.map((p) => ({
                name: p.name,
                label: p.label,
                status: p.status,
              }))}
              currentPhase={task.currentPhase}
            />
          ) : (
            <p className="text-xs text-muted-foreground">No workflow phases</p>
          ))}
        {minimal && (
          <p className="text-xs text-muted-foreground">Describe your task in the stream below</p>
        )}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Badge variant="secondary" className="font-mono text-[10px] lowercase">
            {agentAdapter}
          </Badge>
          <Badge variant="outline" className="text-[10px] capitalize">
            {task.status.replace(/_/g, ' ')}
          </Badge>
          {actions}
        </div>
      </div>
    </header>
  )
}

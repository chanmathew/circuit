import { useNavigate } from '@tanstack/react-router'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'

import { Button, cn } from '@circuit/ui'

import { SCENARIO_LABELS } from './fixtures.js'
import { WorkbenchLayout } from './WorkbenchLayout.js'
import { ProjectTreeSidebar } from './ProjectTreeSidebar.js'
import { ACTIVE_PROTOTYPE_TASK_ID } from './project-tree-fixtures.js'
import { useWorkbenchState } from './useWorkbenchState.js'
import type { ScenarioId } from './types.js'

const SCENARIOS: ScenarioId[] = [
  'early',
  'research',
  'design',
  'mid',
  'plan',
  'implementing',
  'final',
]

export interface WorkbenchPrototypeSearch {
  scenario: ScenarioId
}

export function parseScenario(value: unknown): ScenarioId {
  if (
    value === 'research' ||
    value === 'design' ||
    value === 'mid' ||
    value === 'plan' ||
    value === 'implementing' ||
    value === 'final'
  ) {
    return value
  }
  return 'early'
}

interface WorkbenchPrototypePageProps {
  scenario: ScenarioId
}

export function WorkbenchPrototypePage({
  scenario,
}: WorkbenchPrototypePageProps): React.ReactElement {
  const navigate = useNavigate()
  const [selectedTaskId, setSelectedTaskId] = useState(ACTIVE_PROTOTYPE_TASK_ID)

  const { state, actions } = useWorkbenchState(scenario)

  const setScenario = (next: ScenarioId) => {
    void navigate({
      to: '/prototype/workbench',
      search: { scenario: next },
    })
  }

  return (
    <div className="relative flex h-full w-full min-h-0">
      <ProjectTreeSidebar
        selectedTaskId={selectedTaskId}
        onSelectTask={setSelectedTaskId}
        onNewTask={() => {
          /* prototype stub */
        }}
        onAddProject={() => {
          /* prototype stub */
        }}
      />

      <div className="relative flex min-w-0 flex-1 flex-col">
        {import.meta.env.DEV && (
          <div className="shrink-0 flex flex-wrap items-center gap-2 border-b-2 border-amber-500/50 bg-amber-500/10 px-4 py-2">
            <span className="text-xs font-bold uppercase tracking-wide text-amber-800 dark:text-amber-200">
              UX prototype
            </span>
            <Link
              to="/"
              className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Exit to app
            </Link>
            <div className="flex flex-wrap gap-1 ml-auto">
              {SCENARIOS.map((s) => (
                <Button
                  key={s}
                  type="button"
                  size="sm"
                  variant={scenario === s ? 'default' : 'outline'}
                  className={cn('text-[10px] h-7', scenario === s && 'pointer-events-none')}
                  onClick={() => setScenario(s)}
                >
                  {SCENARIO_LABELS[s]}
                </Button>
              ))}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-[10px] h-7"
                onClick={() => actions.resetScenario(scenario)}
              >
                Reset
              </Button>
            </div>
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <WorkbenchLayout state={state} actions={actions} />
        </div>
      </div>
    </div>
  )
}

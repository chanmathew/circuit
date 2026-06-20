import { useState } from 'react'

import { Badge, Button, cn, ScrollArea } from '@circuit/ui'

import { ActionBar, ActivityFeed, MainPanelContent, RightSidebarTabs } from './content-panels.js'
import { shouldShowStructuredPanel } from './phase-approval.js'
import { PHASE_STATUS_DOT } from './phase-styles.js'
import { PhaseStructuredPanel } from './structured/PhaseStructuredPanel.js'
import type { PrototypePhase, WorkbenchLayoutProps } from './types.js'

function HeaderPhaseRail({
  phases,
  onSelectPhase,
}: {
  phases: PrototypePhase[]
  onSelectPhase: (name: string) => void
}): React.ReactElement {
  return (
    <div className="flex min-w-0 flex-1 items-center justify-center gap-0.5 overflow-x-auto px-2">
      {phases.map((phase, i) => (
        <div key={phase.name} className="flex shrink-0 items-center">
          <button
            type="button"
            disabled={phase.status === 'locked'}
            onClick={() => onSelectPhase(phase.name)}
            className={cn(
              'flex items-center gap-1 rounded-full px-2 py-1 text-[11px] transition-colors',
              phase.status === 'locked' && 'cursor-not-allowed opacity-30',
              phase.status === 'needs_review' &&
                'bg-sky-500/15 text-sky-800 dark:text-sky-200 ring-1 ring-sky-500/30',
              phase.status === 'running' &&
                'bg-amber-500/15 text-amber-800 dark:text-amber-200 animate-pulse',
              phase.status === 'approved' && 'text-muted-foreground hover:text-foreground',
              phase.status === 'ready' && 'text-primary hover:bg-primary/10',
              !['locked', 'needs_review', 'running', 'approved', 'ready'].includes(phase.status) &&
                'hover:bg-accent',
            )}
            title={phase.label}
          >
            <span
              className={cn('h-1.5 w-1.5 rounded-full shrink-0', PHASE_STATUS_DOT[phase.status])}
            />
            <span className="font-medium whitespace-nowrap">{phase.label}</span>
          </button>
          {i < phases.length - 1 && (
            <span className="mx-0.5 text-muted-foreground/30 text-[10px]">·</span>
          )}
        </div>
      ))}
    </div>
  )
}

export function WorkbenchLayout({ state, actions }: WorkbenchLayoutProps): React.ReactElement {
  const [preview, setPreview] = useState(true)

  const selectedArtifact = state.artifacts.find((a) => a.id === state.selectedArtifactId)
  const needsReviewPhase = state.phases.find((p) => p.status === 'needs_review')
  const showStructured =
    state.mainMode === 'artifact' &&
    (shouldShowStructuredPanel(state, selectedArtifact?.phase) || state.revisionOpen)

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <header className="shrink-0 border-b border-border bg-card">
        <div className="flex items-center gap-3 px-4 py-2.5">
          <div className="min-w-0 shrink-0 max-w-[200px]">
            <h1 className="truncate text-sm font-semibold leading-tight">{state.task.title}</h1>
            <p className="truncate text-[10px] text-muted-foreground font-mono">
              {state.task.branchName}
            </p>
          </div>

          <HeaderPhaseRail phases={state.phases} onSelectPhase={actions.selectPhase} />

          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="outline" className="hidden text-[10px] sm:inline-flex">
              {state.task.nextAction}
            </Badge>
            <Button variant="outline" size="sm" type="button" className="h-7 text-xs">
              Cursor
            </Button>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col min-h-0">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <MainPanelContent
              state={state}
              preview={preview}
              onPreviewChange={setPreview}
              actions={actions}
            />
            <PhaseStructuredPanel
              data={state.structured}
              actions={actions}
              visible={showStructured}
              revisionOpen={state.revisionOpen}
              revisionDraft={state.revisionDraft}
              phaseLabel={needsReviewPhase?.label ?? 'phase'}
            />
          </div>
          <ActionBar state={state} actions={actions} />
        </div>

        <aside className="flex w-64 shrink-0 flex-col border-l border-border bg-card/50">
          <RightSidebarTabs state={state} actions={actions} />

          <div className="flex max-h-48 shrink-0 flex-col border-t border-border">
            <p className="shrink-0 border-b border-border px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Agent activity
            </p>
            <ScrollArea className="flex-1">
              <ActivityFeed events={state.activity} />
            </ScrollArea>
          </div>
        </aside>
      </div>
    </div>
  )
}

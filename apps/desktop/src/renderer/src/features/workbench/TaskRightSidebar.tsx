import {
  Badge,
  Button,
  ScrollArea,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@circuit/ui'
import { cn } from '@circuit/ui/utils'
import type React from 'react'
import type { InspectorTab } from '@circuit/protocol'

import type { ArtifactDto, TaskDto } from '../../../../shared/api.js'
import {
  INSPECTOR_TAB_TRIGGER_CLASS,
  INSPECTOR_TABS,
  INSPECTOR_TABS_LIST_CLASS,
} from './lib/inspector-tabs.js'
import type { CheckEntry, DiffEntry } from './lib/workbench-content.js'
import { resolvePhaseArtifact } from './lib/workbench-content.js'
import {
  INSPECTOR_HEADER_ROW_CLASS,
  INSPECTOR_TOGGLE_BUTTON_CLASS,
  InspectorPanelToggle,
} from './InspectorPanelToggle.js'
import { WorkflowPanel } from './WorkflowPanel.js'

function ArtifactTree({
  artifacts,
  selectedId,
  onSelect,
}: {
  artifacts: ArtifactDto[]
  selectedId?: string
  onSelect: (id: string) => void
}): React.ReactElement {
  const fileArtifacts = artifacts.filter((artifact) => artifact.phase !== 'ticket')

  if (fileArtifacts.length === 0) {
    return (
      <p className="px-2 py-4 text-center text-xs text-muted-foreground">
        Phase artifacts appear here after the first phase run.
      </p>
    )
  }

  return (
    <ul className="space-y-0.5">
      {fileArtifacts.map((artifact) => (
        <li key={artifact.id}>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              'h-auto w-full flex-col items-start gap-0.5 px-2 py-1.5 text-left font-normal',
              selectedId === artifact.id && 'bg-accent',
            )}
            onClick={() => onSelect(artifact.id)}
          >
            <span className="font-mono text-xs font-medium">{artifact.title}</span>
            <span className="text-[10px] capitalize text-muted-foreground">{artifact.status}</span>
          </Button>
        </li>
      ))}
    </ul>
  )
}

function ChangesPanel({
  task,
  diffs,
  checks,
  selectedDiffId,
  selectedCheckId,
  onSelectDiff,
  onSelectCheck,
}: {
  task: TaskDto
  diffs: DiffEntry[]
  checks: CheckEntry[]
  selectedDiffId?: string
  selectedCheckId?: string
  onSelectDiff: (id: string) => void
  onSelectCheck: (id: string) => void
}): React.ReactElement {
  const hasChanges = diffs.length > 0 || checks.length > 0

  return (
    <div className="space-y-4 p-2">
      <div className="rounded-md border border-border bg-card px-2.5 py-2">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Branch
        </p>
        <p className="mt-0.5 font-mono text-xs">{task.branchName}</p>
      </div>

      {!hasChanges && (
        <p className="px-2 text-center text-xs text-muted-foreground">
          Diffs and validation results will appear here during build and review.
        </p>
      )}

      {diffs.length > 0 && (
        <section>
          <p className="mb-1 px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Diffs
          </p>
          <ul className="space-y-0.5">
            {diffs.map((diff) => (
              <li key={diff.id}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-auto w-full flex-col items-start gap-0.5 px-2 py-1.5 text-left font-normal',
                    selectedDiffId === diff.id && 'bg-accent',
                  )}
                  onClick={() => onSelectDiff(diff.id)}
                >
                  <span className="text-xs font-medium">{diff.title}</span>
                  <span className="text-[10px] text-muted-foreground">{diff.summary}</span>
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {checks.length > 0 && (
        <section>
          <p className="mb-1 px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Checks
          </p>
          <ul className="space-y-0.5">
            {checks.map((check) => (
              <li key={check.id}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-auto w-full items-center justify-between gap-2 px-2 py-1.5 text-left font-normal',
                    selectedCheckId === check.id && 'bg-accent',
                  )}
                  onClick={() => onSelectCheck(check.id)}
                >
                  <span className="truncate font-mono text-xs">{check.command}</span>
                  <Badge
                    variant={check.passed ? 'outline' : 'destructive'}
                    className="shrink-0 text-[9px]"
                  >
                    {check.passed ? 'pass' : 'fail'}
                  </Badge>
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

export interface TaskRightSidebarProps {
  task: TaskDto
  artifacts: ArtifactDto[]
  diffs: DiffEntry[]
  checks: CheckEntry[]
  activeTab: InspectorTab
  selectedId?: string
  changesKind?: 'diff' | 'check'
  isRunning?: boolean
  onTabChange: (tab: InspectorTab) => void
  onSelectArtifact: (id: string) => void
  onSelectDiff: (id: string) => void
  onSelectCheck: (id: string) => void
  onToggleInspector?: () => void
}

export function TaskRightSidebar({
  task,
  artifacts,
  diffs,
  checks,
  activeTab,
  selectedId,
  changesKind,
  isRunning = false,
  onTabChange,
  onSelectArtifact,
  onSelectDiff,
  onSelectCheck,
  onToggleInspector,
}: TaskRightSidebarProps): React.ReactElement {
  const selectedDiffId = activeTab === 'changes' && changesKind === 'diff' ? selectedId : undefined
  const selectedCheckId =
    activeTab === 'changes' && changesKind === 'check' ? selectedId : undefined

  return (
    <aside className="flex h-full min-h-0 flex-col bg-card/50">
      <Tabs
        value={activeTab}
        onValueChange={(value) => onTabChange(value as InspectorTab)}
        className="flex min-h-0 flex-1 flex-col gap-0"
      >
        <div
          className={cn(
            'flex shrink-0 items-stretch justify-between overflow-visible border-b border-border',
            INSPECTOR_HEADER_ROW_CLASS,
          )}
        >
          <TabsList variant="line" className={INSPECTOR_TABS_LIST_CLASS}>
            {INSPECTOR_TABS.map(({ value, label, icon: Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className={INSPECTOR_TAB_TRIGGER_CLASS}
                aria-label={label}
                title={label}
              >
                <Icon className="size-4" aria-hidden />
              </TabsTrigger>
            ))}
          </TabsList>
          {onToggleInspector ? (
            <InspectorPanelToggle
              open
              onToggle={onToggleInspector}
              className={cn(INSPECTOR_TOGGLE_BUTTON_CLASS, 'self-center')}
            />
          ) : null}
        </div>

        <TabsContent value="workflow" className="mt-0 min-h-0 flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <WorkflowPanel
              task={task}
              isRunning={isRunning}
              onSelectArtifact={onSelectArtifact}
              onSelectPhase={(phaseName) => {
                const artifact = resolvePhaseArtifact(task, phaseName)
                if (artifact) onSelectArtifact(artifact.id)
              }}
            />
          </ScrollArea>
        </TabsContent>

        <TabsContent value="files" className="mt-0 min-h-0 flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-2">
              <ArtifactTree
                artifacts={artifacts}
                selectedId={activeTab === 'files' ? selectedId : undefined}
                onSelect={onSelectArtifact}
              />
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="changes" className="mt-0 min-h-0 flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <ChangesPanel
              task={task}
              diffs={diffs}
              checks={checks}
              selectedDiffId={selectedDiffId}
              selectedCheckId={selectedCheckId}
              onSelectDiff={onSelectDiff}
              onSelectCheck={onSelectCheck}
            />
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </aside>
  )
}

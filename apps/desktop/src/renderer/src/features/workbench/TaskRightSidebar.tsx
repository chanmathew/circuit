import {
  ScrollArea,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@circuit/ui'
import { cn } from '@circuit/ui/utils'
import type React from 'react'
import type { ContentView, InspectorTab } from '@circuit/protocol'

import type { ArtifactDto, TaskDto } from '../../../../shared/api.js'
import {
  INSPECTOR_TAB_TRIGGER_CLASS,
  INSPECTOR_TABS,
  INSPECTOR_TABS_LIST_CLASS,
} from './lib/inspector-tabs.js'
import type { CheckEntry, DiffEntry } from './lib/workbench-content.js'
import { resolvePhaseArtifact, WORKSPACE_DIFF_ID } from './lib/workbench-content.js'
import {
  INSPECTOR_HEADER_ROW_CLASS,
  InspectorPanelToggle,
} from './InspectorPanelToggle.js'
import {
  CHROME_CONTROL_WRAPPER_CLASS,
  CHROME_DRAG_STYLE,
  CHROME_END_INSET,
  CHROME_NO_DRAG_STYLE,
  CHROME_ROW_CLASS,
} from '../../app/layout/chrome-row.js'
import { WindowControls } from '../../app/layout/WindowControls.js'
import { ChangesPanel } from './inspector/ChangesPanel.js'
import { WorkbenchFileTree } from './inspector/WorkbenchFileTree.js'
import { WorkflowPanel } from './WorkflowPanel.js'

export interface TaskRightSidebarProps {
  task: TaskDto
  artifacts: ArtifactDto[]
  diffs: DiffEntry[]
  checks: CheckEntry[]
  activeTab: InspectorTab
  contentView: ContentView
  selectedId?: string
  changesKind?: 'diff' | 'check'
  isRunning?: boolean
  onTabChange: (tab: InspectorTab) => void
  onSelectArtifact: (id: string) => void
  onSelectFile: (path: string) => void
  onSelectDiff: (id: string) => void
  onSelectCheck: (id: string) => void
  onOpenChangedFile: (path: string) => void
  onOpenAllChanges: () => void
  onToggleInspector?: () => void
  /** Win/Linux window controls when the inspector spans the top-right corner. */
  showWindowControls?: boolean
}

export function TaskRightSidebar({
  task,
  artifacts,
  diffs,
  checks,
  activeTab,
  contentView,
  selectedId,
  changesKind,
  isRunning = false,
  onTabChange,
  onSelectArtifact,
  onSelectFile,
  onSelectDiff,
  onSelectCheck,
  onOpenChangedFile,
  onOpenAllChanges,
  onToggleInspector,
  showWindowControls = false,
}: TaskRightSidebarProps): React.ReactElement {
  const selectedDiffId = activeTab === 'changes' && changesKind === 'diff' ? selectedId : undefined
  const selectedCheckId =
    activeTab === 'changes' && changesKind === 'check' ? selectedId : undefined
  const selectedWorkspacePath =
    contentView.type === 'diff' &&
    contentView.diffId === WORKSPACE_DIFF_ID &&
    contentView.path
      ? contentView.path
      : undefined
  const selectedArtifactId =
    activeTab === 'workflow' && selectedId && artifacts.some((a) => a.id === selectedId)
      ? selectedId
      : undefined
  const selectedFilePath = activeTab === 'files' ? selectedId : undefined

  return (
    <aside className="flex h-full min-h-0 flex-col bg-card/50">
      <Tabs
        value={activeTab}
        onValueChange={(value) => onTabChange(value as InspectorTab)}
        className="flex min-h-0 flex-1 flex-col gap-0"
      >
        <div
          className={cn(
            CHROME_ROW_CLASS,
            CHROME_END_INSET,
            'justify-between gap-1 overflow-visible bg-card/50',
            INSPECTOR_HEADER_ROW_CLASS,
          )}
          style={CHROME_DRAG_STYLE}
        >
          <TabsList
            variant="line"
            className={INSPECTOR_TABS_LIST_CLASS}
            style={CHROME_NO_DRAG_STYLE}
          >
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
          <div className={cn(CHROME_CONTROL_WRAPPER_CLASS, 'gap-0')} style={CHROME_NO_DRAG_STYLE}>
            {onToggleInspector ? (
              <InspectorPanelToggle open onToggle={onToggleInspector} />
            ) : null}
            {showWindowControls ? <WindowControls /> : null}
          </div>
        </div>

        <TabsContent value="workflow" className="mt-0 min-h-0 flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <WorkflowPanel
              task={task}
              artifacts={artifacts}
              isRunning={isRunning}
              selectedArtifactId={selectedArtifactId}
              onSelectArtifact={onSelectArtifact}
              onSelectPhase={(phaseName) => {
                const artifact = resolvePhaseArtifact(task, phaseName)
                if (artifact) onSelectArtifact(artifact.id)
              }}
            />
          </ScrollArea>
        </TabsContent>

        <TabsContent value="files" className="mt-0 min-h-0 flex-1 overflow-hidden">
          <WorkbenchFileTree
            workspacePath={task.workspacePath}
            selectedPath={selectedFilePath}
            onSelectPath={onSelectFile}
          />
        </TabsContent>

        <TabsContent value="changes" className="mt-0 min-h-0 flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <ChangesPanel
              task={task}
              diffs={diffs}
              checks={checks}
              selectedDiffId={selectedDiffId}
              selectedCheckId={selectedCheckId}
              selectedWorkspacePath={selectedWorkspacePath}
              onSelectDiff={onSelectDiff}
              onSelectCheck={onSelectCheck}
              onOpenChangedFile={onOpenChangedFile}
              onOpenAllChanges={onOpenAllChanges}
            />
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </aside>
  )
}

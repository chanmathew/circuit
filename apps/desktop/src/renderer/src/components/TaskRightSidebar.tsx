import {
  Button,
  cn,
  ScrollArea,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@circuit/ui'

import type { ArtifactDto, TaskDto } from '../../../shared/api.js'

function ArtifactTree({
  artifacts,
  selectedId,
  onSelect,
}: {
  artifacts: ArtifactDto[]
  selectedId: string
  onSelect: (id: string) => void
}): React.ReactElement {
  return (
    <ul className="space-y-0.5">
      {artifacts.map((artifact) => (
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
            <span className="text-[10px] text-muted-foreground capitalize">{artifact.status}</span>
          </Button>
        </li>
      ))}
    </ul>
  )
}

export interface TaskRightSidebarProps {
  task: TaskDto
  artifacts: ArtifactDto[]
  selectedArtifactId: string
  onSelectArtifact: (id: string) => void
}

export function TaskRightSidebar({
  task,
  artifacts,
  selectedArtifactId,
  onSelectArtifact,
}: TaskRightSidebarProps): React.ReactElement {
  return (
    <aside className="flex h-full min-h-0 flex-col bg-card/50">
      <div className="shrink-0 border-b border-border px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Inspector
        </p>
      </div>
      <Tabs defaultValue="artifacts" className="flex min-h-0 flex-1 flex-col gap-0">
        <TabsList
          variant="line"
          className="h-auto w-full shrink-0 rounded-none border-b border-border bg-transparent p-0 gap-0"
        >
          <TabsTrigger
            value="artifacts"
            className="flex-1 rounded-none border-0 py-2 text-[10px] uppercase shadow-none data-active:shadow-none"
          >
            Artifacts
          </TabsTrigger>
          <TabsTrigger
            value="files"
            className="flex-1 rounded-none border-0 py-2 text-[10px] uppercase shadow-none data-active:shadow-none"
          >
            Files
          </TabsTrigger>
          <TabsTrigger
            value="git"
            className="flex-1 rounded-none border-0 py-2 text-[10px] uppercase shadow-none data-active:shadow-none"
          >
            Git
          </TabsTrigger>
        </TabsList>

        <TabsContent value="artifacts" className="mt-0 min-h-0 flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-2">
              <ArtifactTree
                artifacts={artifacts}
                selectedId={selectedArtifactId}
                onSelect={onSelectArtifact}
              />
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="files" className="mt-0 min-h-0 flex-1">
          <div className="p-4 text-center text-xs text-muted-foreground">
            Changed files will appear here during implement and review.
          </div>
        </TabsContent>

        <TabsContent value="git" className="mt-0 min-h-0 flex-1">
          <div className="space-y-3 p-3 text-xs">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Branch
              </p>
              <p className="mt-1 font-mono">{task.branchName}</p>
            </div>
            <p className="text-muted-foreground">
              Git diff and validation output will appear here in a later milestone.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </aside>
  )
}

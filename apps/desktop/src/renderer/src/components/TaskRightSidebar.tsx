import {
  Button,
  Card,
  cn,
  ScrollArea,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@circuit/ui'

import type { ArtifactDto, FeedEventDto, TaskDto } from '../../../shared/api.js'

type RightTab = 'artifacts' | 'files' | 'git'

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

function formatEventLabel(event: FeedEventDto): string {
  switch (event.type) {
    case 'phase:started':
      return 'Phase started'
    case 'phase:completed':
      return 'Phase completed'
    case 'artifact:written':
      return 'Artifact written'
    case 'decision:required':
      return 'Decision required'
    case 'validation:passed':
      return 'Validation passed'
    case 'validation:failed':
      return 'Validation failed'
    case 'diff:ready':
      return 'Diff ready'
    case 'blocker:raised':
      return 'Blocker'
    default:
      return event.type
  }
}

function EventFeed({
  events,
  showRaw,
}: {
  events: FeedEventDto[]
  showRaw: boolean
}): React.ReactElement {
  const visible = showRaw
    ? events
    : events.filter((e) => e.type !== 'phase:started' && e.type !== 'phase:completed')

  return (
    <ul className="space-y-2 p-3">
      {visible.length === 0 && <li className="text-xs text-muted-foreground">No activity yet.</li>}
      {visible.map((event, i) => (
        <li key={event.id ?? `${event.type}-${i}`}>
          <Card size="sm" className="gap-2 py-3 shadow-none ring-0">
            <p className="px-4 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {formatEventLabel(event)}
            </p>
            {showRaw && (
              <pre className="px-4 whitespace-pre-wrap font-mono text-[10px] text-muted-foreground">
                {JSON.stringify(event.payload, null, 2)}
              </pre>
            )}
          </Card>
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
  feedEvents: FeedEventDto[]
  showRawFeed: boolean
  onToggleRawFeed: () => void
}

export function TaskRightSidebar({
  task,
  artifacts,
  selectedArtifactId,
  onSelectArtifact,
  feedEvents,
  showRawFeed,
  onToggleRawFeed,
}: TaskRightSidebarProps): React.ReactElement {
  return (
    <aside className="flex w-64 shrink-0 flex-col border-l border-border bg-card/50">
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

      <div className="flex max-h-48 shrink-0 flex-col border-t border-border">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Agent activity
          </p>
          <Button type="button" variant="link" size="xs" className="h-auto p-0" onClick={onToggleRawFeed}>
            {showRawFeed ? 'Structured' : 'Raw'}
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <EventFeed events={feedEvents} showRaw={showRawFeed} />
        </ScrollArea>
      </div>
    </aside>
  )
}

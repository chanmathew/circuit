import { ScrollArea } from '@circuit/ui'

export interface FileContentPanelProps {
  path: string
}

export function FileContentPanel({ path }: FileContentPanelProps): React.ReactElement {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-border px-4 py-3">
        <p className="text-sm font-medium">File</p>
        <p className="truncate font-mono text-xs text-muted-foreground">{path}</p>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-6 text-sm text-muted-foreground">
          File contents will render here when workspace file reads are wired to the content view.
        </div>
      </ScrollArea>
    </div>
  )
}

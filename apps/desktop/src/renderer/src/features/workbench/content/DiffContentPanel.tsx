import { ScrollArea } from '@circuit/ui'

import type { DiffEntry } from '../lib/workbench-content.js'

export interface DiffContentPanelProps {
  diff: DiffEntry | undefined
}

export function DiffContentPanel({ diff }: DiffContentPanelProps): React.ReactElement {
  if (!diff) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-sm text-muted-foreground">
        <p>Select a diff from the inspector or open one from the agent stream.</p>
      </div>
    )
  }

  const primaryPath = diff.paths[0]

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-border px-4 py-3">
        <p className="text-sm font-medium">{diff.title}</p>
        <p className="text-xs text-muted-foreground">{diff.summary}</p>
        {primaryPath && (
          <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">{primaryPath}</p>
        )}
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 p-4">
          <div>
            <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Changed files
            </p>
            <ul className="space-y-1 font-mono text-xs">
              {diff.paths.map((path) => (
                <li key={path} className="rounded px-2 py-1 hover:bg-accent/40">
                  {path}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Diff preview
            </p>
            <pre className="overflow-x-auto rounded-md border border-border bg-muted/20 p-4 font-mono text-xs leading-5">
              <span className="text-muted-foreground">@@ diff viewer connects in a later milestone @@</span>
              {'\n'}
              <span className="text-emerald-600">+ {diff.paths.length} file(s) in this slice</span>
            </pre>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

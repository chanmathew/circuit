import { Badge, ScrollArea, cn } from '@circuit/ui'

import type { CheckEntry } from '../lib/workbench-content.js'

export interface CheckContentPanelProps {
  check: CheckEntry | undefined
}

export function CheckContentPanel({ check }: CheckContentPanelProps): React.ReactElement {
  if (!check) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-sm text-muted-foreground">
        <p>Select a check from the inspector or open one from the agent stream.</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <p className="truncate font-mono text-sm font-medium">{check.command}</p>
          <p className="text-xs text-muted-foreground">Exit code {check.exitCode}</p>
        </div>
        <Badge variant={check.passed ? 'default' : 'destructive'} className="shrink-0">
          {check.passed ? 'Passed' : 'Failed'}
        </Badge>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <pre
          className={cn(
            'whitespace-pre-wrap p-4 font-mono text-xs leading-relaxed',
            check.passed ? 'text-foreground' : 'text-destructive/90',
          )}
        >
          {check.output?.trim() ||
            (check.passed
              ? 'All checks passed. Full command output will appear here when available.'
              : 'Check failed. Full command output will appear here when available.')}
        </pre>
      </ScrollArea>
    </div>
  )
}

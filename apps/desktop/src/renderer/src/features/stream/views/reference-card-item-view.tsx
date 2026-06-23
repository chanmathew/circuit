import type { ReferenceCardItem, StreamAction } from '@circuit/protocol'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@circuit/ui'

import type { StreamItemContext } from './stream-item-context.js'

export function ReferenceCardItemView({
  item,
  context,
}: {
  item: ReferenceCardItem
  context: StreamItemContext
}): React.ReactElement {
  const handleAction = (action: StreamAction): void => {
    if (action.action === 'reference.open') {
      context.onOpenReference?.(item.target)
      return
    }
    context.onStreamAction?.(action.action, action.payload)
  }

  return (
    <Card size="sm" className="gap-2 py-3 shadow-none ring-0">
      <CardHeader className="gap-1 px-4 py-0">
        <CardTitle className="text-xs leading-snug">{item.title}</CardTitle>
        {item.summary && <CardDescription className="text-[11px]">{item.summary}</CardDescription>}
      </CardHeader>
      {item.actions && item.actions.length > 0 && (
        <CardContent className="flex flex-wrap gap-1.5 px-4">
          {item.actions.map((action) => (
            <Button
              key={action.id}
              type="button"
              variant={action.id === 'open' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleAction(action)}
            >
              {action.label}
            </Button>
          ))}
        </CardContent>
      )}
    </Card>
  )
}

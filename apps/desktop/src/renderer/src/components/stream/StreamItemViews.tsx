import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  cn,
  Message,
  MessageContent,
  MessageResponse,
} from '@circuit/ui'
import type {
  ActionCardItem,
  ActivityGroupItem,
  AgentMessageItem,
  AgentRole,
  ReferenceCardItem,
  ReferenceTarget,
  StreamAction,
  UserMessageItem,
} from '@circuit/protocol'

import type { DecisionResolutionDto } from '../../../../shared/api.js'

const ROLE_LABELS: Record<AgentRole, string> = {
  driver: 'Driver',
  oracle: 'Oracle',
  scout: 'Scout',
  builder: 'Builder',
}

const STATUS_DOT: Record<ActivityGroupItem['items'][number]['status'], string> = {
  running: 'bg-primary animate-pulse',
  success: 'bg-emerald-500',
  failed: 'bg-destructive',
  warning: 'bg-amber-500',
  info: 'bg-muted-foreground',
}

const SEVERITY_BORDER: Record<NonNullable<ActionCardItem['severity']>, string> = {
  info: 'border-border',
  warning: 'border-amber-500/40',
  blocked: 'border-destructive/50',
  no_ship: 'border-destructive',
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export interface StreamItemContext {
  decisionResolutions?: DecisionResolutionDto[]
  onStreamAction?: (action: string, payload?: Record<string, unknown>) => void
  onOpenReference?: (target: ReferenceTarget) => void
}

export function UserMessageItemView({ item }: { item: UserMessageItem }): React.ReactElement {
  return (
    <div className="flex flex-col gap-1">
      <p className="px-1 text-[10px] font-medium text-muted-foreground">You</p>
      <Message from="user">
        <MessageContent>
          <MessageResponse>{item.text}</MessageResponse>
        </MessageContent>
      </Message>
      <span className="px-1 text-right font-mono text-[9px] text-muted-foreground">
        {formatTime(item.createdAt)}
      </span>
    </div>
  )
}

export function AgentMessageItemView({ item }: { item: AgentMessageItem }): React.ReactElement {
  return (
    <div className="flex flex-col gap-1">
      <p className="px-1 text-[10px] font-medium text-muted-foreground">
        {ROLE_LABELS[item.role]}
      </p>
      <Message from="assistant">
        <MessageContent>
          <MessageResponse>{item.text}</MessageResponse>
        </MessageContent>
      </Message>
      <span className="px-1 font-mono text-[9px] text-muted-foreground">
        {formatTime(item.createdAt)}
      </span>
    </div>
  )
}

export function ActivityGroupItemView({ item }: { item: ActivityGroupItem }): React.ReactElement {
  return (
    <Card size="sm" className="gap-2 py-3 shadow-none ring-0">
      <CardHeader className="gap-0 px-4 py-0">
        <CardTitle className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {item.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 px-4">
        {item.items.map((entry, index) => (
          <div key={`${entry.label}-${index}`} className="flex items-center gap-2 text-xs">
            <span className={cn('size-1.5 shrink-0 rounded-full', STATUS_DOT[entry.status])} />
            <span className="text-foreground">{entry.label}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function decisionIdFromItem(item: ActionCardItem): string | undefined {
  const payload = item.actions.find((action) => action.action === 'decision.resolve')?.payload
  return typeof payload?.decisionId === 'string' ? payload.decisionId : undefined
}

export function ActionCardItemView({
  item,
  context,
}: {
  item: ActionCardItem
  context: StreamItemContext
}): React.ReactElement {
  const decisionId = decisionIdFromItem(item)
  const resolution = decisionId
    ? context.decisionResolutions?.find((entry) => entry.decisionId === decisionId)
    : undefined

  const handleOption = (optionId: string, optionLabel: string): void => {
    if (!decisionId) return
    context.onStreamAction?.('decision.resolve', {
      decisionId,
      optionId,
      optionLabel,
    })
  }

  const handleAction = (action: StreamAction): void => {
    if (action.action === 'reference.open' && action.payload?.target) {
      context.onOpenReference?.(action.payload.target as ReferenceTarget)
      return
    }
    context.onStreamAction?.(action.action, action.payload)
  }

  return (
    <Card
      size="sm"
      className={cn(
        'gap-2 py-3 shadow-none',
        item.severity ? SEVERITY_BORDER[item.severity] : 'border-border',
      )}
    >
      <CardHeader className="gap-1 px-4 py-0">
        <CardTitle className="text-xs leading-snug">{item.title}</CardTitle>
        {item.summary && <CardDescription className="text-[11px]">{item.summary}</CardDescription>}
      </CardHeader>
      <CardContent className="flex flex-col gap-1 px-4">
        {item.options?.map((option, index) => {
          const isSelected = resolution?.optionId === option.id
          return (
            <Button
              key={option.id}
              type="button"
              variant="outline"
              disabled={Boolean(resolution)}
              className={cn(
                'h-auto w-full justify-start gap-2.5 px-3 py-2.5 text-left font-normal',
                isSelected && 'border-primary bg-primary/5 ring-1 ring-inset ring-primary/30',
                !isSelected && option.recommended && 'border-primary/40 bg-primary/5',
              )}
              onClick={() => handleOption(option.id, option.label)}
            >
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded border text-[11px] font-semibold',
                  isSelected
                    ? 'border-primary bg-primary/15 text-primary'
                    : 'border-border bg-muted/40 text-muted-foreground',
                )}
              >
                {String.fromCharCode(65 + index)}
              </span>
              <span className="flex-1">{option.label}</span>
              {option.recommended && (
                <Badge variant="default" className="shrink-0 text-[10px]">
                  Recommended
                </Badge>
              )}
            </Button>
          )
        })}
        {item.actions
          .filter((action) => action.action !== 'decision.resolve')
          .map((action) => (
            <Button
              key={action.id}
              type="button"
              variant={action.id === 'open' ? 'default' : 'outline'}
              size="sm"
              className="w-full"
              onClick={() => handleAction(action)}
            >
              {action.label}
            </Button>
          ))}
        {resolution && (
          <p className="pt-1 text-[10px] text-muted-foreground">
            Selected: {resolution.optionLabel}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

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

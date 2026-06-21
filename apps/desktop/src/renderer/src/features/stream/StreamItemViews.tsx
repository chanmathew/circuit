import { useState } from 'react'
import { CheckIcon, CopyIcon } from 'lucide-react'

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
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
  Shimmer,
  Task,
  TaskContent,
  TaskTrigger,
} from '@circuit/ui'
import type {
  ActionCardItem,
  ActivityGroupItem,
  AgentMessageItem,
  ReasoningItem,
  ReferenceCardItem,
  ReferenceTarget,
  StreamAction,
  SubagentRunItem,
  UserMessageItem,
} from '@circuit/protocol'

import type { DecisionResolutionDto } from '../../../../shared/api.js'

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

const messageActionsClassName =
  'w-full justify-start opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100'

function CopyMessageAction({ text }: { text: string }): React.ReactElement {
  const [copied, setCopied] = useState(false)

  const handleCopy = (): void => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <MessageAction
      tooltip={copied ? 'Copied' : 'Copy'}
      label={copied ? 'Copied' : 'Copy'}
      onClick={handleCopy}
    >
      {copied ? <CheckIcon className="size-3" /> : <CopyIcon className="size-3" />}
    </MessageAction>
  )
}

export interface StreamItemContext {
  decisionResolutions?: DecisionResolutionDto[]
  onStreamAction?: (action: StreamAction['action'], payload?: StreamAction['payload']) => void
  onOpenReference?: (target: ReferenceTarget) => void
}

function isArtifactReadyCard(item: ActionCardItem): boolean {
  const hasView = item.actions.some((action) => action.action === 'phase.open')
  const hasProceed = item.actions.some((action) => action.action === 'phase.approve')
  return hasView && hasProceed
}

function proceedPhaseFromItem(item: ActionCardItem): string | undefined {
  const approvePayload = item.actions.find((action) => action.action === 'phase.approve')?.payload
  if (typeof approvePayload?.phase === 'string') return approvePayload.phase
  if (typeof approvePayload?.phaseName === 'string') return approvePayload.phaseName

  const openPayload = item.actions.find((action) => action.action === 'phase.open')?.payload
  if (typeof openPayload?.phase === 'string') return openPayload.phase
  return undefined
}

export function UserMessageItemView({ item }: { item: UserMessageItem }): React.ReactElement {
  return (
    <Message from="user">
      <MessageContent>
        <MessageResponse>{item.text}</MessageResponse>
      </MessageContent>
    </Message>
  )
}

export function AgentMessageItemView({ item }: { item: AgentMessageItem }): React.ReactElement {
  return (
    <Message from="assistant">
      <MessageContent>
        <MessageResponse>{item.text}</MessageResponse>
      </MessageContent>
      <MessageActions className={messageActionsClassName}>
        <CopyMessageAction text={item.text} />
      </MessageActions>
    </Message>
  )
}

export function ReasoningItemView({ item }: { item: ReasoningItem }): React.ReactElement {
  return (
    <Reasoning isStreaming={item.isStreaming} defaultOpen={false}>
      <ReasoningTrigger />
      <ReasoningContent>{item.text}</ReasoningContent>
    </Reasoning>
  )
}

function liveCategoryLabel(item: ActivityGroupItem): string {
  const running = item.items.find((entry) => entry.status === 'running')
  const label = running?.label ?? item.title
  if (/^Edit|^Writ|^Patch/i.test(label)) return 'Editing'
  if (/^Run|^Ran|command/i.test(label)) return 'Running'
  if (/^Search|^Grep|^Glob|^List/i.test(label)) return 'Searching'
  return 'Exploring'
}

function DiffBadges({
  additions,
  deletions,
}: {
  additions?: number
  deletions?: number
}): React.ReactElement | null {
  if ((additions ?? 0) <= 0 && (deletions ?? 0) <= 0) return null

  return (
    <span className="flex shrink-0 items-center gap-1 font-mono text-xs tabular-nums">
      {additions !== undefined && additions > 0 && (
        <span className="text-emerald-600 dark:text-emerald-400">+{additions}</span>
      )}
      {deletions !== undefined && deletions > 0 && (
        <span className="text-red-500 dark:text-red-400">−{deletions}</span>
      )}
    </span>
  )
}

function ActivityRow({
  entry,
  isLive,
  showDot,
}: {
  entry: ActivityGroupItem['items'][number]
  isLive: boolean
  showDot: boolean
}): React.ReactElement {
  return (
    <div className="flex items-baseline gap-1.5 py-px text-xs text-muted-foreground">
      {!isLive && showDot && (
        <span
          className={cn('mt-[0.2em] size-1 shrink-0 rounded-full', STATUS_DOT[entry.status])}
        />
      )}
      <span className="flex min-w-0 flex-1 items-baseline gap-1">
        {entry.status === 'running' ? (
          <Shimmer duration={1.5}>{entry.label}</Shimmer>
        ) : (
          <span className="truncate">{entry.label}</span>
        )}
        {entry.detail && (
          <span className="shrink-0 text-muted-foreground/60">{entry.detail}</span>
        )}
        <DiffBadges additions={entry.additions} deletions={entry.deletions} />
      </span>
    </div>
  )
}

function LiveActivityPanel({
  item,
}: {
  item: ActivityGroupItem
}): React.ReactElement {
  const hasRunning = item.items.some((entry) => entry.status === 'running')
  const category = liveCategoryLabel(item)
  const visibleItems = item.items.slice(-4)

  return (
    <div className="space-y-1">
      <div className="sticky top-0 z-10 bg-background/95 pb-1 shadow-[0_6px_10px_-6px] shadow-background">
        <p className="text-xs font-medium text-foreground/90">{category}</p>
      </div>
      <div className="relative max-h-28 overflow-hidden">
        <div
          className={cn(
            'space-y-0.5',
            item.items.length > 3 &&
              'pointer-events-none [mask-image:linear-gradient(to_bottom,transparent,black_28%,black)]',
          )}
        >
          {visibleItems.map((entry, index) => (
            <ActivityRow
              key={`${entry.label}-${index}`}
              entry={entry}
              isLive
              showDot={false}
            />
          ))}
        </div>
      </div>
      {!hasRunning && (
        <Shimmer duration={1.5} className="text-xs text-muted-foreground">
          Planning next moves
        </Shimmer>
      )}
    </div>
  )
}

export function ActivityGroupItemView({ item }: { item: ActivityGroupItem }): React.ReactElement {
  const isLive = item.live === true
  if (isLive) {
    return <LiveActivityPanel item={item} />
  }

  const display = item.display ?? (item.items.length <= 3 ? 'flat' : 'summary')
  const hasRunning = item.items.some((entry) => entry.status === 'running')
  const defaultOpen =
    display === 'flat' ? true : isLive || hasRunning || item.collapsed !== true

  if (display === 'flat') {
    return (
      <div className="space-y-0">
        {item.items.map((entry, index) => (
          <ActivityRow
            key={`${entry.label}-${index}`}
            entry={entry}
            isLive={isLive}
            showDot
          />
        ))}
      </div>
    )
  }

  const titleContent =
    isLive && hasRunning ? <Shimmer duration={1.5}>{item.title}</Shimmer> : item.title

  return (
    <Task defaultOpen={defaultOpen} variant="inline" className="py-0">
      <TaskTrigger
        variant="inline"
        className="min-h-0"
        title={
          <span className="flex min-w-0 flex-1 items-baseline gap-1.5">
            <span className="truncate">{titleContent}</span>
            <DiffBadges additions={item.stats?.additions} deletions={item.stats?.deletions} />
          </span>
        }
        live={isLive && hasRunning}
      />
      <TaskContent variant="inline" className="space-y-0">
        {item.items.map((entry, index) => (
          <ActivityRow
            key={`${entry.label}-${index}`}
            entry={entry}
            isLive={isLive}
            showDot
          />
        ))}
      </TaskContent>
    </Task>
  )
}

export function SubagentRunItemView({ item }: { item: SubagentRunItem }): React.ReactElement {
  const isLive = item.live === true
  const hasRunning = item.status === 'running'
  const defaultOpen = isLive || hasRunning || item.collapsed !== true
  const title = `${item.subagentType} · ${item.description}`
  const titleContent =
    isLive && hasRunning ? <Shimmer duration={1.5}>{title}</Shimmer> : title
  const traceItems =
    isLive && item.trace ? item.trace.items.slice(-8) : (item.trace?.items ?? [])

  return (
    <Task defaultOpen={defaultOpen} variant="card" className="py-0">
      <TaskTrigger
        variant="card"
        title={titleContent}
        live={isLive && hasRunning}
        stepCount={item.stepCount}
      />
      {traceItems.length > 0 && (
        <TaskContent variant="card" className="space-y-0">
          {traceItems.map((entry, index) => (
            <ActivityRow
              key={`${entry.label}-${index}`}
              entry={entry}
              isLive={isLive}
              showDot={!isLive}
            />
          ))}
        </TaskContent>
      )}
    </Task>
  )
}

function decisionMetaFromItem(item: ActionCardItem): { decisionId?: string; phase?: string } {
  const payload = item.actions.find((action) => action.action === 'decision.resolve')?.payload
  return {
    decisionId: typeof payload?.decisionId === 'string' ? payload.decisionId : undefined,
    phase: typeof payload?.phase === 'string' ? payload.phase : undefined,
  }
}

export function ActionCardItemView({
  item,
  context,
}: {
  item: ActionCardItem
  context: StreamItemContext
}): React.ReactElement {
  const { decisionId, phase } = decisionMetaFromItem(item)
  const resolution = decisionId
    ? context.decisionResolutions?.find((entry) => entry.decisionId === decisionId)
    : undefined

  const handleOption = (optionId: string, optionLabel: string): void => {
    if (decisionId) {
      context.onStreamAction?.('decision.resolve', {
        decisionId,
        optionId,
        optionLabel,
        phase,
      })
      return
    }

    const revisionAction = item.actions.find(
      (action) =>
        action.action === 'revision.infer' &&
        typeof action.payload?.optionId === 'string' &&
        action.payload.optionId === optionId,
    )
    if (revisionAction) {
      context.onStreamAction?.('revision.infer', revisionAction.payload)
      return
    }

    const questionAction = item.actions.find((action) => action.action === 'question.reply')
    if (questionAction) {
      context.onStreamAction?.('question.reply', {
        ...questionAction.payload,
        selectedLabel: optionLabel,
      })
    }
  }

  const handleAction = (action: StreamAction): void => {
    if (action.action === 'reference.open' && action.payload?.target) {
      context.onOpenReference?.(action.payload.target as ReferenceTarget)
      return
    }
    if (action.action === 'phase.approve') {
      const phase =
        (typeof action.payload?.phase === 'string' ? action.payload.phase : undefined) ??
        (typeof action.payload?.phaseName === 'string' ? action.payload.phaseName : undefined) ??
        proceedPhaseFromItem(item)
      if (phase) {
        context.onStreamAction?.('phase.approve', { phase })
      }
      return
    }
    context.onStreamAction?.(action.action, action.payload)
  }

  const artifactReady = isArtifactReadyCard(item)

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
        {artifactReady ? (
          <div className="flex flex-wrap gap-1.5">
            {item.actions
              .filter((action) => action.action !== 'decision.resolve')
              .map((action) => (
                <Button
                  key={action.id}
                  type="button"
                  variant={action.action === 'phase.approve' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleAction(action)}
                >
                  {action.label}
                </Button>
              ))}
          </div>
        ) : (
          item.actions
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
            ))
        )}
        {item.footer && (
          <p className="pt-1 text-[10px] text-muted-foreground">{item.footer}</p>
        )}
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

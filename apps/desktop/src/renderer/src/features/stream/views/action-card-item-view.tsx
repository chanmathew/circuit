import type { ActionCardItem, ReferenceTarget, StreamAction } from '@circuit/protocol'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  cn,
} from '@circuit/ui'

import type { StreamItemContext } from './stream-item-context.js'
import { SEVERITY_BORDER } from './shared-styles.js'

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
      const approvePhase =
        (typeof action.payload?.phase === 'string' ? action.payload.phase : undefined) ??
        (typeof action.payload?.phaseName === 'string' ? action.payload.phaseName : undefined) ??
        proceedPhaseFromItem(item)
      if (approvePhase) {
        context.onStreamAction?.('phase.approve', { phase: approvePhase })
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

import { useState } from 'react'

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
import type { DecisionOption, DecisionRequiredPayload } from '@circuit/protocol'

export interface DecisionCardsProps {
  decisions: DecisionRequiredPayload[]
  /** Called when user picks an option (steering chat wiring comes later). */
  onSelectOption?: (decisionId: string, option: DecisionOption) => void
}

export function DecisionCards({
  decisions,
  onSelectOption,
}: DecisionCardsProps): React.ReactElement | null {
  if (decisions.length === 0) return null

  return (
    <div className="space-y-3 border-t border-border bg-muted/20 px-4 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Decisions
      </p>
      {decisions.map((decision) => (
        <DecisionCard
          key={decision.decisionId}
          decision={decision}
          onSelectOption={onSelectOption}
        />
      ))}
    </div>
  )
}

function DecisionCard({
  decision,
  onSelectOption,
}: {
  decision: DecisionRequiredPayload
  onSelectOption?: (decisionId: string, option: DecisionOption) => void
}): React.ReactElement {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  return (
    <Card size="sm" className="shadow-none">
      <CardHeader className="gap-1">
        <CardTitle className="text-xs leading-snug">{decision.title}</CardTitle>
        {decision.description && (
          <CardDescription className="text-[11px]">{decision.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-0.5">
        {decision.options.map((option, index) => {
          const isSelected = selectedId === option.id
          return (
            <Button
              key={option.id}
              type="button"
              variant="outline"
              className={cn(
                'h-auto w-full justify-start gap-2.5 px-3 py-2.5 text-left font-normal',
                isSelected && 'border-primary bg-primary/5 ring-1 ring-primary/30',
                !isSelected && option.recommended && 'border-primary/40 bg-primary/5',
              )}
              onClick={() => {
                setSelectedId(option.id)
                onSelectOption?.(decision.decisionId, option)
              }}
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
        {selectedId && (
          <p className="pt-1 text-[10px] text-muted-foreground">
            Selection recorded locally — workflow steering via chat arrives in a later milestone.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export function isDecisionRequiredPayload(payload: unknown): payload is DecisionRequiredPayload {
  if (typeof payload !== 'object' || payload === null) return false
  const p = payload as Record<string, unknown>
  return typeof p.decisionId === 'string' && typeof p.title === 'string' && Array.isArray(p.options)
}

export function decisionsFromFeed(
  events: { type: string; payload: unknown }[],
  phaseName?: string,
): DecisionRequiredPayload[] {
  return events
    .filter((event) => event.type === 'decision:required')
    .map((event) => event.payload)
    .filter(isDecisionRequiredPayload)
    .filter((decision) => !decision.phase || !phaseName || decision.phase === phaseName)
}

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

import type { DecisionResolutionDto } from '../../../shared/api.js'

export { decisionsFromFeed, isDecisionRequiredPayload } from '../lib/decisions.js'

export interface DecisionCardsProps {
  decisions: DecisionRequiredPayload[]
  resolutions?: DecisionResolutionDto[]
  onSelectOption?: (decisionId: string, option: DecisionOption) => void
}

export function DecisionCards({
  decisions,
  resolutions = [],
  onSelectOption,
}: DecisionCardsProps): React.ReactElement | null {
  if (decisions.length === 0) return null

  const resolvedById = new Map(resolutions.map((r) => [r.decisionId, r]))

  return (
    <section className="border-t border-border bg-card">
      <div className="border-b border-border px-6 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground">
          Human judgment
        </p>
      </div>
      <div className="space-y-3 px-6 py-4">
        {decisions.map((decision) => (
          <DecisionCard
            key={decision.decisionId}
            decision={decision}
            resolution={resolvedById.get(decision.decisionId)}
            onSelectOption={onSelectOption}
          />
        ))}
      </div>
    </section>
  )
}

function DecisionCard({
  decision,
  resolution,
  onSelectOption,
}: {
  decision: DecisionRequiredPayload
  resolution?: DecisionResolutionDto
  onSelectOption?: (decisionId: string, option: DecisionOption) => void
}): React.ReactElement {
  const selectedId = resolution?.optionId ?? null

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
              disabled={Boolean(resolution)}
              className={cn(
                'h-auto w-full justify-start gap-2.5 px-3 py-2.5 text-left font-normal',
                isSelected && 'border-primary bg-primary/5 ring-1 ring-inset ring-primary/30',
                !isSelected && option.recommended && 'border-primary/40 bg-primary/5',
              )}
              onClick={() => onSelectOption?.(decision.decisionId, option)}
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
        {resolution && (
          <p className="pt-1 text-[10px] text-muted-foreground">
            Selected: {resolution.optionLabel}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

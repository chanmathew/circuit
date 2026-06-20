import { useState } from 'react'

import { Button, cn, Input } from '@circuit/ui'

import type { HumanQaItem } from '../types.js'

interface HumanQaCardsProps {
  items: HumanQaItem[]
  onAnswer: (id: string, answer: string, usedCustom?: boolean) => void
  onDefer: (id: string) => void
  title?: string
}

export function HumanQaCards({
  items,
  onAnswer,
  onDefer,
  title,
}: HumanQaCardsProps): React.ReactElement {
  const remaining = items.filter((i) => i.status === 'pending' && !i.answer.trim()).length

  return (
    <div className="space-y-3">
      {title && (
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-xs font-medium text-foreground">{title}</p>
          {remaining > 0 && (
            <span className="text-[10px] text-muted-foreground">{remaining} remaining</span>
          )}
        </div>
      )}
      {items.map((item) => (
        <HumanQaCard key={item.id} item={item} onAnswer={onAnswer} onDefer={onDefer} />
      ))}
    </div>
  )
}

function HumanQaCard({
  item,
  onAnswer,
  onDefer,
}: {
  item: HumanQaItem
  onAnswer: (id: string, answer: string, usedCustom?: boolean) => void
  onDefer: (id: string) => void
}): React.ReactElement {
  const hasChoices = item.choices && item.choices.length > 0
  const recommended = item.choices?.find((c) => c.recommended)

  if (item.status === 'answered' && !hasChoices) {
    return (
      <div className="flex items-start gap-2 rounded-md border border-emerald-500/25 bg-emerald-500/5 px-3 py-2">
        <span className="mt-0.5 text-emerald-600 text-xs" aria-hidden>
          ✓
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground leading-snug">{item.question}</p>
          <p className="text-sm font-medium leading-snug mt-0.5">{item.answer}</p>
        </div>
      </div>
    )
  }

  if (item.status === 'deferred') {
    return (
      <div className="flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 opacity-60">
        <p className="text-xs text-muted-foreground line-through flex-1">{item.question}</p>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Deferred</span>
      </div>
    )
  }

  if (!hasChoices) {
    return (
      <CompactFreeformCard
        item={item}
        onAnswer={onAnswer}
        onDefer={onDefer}
        recommended={recommended?.label}
      />
    )
  }

  return <ChoiceQaCard item={item} onAnswer={onAnswer} onDefer={onDefer} />
}

function choiceLetter(index: number): string {
  return String.fromCharCode(65 + index)
}

function ChoiceQaCard({
  item,
  onAnswer,
  onDefer,
}: {
  item: HumanQaItem
  onAnswer: (id: string, answer: string, usedCustom?: boolean) => void
  onDefer: (id: string) => void
}): React.ReactElement {
  const choices = item.choices ?? []
  const otherLetter = choiceLetter(choices.length)
  const matchedChoice = choices.find((c) => c.label === item.answer)
  const isOtherSelected = Boolean(item.answer) && (item.usedCustomAnswer || !matchedChoice)
  const [customOpen, setCustomOpen] = useState(isOtherSelected)
  const [customText, setCustomText] = useState(isOtherSelected ? item.answer : '')

  const selectChoice = (label: string) => {
    setCustomOpen(false)
    onAnswer(item.id, label, false)
  }

  const selectOther = () => {
    setCustomOpen(true)
    setCustomText(isOtherSelected ? item.answer : '')
    if (matchedChoice) {
      onAnswer(item.id, '', false)
    }
  }

  const submitCustom = () => {
    const text = customText.trim()
    if (!text) return
    onAnswer(item.id, text, true)
  }

  const showCustomInput = customOpen || isOtherSelected

  return (
    <div className="rounded-md border border-border bg-card px-3 py-2.5 space-y-2">
      <p className="text-xs leading-snug text-foreground">{item.question}</p>

      <div className="flex flex-col gap-0.5">
        {choices.map((choice, index) => {
          const isSelected = item.answer === choice.label
          return (
            <button
              key={choice.id}
              type="button"
              onClick={() => selectChoice(choice.label)}
              className={cn(
                'group flex w-full items-center gap-2.5 rounded-md px-1.5 py-1.5 text-left transition-colors',
                isSelected
                  ? 'bg-primary/10 ring-1 ring-inset ring-primary/35'
                  : 'hover:bg-accent/80',
                !isSelected && choice.recommended && 'bg-primary/4',
              )}
            >
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded border text-[11px] font-semibold tabular-nums',
                  isSelected
                    ? 'border-primary bg-primary/15 text-primary'
                    : choice.recommended
                      ? 'border-primary/50 bg-primary/10 text-primary'
                      : 'border-border bg-muted/40 text-muted-foreground group-hover:border-foreground/20 group-hover:text-foreground',
                )}
              >
                {choiceLetter(index)}
              </span>
              <span className="min-w-0 flex-1 text-xs leading-snug text-foreground">
                {choice.label}
              </span>
              {choice.recommended && (
                <span className="shrink-0 text-[10px] font-medium text-primary">Recommended</span>
              )}
            </button>
          )
        })}

        <button
          type="button"
          onClick={selectOther}
          className={cn(
            'group flex w-full items-center gap-2.5 rounded-md px-1.5 py-1.5 text-left transition-colors',
            isOtherSelected || customOpen
              ? 'bg-primary/10 ring-1 ring-inset ring-primary/35'
              : 'hover:bg-accent/80',
          )}
        >
          <span
            className={cn(
              'flex h-6 w-6 shrink-0 items-center justify-center rounded border border-dashed text-[11px] font-semibold tabular-nums',
              isOtherSelected || customOpen
                ? 'border-primary bg-primary/15 text-primary'
                : 'border-border bg-muted/20 text-muted-foreground group-hover:text-foreground',
            )}
          >
            {otherLetter}
          </span>
          <span className="text-xs text-muted-foreground group-hover:text-foreground">
            Other — custom answer
          </span>
        </button>
      </div>

      <div className={cn('pl-8', !showCustomInput && 'hidden')}>
        <div className="flex gap-1.5">
          <Input
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="Type your answer…"
            className="h-8 flex-1 text-xs"
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitCustom()
            }}
          />
          <Button
            type="button"
            size="sm"
            className="h-8 shrink-0 text-xs"
            onClick={submitCustom}
            disabled={!customText.trim()}
          >
            Save
          </Button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onDefer(item.id)}
        className="text-[10px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
      >
        Defer
      </button>
    </div>
  )
}

function CompactFreeformCard({
  item,
  onAnswer,
  onDefer,
  recommended,
}: {
  item: HumanQaItem
  onAnswer: (id: string, answer: string, usedCustom?: boolean) => void
  onDefer: (id: string) => void
  recommended?: string
}): React.ReactElement {
  const [text, setText] = useState(item.answer)

  return (
    <div className="rounded-md border border-border bg-card px-3 py-2.5 space-y-2">
      <p className="text-xs leading-snug">{item.question}</p>
      {recommended && (
        <p className="text-[10px] text-muted-foreground">
          Recommended: <span className="text-foreground font-medium">{recommended}</span>
        </p>
      )}
      <div className="flex gap-1.5">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Your answer…"
          className="h-8 text-xs"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && text.trim()) onAnswer(item.id, text.trim(), true)
          }}
        />
        <Button
          type="button"
          size="sm"
          className="h-8 shrink-0 text-xs"
          disabled={!text.trim()}
          onClick={() => onAnswer(item.id, text.trim(), true)}
        >
          Save
        </Button>
      </div>
      <button
        type="button"
        onClick={() => onDefer(item.id)}
        className="text-[10px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
      >
        Defer
      </button>
    </div>
  )
}

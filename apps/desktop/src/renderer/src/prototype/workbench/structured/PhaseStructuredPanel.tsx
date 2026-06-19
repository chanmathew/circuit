import { useState } from 'react'

import { Button, cn } from '@circuit/ui'

import { structuredPanelTitle } from '../phase-approval.js'
import type {
  PhaseStructuredData,
  RevisionDraft,
  WorkbenchActions,
} from '../types.js'
import { HumanQaCards } from './HumanQaCards.js'
import { RevisionForm } from './RevisionDrawer.js'

interface PhaseStructuredPanelProps {
  data: PhaseStructuredData
  actions: WorkbenchActions
  visible: boolean
  revisionOpen?: boolean
  revisionDraft?: RevisionDraft
  phaseLabel?: string
}

export function PhaseStructuredPanel({
  data,
  actions,
  visible,
  revisionOpen = false,
  revisionDraft,
  phaseLabel = 'phase',
}: PhaseStructuredPanelProps): React.ReactElement | null {
  if (!visible || data.mode === 'none') return null

  const humanQaRemaining =
    !revisionOpen && data.mode === 'human_qa'
      ? data.items.filter((i) => i.status === 'pending' && !i.answer.trim()).length
      : 0

  return (
    <section className="border-t border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-6 py-3">
        <div className="flex min-w-0 items-baseline gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground">
            {revisionOpen ? `Revision request — ${phaseLabel}` : structuredPanelTitle(data)}
          </p>
          {humanQaRemaining > 0 && (
            <span className="text-[10px] text-muted-foreground">{humanQaRemaining} remaining</span>
          )}
        </div>
      </div>
      <div className="px-6 py-4 space-y-3">
        {revisionOpen && revisionDraft ? (
          <RevisionForm draft={revisionDraft} actions={actions} />
        ) : (
          <>
        {data.mode === 'human_qa' && (
          <HumanQaCards
            items={data.items}
            onAnswer={(id, answer, usedCustom) => actions.answerHumanQa(id, answer, usedCustom)}
            onDefer={actions.deferHumanQa}
          />
        )}
        {data.mode === 'research_verify' && (
          <FindingVerifyList findings={data.findings} onVerify={actions.verifyFinding} />
        )}
        {data.mode === 'design_review' && (
          <>
            <HumanQaCards
              items={data.decisions}
              onAnswer={(id, answer, usedCustom) => actions.answerHumanQa(id, answer, usedCustom)}
              onDefer={actions.deferHumanQa}
              title="Key decisions"
            />
            <HumanQaCards
              items={data.openQuestions}
              onAnswer={(id, answer, usedCustom) => actions.answerHumanQa(id, answer, usedCustom)}
              onDefer={actions.deferHumanQa}
              title="Open questions"
            />
          </>
        )}
        {data.mode === 'structure_slices' && (
          <StructureSliceCards slices={data.slices} onApprove={actions.approveStructureSlice} />
        )}
        {data.mode === 'plan_slices' && (
          <PlanSliceAccordion slices={data.slices} onApprove={actions.approvePlanSlice} />
        )}
        {data.mode === 'review_checklist' && (
          <ReviewChecklistPanel items={data.items} onToggle={actions.toggleReviewChecklist} />
        )}
          </>
        )}
      </div>
    </section>
  )
}

function FindingVerifyList({
  findings,
  onVerify,
}: {
  findings: import('../types.js').ResearchFinding[]
  onVerify: (id: string, status: import('../types.js').FindingStatus) => void
}): React.ReactElement {
  return (
    <div className="space-y-2">
      {findings.map((f) => (
        <div key={f.id} className="rounded-md border border-border bg-card p-3 space-y-1">
          <p className="font-mono text-[10px] text-primary">{f.path}</p>
          <p className="text-xs">{f.fact}</p>
          <div className="flex gap-1 pt-1">
            <Button
              type="button"
              size="sm"
              variant={f.status === 'confirmed' ? 'default' : 'outline'}
              className="h-7 text-xs"
              onClick={() => onVerify(f.id, 'confirmed')}
            >
              Confirm
            </Button>
            <Button
              type="button"
              size="sm"
              variant={f.status === 'disputed' ? 'default' : 'outline'}
              className="h-7 text-xs"
              onClick={() => onVerify(f.id, 'disputed')}
            >
              Dispute
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}

function StructureSliceCards({
  slices,
  onApprove,
}: {
  slices: import('../types.js').StructureSliceItem[]
  onApprove: (id: string) => void
}): React.ReactElement {
  return (
    <div className="space-y-2">
      {slices.map((s) => (
        <div
          key={s.id}
          className={cn(
            'rounded-md border p-3',
            s.status === 'approved' ? 'border-emerald-500/30 bg-emerald-500/5 opacity-80' : 'border-border bg-card',
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium">{s.title}</p>
              <p className="text-xs text-muted-foreground">{s.scope}</p>
              <p className="text-[10px] font-mono text-muted-foreground mt-1">{s.files.join(', ')}</p>
            </div>
            {s.status === 'pending' && (
              <Button type="button" size="sm" className="h-7 text-xs shrink-0" onClick={() => onApprove(s.id)}>
                Approve slice
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function PlanSliceAccordion({
  slices,
  onApprove,
}: {
  slices: import('../types.js').PlanSliceDetail[]
  onApprove: (id: string) => void
}): React.ReactElement {
  const [openId, setOpenId] = useState(slices[0]?.id ?? '')

  return (
    <div className="space-y-1">
      {slices.map((s) => {
        const open = openId === s.id
        return (
          <div key={s.id} className="rounded-md border border-border bg-card overflow-hidden">
            <button
              type="button"
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium hover:bg-accent/50"
              onClick={() => setOpenId(open ? '' : s.id)}
            >
              {s.title}
              <span className="text-[10px] text-muted-foreground">{s.status}</span>
            </button>
            {open && (
              <div className="border-t border-border px-3 py-2 space-y-2 text-xs">
                <p className="text-muted-foreground">{s.goal}</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  {s.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ul>
                <p className="font-mono text-[10px] text-primary">{s.validation}</p>
                {s.status === 'pending' && (
                  <Button type="button" size="sm" className="h-7 text-xs" onClick={() => onApprove(s.id)}>
                    Approve slice plan
                  </Button>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function ReviewChecklistPanel({
  items,
  onToggle,
}: {
  items: import('../types.js').ReviewChecklistItem[]
  onToggle: (id: string) => void
}): React.ReactElement {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <label key={item.id} className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm cursor-pointer hover:bg-accent/30">
          <input
            type="checkbox"
            checked={item.checked}
            onChange={() => onToggle(item.id)}
            className="rounded"
          />
          {item.label}
        </label>
      ))}
    </div>
  )
}
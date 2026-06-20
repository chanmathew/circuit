import { Badge, Button, cn, ScrollArea, Separator, Textarea } from '@circuit/ui'

import {
  canApprovePhase,
  getApproveBlockedReason,
  getProceedLabel,
  isInPhaseReview,
} from './phase-approval.js'

import { PhaseStatusBadge } from './PhaseStatusBadge.js'
import { PHASE_STATUS_DOT } from './phase-styles.js'
import type {
  ActivityEvent,
  ChangedFile,
  ImplementationSlice,
  PrototypeArtifact,
  PrototypePhase,
  WorkbenchActions,
  WorkbenchState,
} from './types.js'

export function WorkbenchHeader({
  state,
  compact = false,
}: {
  state: WorkbenchState
  compact?: boolean
}): React.ReactElement {
  return (
    <header
      className={cn('shrink-0 border-b border-border bg-card', compact ? 'px-4 py-3' : 'px-5 py-4')}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <h1
            className={cn(
              'font-semibold tracking-tight truncate',
              compact ? 'text-base' : 'text-lg',
            )}
          >
            {state.task.title}
          </h1>
          <p className="text-xs text-muted-foreground truncate">
            {state.task.repoName} · {state.task.workflowLabel} ·{' '}
            <span className="font-mono">{state.task.branchName}</span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant="outline" className="text-[10px]">
            {state.task.status}
          </Badge>
          <Button variant="outline" size="sm" type="button" onClick={() => {}}>
            Open in Cursor
          </Button>
        </div>
      </div>
      <p className="mt-2 text-xs text-primary font-medium">Next: {state.task.nextAction}</p>
    </header>
  )
}

export function HorizontalPhaseRail({
  phases,
  onSelectPhase,
}: {
  phases: PrototypePhase[]
  onSelectPhase: (name: string) => void
}): React.ReactElement {
  return (
    <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-border bg-muted/20 px-4 py-2">
      {phases.map((phase, i) => (
        <div key={phase.name} className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            disabled={phase.status === 'locked'}
            onClick={() => onSelectPhase(phase.name)}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-colors',
              phase.status === 'locked'
                ? 'cursor-not-allowed opacity-40'
                : 'hover:bg-accent cursor-pointer',
              (phase.status === 'needs_review' || phase.status === 'running') && 'bg-accent/60',
            )}
          >
            <span className={cn('h-2 w-2 rounded-full shrink-0', PHASE_STATUS_DOT[phase.status])} />
            <span className="font-medium">{phase.label}</span>
          </button>
          {i < phases.length - 1 && (
            <span className="text-muted-foreground/40 text-[10px] px-0.5">→</span>
          )}
        </div>
      ))}
    </div>
  )
}

export function ArtifactTree({
  artifacts,
  selectedId,
  onSelect,
}: {
  artifacts: PrototypeArtifact[]
  selectedId: string
  onSelect: (id: string) => void
}): React.ReactElement {
  return (
    <div className="space-y-0.5">
      {artifacts.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={() => onSelect(a.id)}
          className={cn(
            'flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors',
            selectedId === a.id ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50',
            a.status === 'stale' && 'opacity-60',
          )}
        >
          <span className="font-mono truncate">{a.filename}</span>
          {a.status !== 'draft' && (
            <span className="shrink-0 text-[9px] uppercase text-muted-foreground">{a.status}</span>
          )}
        </button>
      ))}
    </div>
  )
}

export function ChangedFilesList({ files }: { files: ChangedFile[] }): React.ReactElement {
  if (files.length === 0) {
    return <p className="px-2 text-xs text-muted-foreground">No files changed yet.</p>
  }
  return (
    <div className="space-y-0.5">
      {files.map((f) => (
        <button
          key={f.path}
          type="button"
          className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-accent/50 font-mono"
        >
          <span className="truncate">{f.path}</span>
          <span className="shrink-0 text-[10px]">
            <span className="text-emerald-600">+{f.additions}</span>{' '}
            <span className="text-red-500">−{f.deletions}</span>
          </span>
        </button>
      ))}
    </div>
  )
}

export function ActivityFeed({ events }: { events: ActivityEvent[] }): React.ReactElement {
  return (
    <ScrollArea className="h-full">
      <div className="space-y-2 p-3">
        {events.map((e) => (
          <div key={e.id} className="text-xs">
            <span className="font-mono text-muted-foreground">{e.timestamp}</span>
            <span
              className={cn(
                'ml-2',
                e.type === 'command' && 'text-primary',
                e.type === 'file_read' && 'text-muted-foreground',
              )}
            >
              {e.type === 'file_read' && '📄 '}
              {e.type === 'command' && '▸ '}
              {e.content}
            </span>
          </div>
        ))}
        {events.length === 0 && (
          <p className="text-xs text-muted-foreground">No agent activity yet.</p>
        )}
      </div>
    </ScrollArea>
  )
}

export function ArtifactEditor({
  artifact,
  preview,
  onPreviewChange,
}: {
  artifact: PrototypeArtifact | undefined
  preview: boolean
  onPreviewChange: (preview: boolean) => void
}): React.ReactElement {
  if (!artifact) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Select an artifact
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-border bg-card px-4 py-2">
        <div>
          <p className="text-sm font-medium">{artifact.title}</p>
          <PhaseStatusBadge
            status={
              artifact.status === 'draft'
                ? 'locked'
                : artifact.status === 'approved'
                  ? 'approved'
                  : artifact.status === 'stale'
                    ? 'stale'
                    : 'needs_review'
            }
            className="mt-1"
          />
        </div>
        <div className="flex gap-1">
          <Button
            variant={preview ? 'ghost' : 'secondary'}
            size="sm"
            type="button"
            onClick={() => onPreviewChange(false)}
          >
            Source
          </Button>
          <Button
            variant={preview ? 'secondary' : 'ghost'}
            size="sm"
            type="button"
            onClick={() => onPreviewChange(true)}
          >
            Preview
          </Button>
        </div>
      </div>
      {preview ? (
        <article className="prose prose-sm dark:prose-invert max-w-none p-6">
          <MarkdownPreview content={artifact.content} />
        </article>
      ) : (
        <Textarea
          className="min-h-[320px] resize-none rounded-none border-0 font-mono text-sm focus-visible:ring-0"
          defaultValue={artifact.content}
          readOnly
        />
      )}
    </div>
  )
}

function MarkdownPreview({ content }: { content: string }): React.ReactElement {
  const lines = content.split('\n')
  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {lines.map((line, i) => {
        if (line.startsWith('# '))
          return (
            <h1 key={i} className="text-xl font-bold mt-0 mb-3">
              {line.slice(2)}
            </h1>
          )
        if (line.startsWith('## '))
          return (
            <h2 key={i} className="text-base font-semibold mt-4 mb-2">
              {line.slice(3)}
            </h2>
          )
        if (line.startsWith('### '))
          return (
            <h3 key={i} className="text-sm font-semibold mt-3 mb-1">
              {line.slice(4)}
            </h3>
          )
        if (line.startsWith('- '))
          return (
            <li key={i} className="ml-4 list-disc">
              {renderInline(line.slice(2))}
            </li>
          )
        if (line.startsWith('|'))
          return (
            <pre key={i} className="text-xs overflow-x-auto">
              {line}
            </pre>
          )
        if (line.startsWith('```')) return null
        if (line.trim() === '') return <br key={i} />
        if (line.startsWith('---')) return <Separator key={i} className="my-4" />
        return <p key={i}>{renderInline(line)}</p>
      })}
    </div>
  )
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(`[^`]+`)/g)
  return parts.map((part, i) =>
    part.startsWith('`') && part.endsWith('`') ? (
      <code key={i} className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
        {part.slice(1, -1)}
      </code>
    ) : (
      part
    ),
  )
}

export function DiffPanel({
  files,
  sliceFeedback,
  onSliceFeedbackChange,
}: {
  files: ChangedFile[]
  sliceFeedback?: string
  onSliceFeedbackChange?: (text: string) => void
}): React.ReactElement {
  const file = files[0]
  return (
    <div className="flex flex-1 flex-col min-h-0">
      <div className="border-b border-border px-4 py-2">
        <p className="text-sm font-medium">Diff review</p>
        <p className="text-xs text-muted-foreground font-mono">
          {file?.path ?? 'No file selected'}
        </p>
      </div>
      <ScrollArea className="flex-1">
        <pre className="p-4 font-mono text-xs leading-5">
          <span className="text-muted-foreground">@@ -42,6 +42,12 @@</span>
          {'\n'}
          <span className="text-red-500/80">- await routeMessage(msg)</span>
          {'\n'}
          <span className="text-emerald-600">
            + const classification = classifyInboundEmail(msg)
          </span>
          {'\n'}
          <span className="text-emerald-600">
            + await routeMessage(msg, &#123; classification &#125;)
          </span>
          {'\n'}
          {'\n'}
          <span className="text-muted-foreground"> export function handleWebhook(event) {'{'}</span>
          {'\n'}
          <span className="text-emerald-600">
            + if (event.classification) payload.classification = event.classification
          </span>
          {'\n'}
        </pre>
        {onSliceFeedbackChange && (
          <div className="border-t border-border p-4 space-y-2">
            <p className="text-xs font-medium">Slice feedback</p>
            <Textarea
              value={sliceFeedback ?? ''}
              onChange={(e) => onSliceFeedbackChange(e.target.value)}
              placeholder="Request changes (bullets, not chat)…"
              className="min-h-[64px] text-xs resize-none"
            />
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

export function ImplementationPanel({
  slices,
  activeIndex,
  isRunning,
}: {
  slices: ImplementationSlice[]
  activeIndex: number
  isRunning: boolean
}): React.ReactElement {
  const active = slices[activeIndex]
  return (
    <ScrollArea className="flex-1">
      <div className="space-y-4 p-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Active slice
          </p>
          <p className="mt-1 text-base font-semibold">{active?.title ?? 'No active slice'}</p>
          <p className="text-sm text-muted-foreground">{active?.scope}</p>
        </div>
        {isRunning && (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
            Agent implementing slice…
          </div>
        )}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">All slices</p>
          <div className="space-y-2">
            {slices.map((s, i) => (
              <div
                key={s.id}
                className={cn(
                  'rounded-md border px-3 py-2 text-sm',
                  s.status === 'active' && 'border-primary bg-primary/5',
                  s.status === 'done' && 'opacity-60',
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{s.title}</span>
                  <span className="text-[10px] uppercase text-muted-foreground">{s.status}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{s.filesExpected.join(', ')}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ScrollArea>
  )
}

export function FinalReviewPanel({ content }: { content: string }): React.ReactElement {
  return (
    <ScrollArea className="flex-1">
      <div className="p-6 space-y-4">
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
            Ready for PR
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Review summary generated from artifacts
          </p>
        </div>
        <pre className="whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-4 font-mono text-xs leading-relaxed">
          {content.split('## PR summary')[1] ?? content}
        </pre>
        <Button type="button" size="sm" onClick={() => void navigator.clipboard.writeText(content)}>
          Copy PR summary
        </Button>
      </div>
    </ScrollArea>
  )
}

export function ActionBar({
  state,
  actions,
}: {
  state: WorkbenchState
  actions: WorkbenchActions
}): React.ReactElement | null {
  const readyPhase = state.phases.find((p) => p.status === 'ready' || p.status === 'needs_revision')
  const isImplementPhase = state.phases.some(
    (p) =>
      p.name === 'implement' &&
      (p.status === 'running' || p.status === 'approved' || state.slices.length > 0),
  )
  const inPhaseReview = isInPhaseReview(state)
  const canApprove = canApprovePhase(state)
  const blockedReason = getApproveBlockedReason(state)
  const proceedLabel = getProceedLabel(state)

  const hasBarContent =
    inPhaseReview ||
    (readyPhase && !state.isAgentRunning) ||
    (isImplementPhase && state.mainMode === 'implementation') ||
    state.mainMode === 'diff' ||
    state.mainMode === 'artifact' ||
    state.mainMode === 'implementation' ||
    state.mainMode === 'final_review' ||
    state.isAgentRunning

  if (!hasBarContent) return null

  return (
    <div className="shrink-0 border-t border-border bg-card">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        {inPhaseReview && !state.revisionOpen && (
          <>
            <Button
              type="button"
              size="sm"
              onClick={actions.approveCurrentPhase}
              disabled={!canApprove}
              title={blockedReason ?? undefined}
            >
              {proceedLabel}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={actions.openRevision}>
              Request revision
            </Button>
            {!canApprove && blockedReason && (
              <span className="text-xs text-muted-foreground">{blockedReason}</span>
            )}
          </>
        )}
        {inPhaseReview && state.revisionOpen && (
          <>
            <Button
              type="button"
              size="sm"
              onClick={actions.submitRevision}
              disabled={!state.revisionDraft.note.trim()}
            >
              Submit revision
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={actions.closeRevision}>
              Cancel
            </Button>
          </>
        )}
        {readyPhase && !state.isAgentRunning && (
          <Button
            type="button"
            size="sm"
            onClick={actions.runCurrentPhase}
            disabled={state.isAgentRunning}
          >
            Run {readyPhase.label.toLowerCase()}
          </Button>
        )}
        {isImplementPhase && state.mainMode === 'implementation' && (
          <Button
            type="button"
            size="sm"
            onClick={actions.implementNextSlice}
            disabled={state.isAgentRunning}
          >
            {state.isAgentRunning ? 'Implementing…' : 'Implement next slice'}
          </Button>
        )}
        {state.mainMode === 'diff' && (
          <>
            <Button type="button" size="sm" onClick={actions.approveSlice}>
              Approve slice
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={actions.requestSliceChanges}>
              Request changes
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={actions.runValidation}>
              Run validation
            </Button>
          </>
        )}
        {(state.mainMode === 'artifact' || state.mainMode === 'implementation') &&
          !(inPhaseReview && state.revisionOpen) && (
            <Button type="button" variant="ghost" size="sm" onClick={actions.runValidation}>
              Run validation
            </Button>
          )}
        {state.mainMode === 'final_review' && (
          <Button
            type="button"
            size="sm"
            onClick={() => void navigator.clipboard.writeText('PR summary copied')}
          >
            Copy PR summary
          </Button>
        )}
        {state.isAgentRunning && (
          <span className="text-xs text-amber-600 dark:text-amber-400 animate-pulse">
            Agent running…
          </span>
        )}
      </div>
    </div>
  )
}

export function MainPanelContent({
  state,
  preview,
  onPreviewChange,
  actions,
}: {
  state: WorkbenchState
  preview: boolean
  onPreviewChange: (preview: boolean) => void
  actions?: WorkbenchActions
}): React.ReactElement {
  const selectedArtifact = state.artifacts.find((a) => a.id === state.selectedArtifactId)

  switch (state.mainMode) {
    case 'implementation':
      return (
        <ImplementationPanel
          slices={state.slices}
          activeIndex={state.activeSliceIndex}
          isRunning={state.isAgentRunning}
        />
      )
    case 'diff':
      return (
        <DiffPanel
          files={state.changedFiles}
          sliceFeedback={state.sliceFeedback}
          onSliceFeedbackChange={actions?.setSliceFeedback}
        />
      )
    case 'final_review':
      return <FinalReviewPanel content={selectedArtifact?.content ?? ''} />
    default:
      return (
        <ArtifactEditor
          artifact={selectedArtifact}
          preview={preview}
          onPreviewChange={onPreviewChange}
        />
      )
  }
}

export function GitPanel({
  branchName,
  changedFiles,
  validationOutput,
}: {
  branchName: string
  changedFiles: ChangedFile[]
  validationOutput: string | null
}): React.ReactElement {
  const hasChanges = changedFiles.length > 0

  return (
    <div className="space-y-3 p-2">
      <div className="rounded-md border border-border bg-card p-2.5">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Branch
        </p>
        <p className="mt-0.5 font-mono text-xs">{branchName}</p>
        <p className="mt-2 text-[10px] text-muted-foreground">
          {hasChanges ? `${changedFiles.length} modified` : 'Working tree clean'}
        </p>
      </div>

      {hasChanges && (
        <div>
          <p className="mb-1 px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Status
          </p>
          <div className="space-y-0.5 font-mono text-xs">
            {changedFiles.map((f) => (
              <div key={f.path} className="flex gap-2 rounded px-1 py-0.5 hover:bg-accent/40">
                <span className="text-amber-600 shrink-0">M</span>
                <span className="truncate">{f.path}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {validationOutput && (
        <div>
          <p className="mb-1 px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Last validation
          </p>
          <pre className="whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-2 font-mono text-[10px]">
            {validationOutput}
          </pre>
        </div>
      )}

      {!hasChanges && !validationOutput && (
        <p className="px-1 text-xs text-muted-foreground">No git changes for this task yet.</p>
      )}
    </div>
  )
}

export function RightSidebarTabs({
  state,
  actions,
}: {
  state: WorkbenchState
  actions: WorkbenchActions
}): React.ReactElement {
  const tabs = [
    { id: 'artifacts' as const, label: 'Artifacts' },
    { id: 'files' as const, label: 'Files' },
    { id: 'git' as const, label: 'Git' },
  ]

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => actions.setRightTab(tab.id)}
            className={cn(
              'flex-1 px-2 py-2 text-[10px] font-medium uppercase tracking-wide transition-colors',
              state.rightTab === tab.id
                ? 'border-b-2 border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <ScrollArea className="flex-1">
        {state.rightTab === 'artifacts' && (
          <div className="p-2">
            <ArtifactTree
              artifacts={state.artifacts}
              selectedId={state.selectedArtifactId}
              onSelect={actions.selectArtifact}
            />
          </div>
        )}
        {state.rightTab === 'files' && (
          <div className="p-2">
            <ChangedFilesList files={state.changedFiles} />
          </div>
        )}
        {state.rightTab === 'git' && (
          <GitPanel
            branchName={state.task.branchName}
            changedFiles={state.changedFiles}
            validationOutput={state.validationOutput}
          />
        )}
      </ScrollArea>
    </div>
  )
}

export function LeftSidebarTabs({
  state,
  actions,
}: {
  state: WorkbenchState
  actions: WorkbenchActions
}): React.ReactElement {
  return <RightSidebarTabs state={state} actions={actions} />
}

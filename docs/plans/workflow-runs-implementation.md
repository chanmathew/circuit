# Implementation plan: Workflow runs and history

**ADR:** [003-workflow-runs-and-history.md](../adr/003-workflow-runs-and-history.md)  
**Status:** Implemented (MVP — Phases A–E)  
**Goal:** Introduce `WorkflowRun` entity, Current/Past panel UX, terminal semantics, completion summary, and follow-up workflows — without changing ADR 002 chat-always shell.

---

## Locked product rules

1. **At most one active WorkflowRun** per task; enforce in DB or service layer.
2. **Completed** runs → Past workflows; outputs authoritative; **no restart**.
3. **Cancelled** runs → Past workflows; outputs historical/partial.
4. Neither terminal state deletes chat, artifacts, logs, diffs, or stream history.
5. **Discard draft** when ticket-only; **Cancel workflow** when phases/artifacts exist.
6. **Follow-up workflow** creates a new run — never mutates a terminal run’s rows.
7. Post-complete chat does not silently mutate completed runs; offer follow-up card on structured intent.
8. Task chat (`phase = chat`) remains **task-scoped**, not run-scoped.
9. `tasks.workflow_status` kept in sync during migration (derived cache).

**MVP deferrals:** reopen completed, resume cancelled, archive/hide runs, rich cancel dialog, worktree cleanup after build-phase cancel.

---

## Phase A — Schema and migration

### A.1 `workflow_runs` table

**Files:** `packages/db/src/schema.ts`, drizzle migration via `pnpm db:generate`

```ts
export const workflowRuns = sqliteTable('workflow_runs', {
  id: text('id').primaryKey(),
  taskId: text('task_id').notNull().references(() => tasks.id),
  status: text('status').notNull(), // active | completed | cancelled
  workflowType: text('workflow_type').notNull(),
  title: text('title').notNull(),
  startedAt: text('started_at').notNull(),
  completedAt: text('completed_at'),
  cancelledAt: text('cancelled_at'),
  currentPhaseId: text('current_phase_id'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})
```

App-level invariant: only one `status = 'active'` per `taskId` (document in schema comment; enforce in `enableWorkflow` / follow-up).

### A.2 FK columns on child tables

Add nullable then backfill `workflow_run_id` to:

| Table | Notes |
|-------|-------|
| `phases` | Required after backfill for workflow phases |
| `artifacts` | Required after backfill |
| `phase_runs` | Required for workflow phase runs; null for `chat` runs |
| `workflow_events` | Required for run-scoped events |
| `decision_resolutions` | Optional in MVP; backfill with run |
| `validation_runs` | Optional in MVP; backfill with run |

### A.3 Backfill script

**New file:** `packages/db/scripts/backfill-workflow-runs.mjs` (or `.ts`)

Per task:

```txt
workflow_status = not_started AND no phases → skip
else → create workflow_run id; map status; attach all phases/artifacts/phase_runs/events
```

Run after migration in dev via `packages/db/scripts/reset-dev-db.mjs` chain or one-off command.

### A.4 Shared types

**Files:** `apps/desktop/src/shared/api.ts`, new `apps/desktop/src/shared/workflow-run.ts`

```ts
export type WorkflowRunStatus = 'active' | 'completed' | 'cancelled'

export interface WorkflowRunDto {
  id: string
  taskId: string
  status: WorkflowRunStatus
  workflowType: string
  title: string
  startedAt: string
  completedAt?: string
  cancelledAt?: string
  currentPhaseId?: string
}
```

Extend `TaskDto`:

```ts
activeWorkflowRun?: WorkflowRunDto
pastWorkflowRuns?: WorkflowRunDto[]
```

### A.5 DB accessors

**New / edit:** `packages/db/src/workflow-runs.ts` (or extend `tasks.ts`)

- `insertWorkflowRun`, `getActiveWorkflowRunForTask`, `listWorkflowRunsForTask`
- `completeWorkflowRun`, `cancelWorkflowRun`
- Update list/get queries to filter phases/artifacts by `workflow_run_id` when loading task detail

---

## Phase B — Backend lifecycle

### B.1 Enable → create run

**File:** `apps/desktop/src/main/features/workflow/start-workflow.ts`

| Function | New behavior |
|----------|--------------|
| `bootstrapWorkflowTicket` / `enableWorkflow` | Insert `workflow_runs` (`active`); attach new ticket artifact to run id; sync `tasks.workflow_status = active` |
| Guard | Reject if active run exists (unless explicit cancel-and-start flow) |

Remove any remaining “restart clears phases” logic — replaced by new run creation.

### B.2 Start phase — run-scoped

**Files:** `ensureWorkflowState` in `tasks.ts`, `start-workflow.ts` `startPhase`, `background-phase-runner.ts`

- `ensureWorkflowState` creates phases for **active run id**, not task alone.
- `schedulePhaseRun` passes `workflowRunId` into phase run insert.

### B.3 Complete → past

**File:** `apps/desktop/src/main/features/workflow/approve-phase.ts`

On final phase approve:

1. Set run `status = completed`, `completed_at = now`.
2. Sync `tasks.workflow_status = completed`.
3. Emit `workflow:completed` with `workflowRunId` in payload.
4. Trigger completion summary generation (Phase D).

Task remains browsable; no active run until follow-up/enable.

### B.4 Cancel → past

**File:** `start-workflow.ts` `cancelWorkflow`

1. Set active run `status = cancelled`, `cancelled_at = now`.
2. Abort locked harness (existing behavior).
3. Mark in-flight phase as `failed` or leave `running` → `failed` (pick one; document in code).
4. Sync `tasks.workflow_status = cancelled`.
5. Do **not** delete phases/artifacts.

### B.5 Discard draft

**New function:** `discardWorkflowDraft(taskId)`

- Allowed when active run exists and `!hasStartedPhase(run)`.
- Delete run row + ticket artifact; reset task to `not_started`.
- Wire to panel when ticket-only.

### B.6 Active-run conflict prompt

**New IPC:** `startWorkflowWithConflictResolution({ taskId, action: 'continue' | 'cancel_and_start', ...input })`

Or split: client calls `cancelWorkflow` then `enableWorkflow` sequentially after confirmation.

### B.7 Task detail assembly

**File:** `apps/desktop/src/main/services/tasks.ts` `getTaskDetail`

- Load `activeWorkflowRun`, `pastWorkflowRuns`.
- Filter `phases`, `artifacts` for active run in main task view; past run detail via separate query or `getWorkflowRunDetail(runId)`.

**New IPC (optional):** `getWorkflowRun({ taskId, runId })` for Past run drill-in.

### B.8 Workflow events

**File:** `apps/desktop/src/main/services/workflow-events.ts`, `packages/protocol/src/workflow-events.ts`

- Include `workflowRunId` on event payloads.
- New event types: `workflow:follow_up_started`, `workflow:discarded`.

### B.9 Sync task cache helper

**New:** `syncTaskWorkflowStatusFromRuns(taskId)` — called after any run mutation.

---

## Phase C — Workflow panel Current / Past UI

### C.1 Panel structure

**File:** `apps/desktop/src/renderer/src/features/workbench/WorkflowPanel.tsx`

```txt
not_started, no past     → Enable workflow CTA
not_started, has past    → Past list + Enable / Follow-up
active                   → Current workflow (phase tree, actions) + collapsed Past
no active, has past      → Past primary + Enable workflow
```

**New components (suggested):**

- `CurrentWorkflowSection.tsx`
- `PastWorkflowsList.tsx`
- `PastWorkflowRow.tsx` — title, status badge, date, [View summary]

### C.2 Terminal run drill-in

**New file:** `apps/desktop/src/renderer/src/features/workbench/PastWorkflowDetail.tsx`

- Read-only phase timeline for selected past run.
- Completed → open completion summary artifact in content view.
- Cancelled → banner: “Partial attempt — outputs are not authoritative.”

### C.3 Actions by state

| State | Actions |
|-------|---------|
| Active, ticket-only | Discard draft, Start first phase, Cancel |
| Active, in progress | Phase controls, Cancel workflow |
| Completed (past) | View summary, Start follow-up workflow |
| Cancelled (past) | View attempt, Start follow-up workflow |
| No active | Enable workflow |

Remove inline “Start new workflow” that reuses current task phases without new run.

### C.4 Content view routing

**Files:** `TaskWorkbench.tsx`, `ContentViewPanel.tsx`, `workbench-content.ts`

- Selecting past run summary sets content view to that run’s completion artifact.
- Active run behavior unchanged from ADR 002 MVP.

### C.5 Subtitle and sidebar

**File:** `apps/desktop/src/shared/workflow-status.ts`

- Accept optional `activeWorkflowRun`; derive subtitle from active run + its phases.
- When no active run: `Chat` or “Last workflow complete/cancelled” (optional).

**File:** `ProjectTreeSidebar.tsx` — use active run if present.

### C.6 Conflict dialog

**New:** `ActiveWorkflowConflictDialog.tsx`

- Shown when Enable/Follow-up clicked while active run exists.
- Continue | Cancel current and start new.

---

## Phase D — Completion summary artifact

### D.1 Generator

**New file:** `apps/desktop/src/main/features/workflow/generate-completion-summary.ts`

Invoked from `approve-phase.ts` on final approve:

- Gather approved artifacts, `phase_runs` files changed, decision resolutions, validation runs.
- Write markdown artifact `08-completion-summary.md` (or template-defined path) linked to run id.
- Title: “Completion summary”.

### D.2 Template hook

**File:** `packages/workflow/src/workflow-definitions.ts`

- Add optional `completionArtifactPhase` / filename to workflow definitions.

### D.3 UI

- Past completed row → **View summary** opens artifact in content view.
- Stream card on `workflow:completed` → [View summary] [Start follow-up] (Phase E).

---

## Phase E — Follow-up workflow seeding and stream cards

### E.1 Follow-up entry point

**New function:** `startFollowUpWorkflow(taskId, input?)`

**File:** `start-workflow.ts` or `start-follow-up-workflow.ts`

1. Require no active run (or use conflict flow).
2. Load most recent terminal run + completion summary + last N chat messages.
3. Call `synthesizeTaskBrief` (existing) with prior context.
4. Create new `workflow_runs` (`active`); new ticket artifact; **do not** copy old phase rows.
5. Emit `workflow:follow_up_started` with `{ priorRunId, newRunId }`.

### E.2 Stream cards

**Files:** `StreamItemRenderer.tsx`, `StreamItemViews.tsx`, `ConversionSuggestionCard.tsx`

| Event | Card |
|-------|------|
| `workflow:completed` | Workflow complete — [View summary] [Start follow-up] |
| `workflow:cancelled` | _(suppressed — panel-only; browse Past workflows)_ |
| Chat intent after terminal run | Structured follow-up? — [Start follow-up] [Just discuss] |
| `workflow:follow_up_started` | Follow-up workflow started — [Open overview] |

Post-complete chat classifier reuses ADR 002 “no mutation” rule — suggestion only.

### E.3 Panel copy

- Replace “Start new workflow” with **Start follow-up workflow** when past runs exist.
- **Enable workflow** when `not_started` and no history.

---

## Suggested PR sequence

| PR | Scope | Risk |
|----|--------|------|
| **PR1** | ADR 003 + Phase A schema, backfill, types, DB accessors | Medium — migration |
| **PR2** | Phase B backend lifecycle (enable/complete/cancel/discard, task detail) | Medium — core paths |
| **PR3** | Phase C Workflow panel Current/Past + conflict dialog | Medium — UI |
| **PR4** | Phase D completion summary generation | Low |
| **PR5** | Phase E follow-up seeding + stream cards | Medium |

Each PR should leave the app runnable; PR1 may ship with feature flag or read-only Past list until PR2 completes.

---

## Files likely touched

### New

- `docs/adr/003-workflow-runs-and-history.md`
- `docs/plans/workflow-runs-implementation.md`
- `packages/db/src/workflow-runs.ts`
- `packages/db/scripts/backfill-workflow-runs.mjs`
- `apps/desktop/src/shared/workflow-run.ts`
- `apps/desktop/src/main/features/workflow/generate-completion-summary.ts`
- `apps/desktop/src/main/features/workflow/start-follow-up-workflow.ts`
- `apps/desktop/src/main/features/workflow/discard-workflow-draft.ts`
- `apps/desktop/src/renderer/src/features/workbench/CurrentWorkflowSection.tsx`
- `apps/desktop/src/renderer/src/features/workbench/PastWorkflowsList.tsx`
- `apps/desktop/src/renderer/src/features/workbench/PastWorkflowDetail.tsx`
- `apps/desktop/src/renderer/src/features/workbench/ActiveWorkflowConflictDialog.tsx`
- `apps/desktop/src/renderer/src/features/stream/hooks/useStartFollowUpWorkflow.ts`
- `apps/desktop/src/renderer/src/features/stream/hooks/useDiscardWorkflowDraft.ts`

### Schema and migration

- `packages/db/src/schema.ts`
- `packages/db/migrations/*`
- `packages/db/src/migrate.ts`

### Heavy edit

- `apps/desktop/src/main/features/workflow/start-workflow.ts`
- `apps/desktop/src/main/features/workflow/approve-phase.ts`
- `apps/desktop/src/main/services/tasks.ts`
- `apps/desktop/src/main/features/workflow/background-phase-runner.ts`
- `apps/desktop/src/main/features/workflow/run-phase.ts`
- `apps/desktop/src/main/ipc/handlers.ts`
- `apps/desktop/src/preload/index.ts`
- `apps/desktop/src/shared/api.ts`
- `apps/desktop/src/renderer/src/ipc/client.ts`
- `apps/desktop/src/renderer/src/features/workbench/WorkflowPanel.tsx`
- `apps/desktop/src/renderer/src/features/workbench/TaskRightSidebar.tsx`
- `apps/desktop/src/renderer/src/features/workbench/TaskWorkbench.tsx`
- `apps/desktop/src/renderer/src/features/workbench/ContentViewPanel.tsx`
- `apps/desktop/src/shared/workflow-status.ts`
- `packages/protocol/src/workflow-events.ts`
- `packages/workflow/src/workflow-definitions.ts`

### Tests

- `apps/desktop/src/shared/workflow-status.test.ts` — extend for run-aware inputs
- New `packages/db/src/workflow-runs.test.ts` or integration tests for backfill
- New tests for `syncTaskWorkflowStatusFromRuns`, discard guard, one-active invariant

---

## Test plan

### Manual

1. **Fresh task** → Enable workflow → creates active run; panel shows Current only.
2. **Ticket-only** → Discard draft → `not_started`; no past entry (or no run row).
3. **Start phase** → phases scoped to run id; complete all → run moves to Past; task shows no Current.
4. **Completed run** → View summary opens completion artifact; chat does not change past phase statuses.
5. **Follow-up** → new run id; new ticket; old run unchanged in Past.
6. **Cancel mid-run** → run in Past as cancelled; partial phases visible; banner non-authoritative.
7. **Active conflict** → Enable while active → prompt; cancel-and-start creates new run, old cancelled.
8. **Chat after complete** → suggestion card only; no phase mutation without explicit follow-up.
9. **Backfill** → existing dev DB tasks get single synthetic run; UI matches prior behavior until second run created.

### Automated

- [ ] Unit: `canDiscardWorkflowDraft(run, phases)` — true only when ticket-only
- [ ] Unit: `syncTaskWorkflowStatusFromRuns` mapping table (§ ADR 003.8)
- [ ] Unit: one-active-run enforcement rejects second active insert
- [ ] Integration: `enableWorkflow` inserts `workflow_runs` row
- [ ] Integration: final `approvePhase` sets run completed + creates summary artifact
- [ ] Integration: `cancelWorkflow` sets run cancelled, preserves artifacts
- [ ] Integration: `startFollowUpWorkflow` creates new run, links new ticket, leaves prior run terminal
- [ ] Backfill script test on fixture DB snapshot

---

## Out of scope (this plan)

- Reopen / resume terminal runs
- Archive or hide past runs
- `tasks.workflow_status` column drop
- `interaction_mode` column drop (still ADR 002 follow-up)
- Per-run disk directory layout (`.Circuit/.../runs/<id>/`)
- Worktree/branch cleanup on cancel during build
- Rich cancel confirmation dialog (branches, uncommitted changes)
- Pause workflow status

---

## Open questions (non-blocking)

- Should Past runs show in content view sidebar or only in Workflow panel? (Default: Workflow panel list + content view on select.)
- Cancellation note artifact for cancelled runs — same template as completion or skip for MVP? (Default: skip; phase tree only.)
- Which past run seeds follow-up when multiple exist? (Default: most recent terminal run.)

---

## References

- [ADR 003](../adr/003-workflow-runs-and-history.md)
- [ADR 002](../adr/002-attached-workflow-chat-always.md)
- [Attached workflow implementation](./attached-workflow-implementation.md) — format reference
- `packages/db/src/schema.ts` — current schema
- `apps/desktop/src/shared/workflow-status.ts` — subtitle derivation

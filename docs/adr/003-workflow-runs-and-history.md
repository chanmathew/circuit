# ADR 003: Workflow runs and history

**Status:** Accepted  
**Date:** 2026-06-21  
**Supersedes:** [ADR 001](./001-task-session-and-workflow-modes.md) § follow-up (`WorkflowRun` entity).  
**Amends:** [ADR 002](./002-attached-workflow-chat-always.md) §2 (attached object), §3 (workflow status), §5 (Workflow panel), §9 (deferred), glossary, and consequences — **does not** supersede ADR 002 chat-always model, layout shell, harness session policy, or explicit-action rules.

## Context

ADR 002 established **chat always** and a single **attached workflow** per task, with lifecycle stored on `tasks.workflow_status` (`not_started | active | completed | cancelled`). That model shipped MVP cleanly but cannot represent product requirements now that restart logic and the dead `createTask` path have been removed:

1. **No history.** Completing or cancelling overwrites task-level workflow state. Past runs are indistinguishable from the current attachment; users cannot browse multiple attempts on one task.
2. **Restart conflates with follow-up.** “Start new workflow” after complete effectively mutates the same phase/artifact rows. Chat after complete risks silently changing a run users treat as authoritative.
3. **Terminal semantics are flattened.** `completed` and `cancelled` both leave artifacts on disk (ADR 002) but carry the same UX weight — no distinction between authoritative outputs vs historical/partial outputs.
4. **Child rows are task-scoped only.** `phases`, `artifacts`, and `phase_runs` reference `task_id`. A second workflow attempt requires either destructive reset or ambiguous shared rows.

Design review converged on a **WorkflowRun** entity: at most one **active** run per task, unbounded **past** runs (completed + cancelled), and **follow-up workflows** instead of restart.

> **Chat remains always-on and task-scoped.** Workflow runs are structured attachments with their own phase/artifact lineage; they do not replace the task chat stream.

## Decision

### 1. WorkflowRun is the unit of structured work

Introduce `workflow_runs` as the source of truth for structured workflow attempts. Phases, artifacts, phase runs, and workflow-scoped events attach to `workflow_run_id` (retain `task_id` for query convenience where useful).

```ts
type WorkflowRunStatus = 'active' | 'completed' | 'cancelled'

type WorkflowRun = {
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

| Field | Meaning |
|-------|---------|
| `status: active` | Current workflow for the task; may advance phases |
| `status: completed` | Structured process reached a useful end; outputs **authoritative** |
| `status: cancelled` | Intentionally stopped; outputs **historical/partial, non-authoritative** |
| `title` | User-visible label (defaults from ticket/title; editable later) |
| `currentPhaseId` | FK to `phases.id` within this run |

**Task-level fields (retained, narrowed role):**

| Field | New role |
|-------|----------|
| `tasks.workflow_status` | **Derived cache** for fast UI: `not_started` when no active run; mirrors active run terminal transition; may be removed later |
| `tasks.workflow_type` | Default for next enable/follow-up; active run’s type wins while run is active |
| `tasks.current_phase` | **Derived cache** from active run’s current phase name |

Chat harness session (`phase_runs` where `phase = 'chat'`) stays **task-scoped**, not run-scoped — one persistent chat per task across all runs.

### 2. Terminal states behave differently

Neither terminal state deletes chat, artifacts, logs, diffs, or history.

| Terminal | Meaning | Output authority | User affordances |
|----------|---------|------------------|------------------|
| **Completed** | All required phases approved (or template-defined success) | Artifacts and completion summary are **authoritative** for “what shipped” | View summary, browse phases, chat freely, start **follow-up workflow** |
| **Cancelled** | User stopped advancement before success | Partial artifacts are **historical context only** | View what was attempted, chat freely, start **follow-up workflow** |

**No restart of completed workflows.** A completed run moves to **Past workflows** permanently (for MVP). Users do not get “Resume” or “Restart this run.”

**No silent mutation after complete.** Chat messages after completion must not update completed run phases/artifacts. If chat implies structured work, offer an explicit **follow-up workflow** card — same contract as ADR 002 explicit actions.

### 3. Discard draft vs cancel workflow

| Action | When | Effect |
|--------|------|--------|
| **Discard draft** | Active run exists but **nothing generated yet** (ticket-only; no phase harness started) | Remove active run row; reset task to `not_started`; ticket artifact may be deleted |
| **Cancel workflow** | Any active run with started phases or generated artifacts | Stop advancement; abort locked harness run; mark run `cancelled`; preserve artifacts; partial phases remain as-is |

Cancel does **not** delete disk artifacts or chat. Discard is the lightweight exit before commitment.

### 4. Workflow panel structure

Replace flat “current status only” panel with run-aware sections:

```txt
Workflow
├── Current workflow (at most one active run per task)
│   └── phase tree, Start/Approve/Cancel, ticket
└── Past workflows (completed + cancelled runs, newest first)
    └── run title, status badge, dates, [View summary]
```

When `not_started`: show **Enable workflow** CTA only (no Past section unless history exists from prior data).

When active: **Current workflow** expanded; Past collapsed list below.

When no active run but past runs exist: Past section primary; **Enable workflow** or **Start follow-up** at top.

### 5. One active workflow per task

Invariant: **at most one** `workflow_runs.status = 'active'` per `task_id`.

If user starts a new workflow while one is active:

```txt
Prompt: Continue current workflow | Cancel current and start new
```

Default safe path: **Continue**. Cancel-and-start-new runs cancel flow (§3) then creates a fresh active run.

**Enable workflow** (from `not_started` or after all runs terminal): creates new active run.

**Follow-up workflow** (after completed/cancelled): creates new active run seeded from prior context (§7) — not a restart of the old run id.

### 6. Completion produces a handoff artifact

On transition to `completed`, generate a **completion summary** artifact for that run, e.g. `08-completion-summary.md`, containing:

- What changed (summary narrative)
- Files touched / key diffs reference
- Decisions taken
- Checks run (if any)
- Suggested follow-ups

This artifact is the primary “View summary” target for past completed runs. Cancelled runs may omit it or generate a lighter **cancellation note** (deferred polish).

### 7. Follow-up workflow (not restart)

**Follow-up workflow** starts a **new** `workflow_runs` row with:

- New run id and fresh phase rows
- Ticket/description seeded from: completion summary, last chat context, and/or user-provided brief
- Explicit user confirmation (panel button or stream card)

It does **not** reopen or reset the prior run’s phase rows. Prior run remains in Past workflows unchanged.

Rename user-facing copy: ~~Start new workflow~~ → **Start follow-up workflow** when a completed/cancelled run exists; **Enable workflow** when none ever started.

### 8. Task-level workflow_status mapping (transitional)

Until `tasks.workflow_status` is dropped, keep it in sync:

| Condition | `tasks.workflow_status` |
|-----------|-------------------------|
| No runs, or only discarded | `not_started` |
| Active run exists | `active` |
| No active run; latest terminal is completed | `completed` |
| No active run; latest terminal is cancelled (and no newer active) | `cancelled` |

UI should prefer querying `workflow_runs` for panel/history; subtitle helpers may use task cache during migration.

### 9. MVP deferrals

| Deferred | MVP behavior |
|----------|--------------|
| Reopen completed workflow | Not available |
| Resume cancelled workflow | Not available |
| Archive / hide old runs | All past runs visible |
| Full cancel-while-running dialog | Default: stop harness + cancel run |
| Worktree cleanup after cancel during build | Best-effort abort only; no branch/worktree GC flow |
| Editable run titles | Default from ticket/task title |
| `tasks.workflow_status` column removal | Follow-up migration after code paths use runs |

### 10. Unchanged from ADR 002

- Chat is not a mode; composer always sends chat harness path.
- Workbench four-column shell; Workflow panel in inspector.
- Phase status machine (`PhaseStatus`) remains authoritative for in-run detail.
- Enable creates ticket only; phases/artifacts on **Start phase** (first start for that phase).
- Workflow mutations via panel actions or confirmed stream cards only.

## Amends ADR 002 (section-by-section)

| ADR 002 section | Change |
|-----------------|--------|
| **§2 Attached object** | Attachment is a **WorkflowRun** row, not implicit task fields. “Start new workflow” → **follow-up workflow** (new run). Add **Discard draft**. |
| **§3 Workflow status** | Four task-level values remain as **cache/derivation**; canonical status lives on `workflow_runs.status` (`active \| completed \| cancelled`). `not_started` = no active run. |
| **§5 Workbench / Workflow panel** | Panel split into **Current** + **Past workflows**; terminal runs are browsable history, not inline “start new” that reuses rows. |
| **§9 Deferred** | Remove `WorkflowRun` table from deferred — **implemented by this ADR**. Keep archive, pause, composer template picker deferred. |
| **Glossary** | Add WorkflowRun, Current/Past workflow, Follow-up workflow, Discard draft, Completion summary. Refine Completed/Cancelled authority semantics. |
| **Consequences** | Adds migration complexity; enables history and safe post-complete chat. |

## Glossary

| Term | Meaning |
|------|---------|
| **WorkflowRun** | One structured workflow attempt on a task — phases, artifacts, and harness phase runs scoped to this id |
| **Current workflow** | The single active (`status = active`) WorkflowRun for a task, if any |
| **Past workflows** | Completed and cancelled WorkflowRuns for a task — read-only history |
| **Follow-up workflow** | New WorkflowRun after a terminal run; seeded from prior context; does not mutate the prior run |
| **Discard draft** | Remove ticket-only active run before any phase harness has started |
| **Cancel workflow** | Terminal stop of active run; preserve partial artifacts; non-authoritative |
| **Completion summary** | Handoff artifact (e.g. `08-completion-summary.md`) generated when a run completes |
| **Chat** | Always-on, task-scoped freeform conversation — unchanged from ADR 002 |
| **Enable workflow** | Create first WorkflowRun on a task with no active run (from `not_started`) |
| **Plan** | QRSPI phase name only |
| **Circuit** | Product brand |

## Consequences

**Positive**

- Multiple workflow attempts per task without destructive reset.
- Clear authority: completed outputs vs cancelled partials.
- Post-complete chat cannot silently corrupt authoritative runs.
- Workflow panel matches mental model: one current, many past.
- Aligns with removed restart path — follow-up is explicit and auditable.

**Negative / migration**

- Schema migration: new table + FK columns on phases, artifacts, phase_runs, workflow_events.
- Backfill: one synthetic run per task that ever had `workflow_status != not_started`.
- Task DTO and IPC must expose run list + active run id.
- `formatWorkflowSubtitle` and panel logic move to run-aware queries.
- Disk paths may stay task-scoped initially; run id in DB is source of truth for association.

**Risk**

- Dual-write period (task.workflow_status + workflow_runs) requires discipline until cache is removed.
- Follow-up seeding quality depends on completion summary + chat synthesis (Phase E in implementation plan).

## Migration notes (from current schema)

Current state (`packages/db/src/schema.ts`):

- `tasks.workflow_status`, `tasks.workflow_type`, `tasks.current_phase` — workflow lifecycle on task row.
- `phases`, `artifacts`, `phase_runs`, `workflow_events`, `decision_resolutions`, `validation_runs` — all keyed by `task_id` only.

**Target:**

1. Add `workflow_runs` table (see §1).
2. Add nullable `workflow_run_id` to: `phases`, `artifacts`, `phase_runs`, `workflow_events` (and optionally `decision_resolutions`, `validation_runs`).
3. Backfill per task:
   - If `workflow_status = not_started'` and no phases → no run.
   - Else create one `workflow_runs` row:
     - `status`: map `active`/`paused` → `active`; `completed` → `completed`; `cancelled`/`archived` → `cancelled`
     - `workflow_type`, `title` from task
     - `started_at` from task `created_at` or earliest phase_run
     - `completed_at` / `cancelled_at` from task `updated_at` when terminal
   - Set `workflow_run_id` on all child rows for that task.
4. Add partial unique index: one active run per task (`UNIQUE(task_id) WHERE status = 'active'` — SQLite expression index or app-level enforcement).
5. Update `enableWorkflow` → insert run + ticket; `cancelWorkflow` → update run row, clear active; `approvePhase` final → complete run + emit completion summary.
6. Keep `tasks.workflow_status` synced (§8) until follow-up migration drops it.

**Chat phase runs:** backfill to active run if one exists; if task has chat runs but no workflow, leave `workflow_run_id` null on chat runs.

**Artifact paths:** MVP keeps `.Circuit/tasks/<slug>/` layout; run identity is DB-only. Future: `.Circuit/tasks/<slug>/runs/<runId>/` if isolation needed.

## References

- [Implementation plan](../plans/workflow-runs-implementation.md)
- [ADR 002: Attached workflow, chat always](./002-attached-workflow-chat-always.md)
- [ADR 001: Task, harness session, and workflow modes](./001-task-session-and-workflow-modes.md)
- `packages/db/src/schema.ts`
- `apps/desktop/src/shared/workflow-status.ts`
- `apps/desktop/src/main/features/workflow/start-workflow.ts` — enable, cancel
- `apps/desktop/src/main/features/workflow/approve-phase.ts` — completion transition

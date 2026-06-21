# ADR 002: Attached workflow, chat always

**Status:** Accepted  
**Date:** 2026-06-20  
**Supersedes:** [ADR 001](./001-task-session-and-workflow-modes.md) §2 (interaction mode), §3 (mode transitions), §6 (layout), and glossary entries for Chat/Workflow *mode*.

## Context

ADR 001 modeled **Chat** and **Workflow** as a binary **interaction mode** toggled in the composer. Implementation proved this model wrong for users:

- Enabling workflow swapped the entire workbench layout (`chatOnly` ↔ tri-pane).
- The composer changed meaning on toggle (chat harness vs steering).
- Users could not tell whether a message steered the workflow.
- Pause/resume as “switch to Chat” added status complexity (`paused`, `running_background`) without clear product value.

Design review converged on a simpler model:

> **Chat is always freeform. Workflow is an optional attachment managed in the Workflow panel.**

## Decision

### 1. Chat is not a mode

Every task has a **persistent chat stream** and a **generic composer** (`Message the agent…`). All composer sends use the chat harness path unless the user confirms an explicit workflow action card.

Chat does **not** mutate workflow state by default.

```txt
Chat can discuss anything.
Workflow changes require explicit actions (panel buttons or confirmed cards).
```

### 2. Workflow is an attached object

A task may have zero or one **active workflow** (MVP). Workflow is enabled from the **Workflow panel** (right inspector), not from a composer toggle.

| User action | Effect |
|-------------|--------|
| **Enable workflow** | Attach workflow: ticket + template selection → `workflow_status = active` (pre-first-phase) |
| **Start {phase}** | Create phases/artifacts if needed; run harness for that phase |
| **Approve / Revise** | Existing phase gates |
| **Stop run** | Abort active phase harness run |
| **Cancel workflow** | `workflow_status = cancelled`; artifacts kept on disk |
| **Start new workflow** | After completed/cancelled; fresh scaffold |

There is **no** “Workflow mode” toggle and **no** “Switch to Chat” control.

### 3. Workflow status (four values)

Persist on `tasks.workflow_status`:

| Status | Meaning |
|--------|---------|
| `not_started` | No workflow attached |
| `active` | Workflow attached and in progress (includes pre-first-phase) |
| `completed` | Terminal success |
| `cancelled` | User cancelled / abandoned structured attempt |

**Not persisted at workflow level:** `running`, `waiting`, `paused`, `draft`, `archived`. Derive from `phases.status`, `phase_runs`, and `tasks.current_phase`.

**Migration from ADR 001 values:**

| Old | New |
|-----|-----|
| `none` | `not_started` |
| `draft`, `active`, `paused` | `active` |
| `completed` | `completed` |
| `archived` | `cancelled` |

### 4. Phase status carries detail

Use existing `PhaseStatus` in `@circuit/workflow` (`locked`, `ready`, `running`, `needs_review`, `approved`, `needs_revision`, `stale`, `failed`, `skipped`). Do not duplicate at workflow level.

Sidebar/header copy is derived:

```txt
active + phase running      → "Research running"
active + phase needs_review → "Design · ready for review"
active + no phase started   → "Workflow active · ready to start"
completed                   → "Workflow complete"
cancelled                   → "Workflow cancelled"
not_started                 → "Chat" (or task title only)
```

### 5. Workbench layout (stable shell)

Always use the four-column workbench:

```txt
Projects | Chat (agent stream) | Content view | Inspector (Workflow | Files | Changes)
```

- **Never** swap to stream-only `chatOnly` layout.
- **Phase rail** in header appears only after the first phase has been started (not at Enable).
- **Workflow panel** (renamed from Artifacts tab) is the primary control surface for workflow; default tab when `workflow_status = active`.
- **Content view** shows Workflow Overview until an artifact has meaningful content; then opens selected artifact/diff.

### 6. Bootstrap: no empty artifact scaffold

**Enable workflow** creates ticket + workflow metadata only. Phases and artifact files are created on **Start first phase** (or first Start for that phase), not on Enable. The Workflow panel may show planned steps from the template definition while phases are `not_started`.

### 7. `interaction_mode` column

Stop using `interaction_mode` in product logic. Composer is always chat. Column may remain in DB temporarily; remove in a follow-up migration once code paths are clean.

Set `interaction_mode = 'chat'` for all new/updated rows until column is dropped.

### 8. Harness session policy (unchanged from ADR 001)

| Activity | Session |
|----------|---------|
| Task chat | Persistent harness session per task (`phase_runs` phase `chat`) |
| Phase run | Fresh harness session per phase run |

Phase runs may continue while the user chats; chat does not auto-advance or auto-approve workflows.

### 9. Deferred

- `WorkflowRun` table (multiple attempts per task)
- `archive` as distinct from `cancelled`
- `paused` workflow status
- Workflow template picker in composer
- NLP auto-run from chat (“start research” without confirmation)

## Glossary

| Term | Meaning |
|------|---------|
| **Chat** | Always-on freeform conversation on a task — not a toggle |
| **Workflow** | Optional structured process attached to a task |
| **Enable workflow** | Attach workflow; user-facing, replaces “start workflow mode” |
| **Plan** | QRSPI phase name only |
| **Circuit** | Product brand |

## Consequences

**Positive**

- One composer contract; no mode confusion.
- Stable layout; progressive disclosure via Workflow panel and content view.
- Minimal workflow status enum; phase machine stays authoritative.

**Negative / migration**

- Retire composer Workflow toggle, `pauseWorkflow` / `resumeWorkflow` as primary UX, `chatOnly`, and `recordSteering` on default send.
- ADR 001 interaction-mode sections are historical; this ADR governs product behavior.

## References

- [Implementation plan](../plans/attached-workflow-implementation.md)
- `docs/circuit-brief.md`
- `packages/workflow/src/types.ts` — `PhaseStatus`
- `apps/desktop/src/shared/interaction-mode.ts` — subtitle helpers (to be refactored)

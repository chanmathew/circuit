# ADR 001: Task, harness session, and workflow modes

**Status:** Accepted (partially superseded)  
**Date:** 2026-06-20 (updated)

> **Superseded by [ADR 002](./002-attached-workflow-chat-always.md)** for interaction mode, mode transitions, workbench layout, and workflow lifecycle. Sections 1, 5, and harness session policy in ADR 002 remain aligned with this document.

## Context

Circuit coordinates coding agents across phased workflows. Harnesses (OpenCode first, Codex/others later) own execution: models, tools, permissions, and raw chat sessions. Users want:

- Composer-first intake (fast create, title later, no blocking IPC on harness runs)
- Permission handling inside Circuit, not only in the harness UI
- **Chat** for exploratory conversation and **Workflow** for structured phased work on the same task

We must avoid duplicating harness chat in Circuit while keeping workflow state durable and adapter-agnostic.

## Decision

### 1. Circuit owns tasks; harnesses own sessions

| Concern | Source of truth |
|--------|------------------|
| Task list, title, repo, branch, workflow type, phase status | **Circuit** (`tasks`, `phases`, artifacts under `.Circuit/tasks/<slug>/`) |
| Raw messages, tools, permissions, model | **Harness** (via adapter) |
| Link between them | **`phase_runs.session_id`** (and optional `context_pack_hash`) |

Circuit does **not** import harness session lists as tasks. Adapters translate harness events → `@circuit/protocol` events; the agent stream is a **projection**, not a parallel chat database.

### 2. Two axes: interaction mode vs workflow template

**Interaction mode** (composer behaviour):

| Mode | User label | Internal | Session policy | Composer send |
|------|------------|----------|----------------|---------------|
| Chat | Chat | `'chat'` | Persistent harness session per chat context | `sendChatMessage` → `runChatTurn` |
| Workflow | Workflow | `'workflow'` | Fresh harness session per phase run | `recordSteering` + action bar |

**Workflow template** (`workflow_type`): Investigation, Structured Change, Quick Fix, etc. — chosen when starting a workflow, not at the mode toggle.

**Workflow lifecycle** (`workflow_status`): `none` | `active` | `paused` | `completed` | `archived`

Paused state: `interaction_mode = chat` + `workflow_status = paused` — user chats freely; workflow phases and artifacts are preserved.

Legacy `workflow_type = 'freeform'` means no template yet (pre-workflow chat). Retired in UI copy; use **Chat** instead.

### 3. Mode transitions

| Action | Function | Behaviour |
|--------|----------|-----------|
| Chat → Workflow (bootstrap) | `startWorkflow` | Ticket, phases, artifacts; optional first phase run |
| Workflow → Chat (pause) | `pauseWorkflow` | Switch to Chat; workflow paused, not destroyed |
| Chat → Workflow (resume) | `resumeWorkflow` | Restore Workflow mode; optional chat-delta strategies |
| Mid-chat conversion | `startWorkflow` + brief synthesis | Aggregate steering events into ticket |

Toggle-out of Workflow mode **pauses** — never deletes workflow state.

### 4. Task creation is async and composer-first

1. `createDraftTask` persists task shell only (`draft`); **no** harness run in IPC.
2. UI navigates immediately to workbench with composer focused.
3. First message selects **Chat** (persistent chat) or **Workflow** (`startWorkflow`).
4. Title inferred from intake text.

### 5. Permissions are adapter-owned, Circuit-mediated

All adapters that emit permission requests must surface them through a common adapter API (`replyPermission`). Circuit renders action cards in the stream and replies on the user's behalf.

### 6. Workbench layout

Derive `chatOnly` from `interaction_mode === 'chat'` (includes intake and paused chat), not from `workflow_type === 'freeform'` alone.

## Glossary

| Term | Meaning |
|------|---------|
| **Circuit** | Product brand (app name, marketing) — not the mode toggle |
| **Chat mode** | Freeform explore/discuss (`interaction_mode = chat`) |
| **Workflow mode** | Structured rails active (`interaction_mode = workflow`) |
| **Workflow** (noun) | Attached structured run — phases, artifacts, gates |
| **Plan** | QRSPI **phase name only** — not an interaction mode |

## Consequences

**Positive**

- Same adapter and stream architecture serves Chat and Workflow on one task.
- Pause/resume without losing phase progress.
- Chat-first entry aligns with harness UX while preserving structured workflows.

**Follow-up**

- Full `WorkflowRun` entity when multiple runs per task are needed.
- Build-phase pause warnings and follow-up task flows.
- Retire `freeform` workflow type in DB migrations.

## References

- `docs/circuit-brief.md` — division of responsibility (OpenCode vs Circuit)
- `apps/desktop/src/shared/interaction-mode.ts` — lifecycle subtitle helpers
- `packages/workflow/src/workflow-definitions.ts` — workflow templates
- `packages/agent-adapters/src/capabilities.ts` — harness capability flags

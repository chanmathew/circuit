# ADR 001: Task, harness session, and workflow modes

**Status:** Accepted  
**Date:** 2026-06-20

## Context

Circuit coordinates coding agents across phased workflows. Harnesses (OpenCode first, Codex/others later) own execution: models, tools, permissions, and raw chat sessions. Users want:

- Composer-first intake (fast create, title later, no blocking IPC on harness runs)
- Permission handling inside Circuit, not only in the harness UI
- Optional **free-form chat** alongside **structured phased tasks**

We must avoid duplicating harness chat in Circuit while keeping workflow state durable and adapter-agnostic.

## Decision

### 1. Circuit owns tasks; harnesses own sessions

| Concern | Source of truth |
|--------|------------------|
| Task list, title, repo, branch, workflow type, phase status | **Circuit** (`tasks`, `phases`, artifacts under `.Circuit/tasks/<slug>/`) |
| Raw messages, tools, permissions, model | **Harness** (via adapter) |
| Link between them | **`phase_runs.session_id`** (and optional `context_pack_hash`) |

Circuit does **not** import harness session lists as tasks. Adapters translate harness events → `@circuit/protocol` events; the agent stream is a **projection**, not a parallel chat database.

### 2. Session policy is per workflow mode, not global

| Workflow mode | Session policy | Composer role |
|---------------|----------------|---------------|
| `structured_change`, `quick_fix`, `investigation` | **Fresh harness session per phase run**; context pack in first prompt | Steering → `workflow_events`; optional forward to active run when `midRunMessaging` |
| `freeform` | **One persistent harness session per task** (or explicit “new thread”) | Primary chat → harness `runChatTurn`; minimal phase rail |
| `pr_review` (future) | TBD; likely one session per review pass | Review-oriented prompts |

Structured modes optimize for bounded context and approvals. Freeform optimizes for exploratory chat while still binding work to a repo and Circuit task shell.

### 3. Task creation is async and composer-first

1. `createTask` persists task + ticket artifact only (`draft`); **no** `await runPhase` in IPC.
2. UI navigates immediately to workbench with composer focused.
3. First user message (or explicit Run) starts harness work in the background.
4. Title may be inferred async from intake text.

This matches harness UX (+ → chat → title) without making the harness the task registry.

### 4. Permissions are adapter-owned, Circuit-mediated

All adapters that emit permission requests must surface them through a common adapter API (`replyPermission`). Circuit renders action cards in the stream and replies on the user’s behalf. No requirement to switch to the harness UI.

### 5. Workflow type = mode

`WorkflowType` (`structured_change`, `quick_fix`, `investigation`, `freeform`, `pr_review`) selects:

- Phase definitions and artifact templates (`getWorkflowDefinition`)
- Session policy (fresh vs persistent)
- Workbench chrome (phase rail vs chat-only)
- Stream normalizer emphasis (action cards vs message tail)

`freeform` is **implemented** for composer-first chat with persistent OpenCode sessions (`runChatTurn`, `phase_runs.session_id`). `pr_review` remains typed but not wired. `structured_change` is the default governed workflow.

## Consequences

**Positive**

- Same adapter and stream architecture serves structured and freeform modes.
- Sandbox repos and git worktrees attach to Circuit tasks regardless of mode.
- Fresh-session discipline for governed phases; persistent sessions where chat is the product.

**Negative / follow-up**

- Freeform: persistent `session_id` via chat `phase_runs`; permission/question cards persisted in `workflow_events`; stop wired via `harness_session_active` + abort registry.
- Structured mode still needs: mid-run steering forward when `midRunMessaging` is enabled.
- “Promote freeform → structured” is a future product action (spawn phases from transcript), not in MVP.

## References

- `docs/circuit-brief.md` — division of responsibility (OpenCode vs Circuit)
- `packages/workflow/src/workflow-definitions.ts` — workflow types; `freeform` excluded from definitions
- `packages/agent-adapters/src/capabilities.ts` — harness capability flags

# ADR 005: Task mode switcher in composer

**Status:** Accepted  
**Date:** 2026-06-22  
**Extends:** [ADR 002](./002-attached-workflow-chat-always.md) §9 (deferred template picker)

## Context

Users expect coding-agent apps to expose a **mode** control in the chat input (Auto, Plan, Agent,
etc.). Circuit deferred a composer workflow picker in ADR 002 to avoid reintroducing the
Chat/Workflow interaction-mode toggle that confused users.

Design review aligned on a **task mode** switcher that sets workflow **intent** without changing
what Send does.

## Decision

### 1. Task mode is not interaction mode

| Term          | Meaning                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------ |
| **Task mode** | What kind of structured work the user intends (Auto, Quick Fix, Guided Build, Investigate) |
| **Chat**      | Always-on; not a mode option                                                               |
| **Workflow**  | Optional attachment; enabled explicitly from the Workflow panel                            |

Composer **Send always uses the chat harness** (ADR 002 unchanged).

### 2. Mode switcher in composer toolbar

Placement: compose page and workbench composer, beside repo and model pickers.

Options:

| Label        | Stored value        | Maps to workflow type                            |
| ------------ | ------------------- | ------------------------------------------------ |
| Auto         | `auto`              | Inferred via `autoSelectWorkflow` at enable time |
| Quick Fix    | `quick_fix`         | `quick_fix`                                      |
| Guided Build | `structured_change` | `structured_change` (renamed user-facing label)  |
| Investigate  | `investigation`     | `investigation`                                  |

Default: **Auto**.

Persist on `tasks.task_mode`.

### 3. Pre-configure panel; explicit attach

Selecting a mode **does not** enable workflow or run phases.

When `workflow_status = not_started`:

- **Workflow panel** shows a preview for the selected mode (or Auto → inferred type once a
  description exists).
- User clicks **Start workflow** to attach (ticket + run metadata only — ADR 002 bootstrap).

No suggestion cards on send — the switcher + panel preview are sufficient.

### 4. Lock mode while workflow is active

| `workflow_status`         | Switcher                            |
| ------------------------- | ----------------------------------- |
| `not_started`             | Editable                            |
| `active`                  | Locked to attached workflow type    |
| `completed` / `cancelled` | Editable (sets intent for next run) |

### 5. Rename Structured Change → Guided Build

User-facing label only. Internal ID remains `structured_change` until a migration is warranted.

## Glossary

| Term                | Meaning                                                                 |
| ------------------- | ----------------------------------------------------------------------- |
| **Task mode**       | Composer switcher value; workflow intent before/d between runs          |
| **Guided Build**    | User-facing name for the full structured workflow (`structured_change`) |
| **Enable workflow** | Unchanged — explicit attach from Workflow panel                         |

## Consequences

**Positive**

- Familiar “mode in composer” affordance without mode-toggle layout swaps.
- Panel reflects intent before attach; Auto shows inferred preview when possible.
- Clear separation: mode = intent, Send = chat, Start workflow = attach.

**Negative / migration**

- New `task_mode` column on `tasks`.
- ADR 002 §9 “template picker in composer” is superseded by this narrower mode switcher (intent
  only, not send-time workflow execution).

## References

- [Implementation plan](../plans/task-mode-switcher-implementation.md)
- [ADR 002](./002-attached-workflow-chat-always.md)
- `packages/workflow/src/task-mode.ts`

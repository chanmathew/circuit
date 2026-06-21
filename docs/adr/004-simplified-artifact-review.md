# ADR 004: Simplified artifact review

**Status:** Accepted  
**Date:** 2026-06-21  
**Amends:** [ADR 002](./002-attached-workflow-chat-always.md) §2 (Approve / Revise actions), §5 (Workflow panel), §6 (stream cards), and composer behavior during review gates.

## Context

ADR 002 established explicit workflow actions and a generic approval vocabulary (`Approve`, `Revise`, `Request changes`, `Review in panel`). In practice this spread the same decision across three surfaces — stream cards, content action bar, and workflow panel — with overlapping labels that did not describe the user's actual next step.

Design review converged on a simpler model:

> **Review artifacts in Content View. Advance the workflow with one contextual proceed action. Request changes through chat.**

## Decision

### 1. Remove generic approval actions from UI

Remove user-facing controls labeled:

- Approve
- Reject
- Revise
- Review in panel
- Request changes / Request revision (form)

These remain as internal phase transitions (`approvePhase`, `requestPhaseRevision`) but are not exposed as generic buttons.

### 2. Two user actions at artifact gates

When a phase artifact is ready (`needs_review`):

| Action | Effect |
|--------|--------|
| **View** | Open the phase artifact in Content View |
| **Contextual next-step CTA** | Accept phase output and advance workflow (`approvePhase`) |

The CTA label is derived from workflow definitions, e.g. `Proceed to Research`, `Complete workflow` on the terminal phase. Special case: plan phase → `Unlock implementation`.

**Primary CTA location:** Workflow panel → current phase area. Stream artifact-ready cards announce completion and offer shortcuts only.

### 3. Artifact-ready stream cards

Cards use phase-specific copy:

```txt
Implementation ready
06-implementation-log.md is ready. Review the output, then proceed when it looks good.
[View] [Proceed to Review]
Need changes? Tell the agent in chat.
```

When the artifact is already open in Content View, de-emphasize the View button (`Viewing`).

### 4. Chat during `needs_review`

Composer placeholder: `Ask a question or tell the agent what to change…`

| Message intent | Behavior |
|----------------|----------|
| Question (ends with `?`) | Normal chat harness turn |
| Feedback / change instruction | `requestPhaseRevision` + re-run current phase; stay on same phase |
| Stale upstream change | Confirmation card (deferred — see plan) |

MVP revision heuristic: any non-question message during `needs_review` triggers revision. Smarter intent classification is deferred.

### 5. Content panel scope

The content panel is read-only — artifacts, diffs, checks, and files for review. All workflow actions (Run phase, proceed, discard) live in the workflow panel; stream cards offer View + proceed shortcuts only.

## Consequences

- `getPhaseNextStepLabel(currentPhase, workflowType)` in `@circuit/workflow` is the single source for proceed CTA copy.
- Stream normalizer emits View + contextual proceed actions only for `phase:completed` cards.
- Chat revision routing lives in `sendChatMessage` when active phase is `needs_review`.
- Stale upstream confirmation cards and LLM intent classification remain future work.

## Related

- [ADR 002: Attached workflow, chat always](./002-attached-workflow-chat-always.md)
- [ADR 003: Workflow runs and history](./003-workflow-runs-and-history.md)
- [Implementation plan](../plans/simplified-artifact-review-implementation.md)

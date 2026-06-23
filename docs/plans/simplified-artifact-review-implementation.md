# Simplified artifact review — implementation plan

Companion to [ADR 004](../adr/004-simplified-artifact-review.md).

## Phase 1 — Core UX (MVP) ✅

**Goal:** Replace generic approval buttons with View + contextual proceed; move primary CTA to
workflow panel.

| Task                                                                       | Status |
| -------------------------------------------------------------------------- | ------ |
| `getPhaseNextStepLabel(currentPhase, workflowType)` in `@circuit/workflow` | Done   |
| Unit tests for next-step label helper                                      | Done   |
| Stream normalizer: artifact-ready cards → View + proceed only              | Done   |
| `ActionCardItem.footer` for chat revision hint                             | Done   |
| Stream card UI: horizontal buttons, de-emphasize View when open            | Done   |
| Workflow panel: primary proceed button on `needs_review`                   | Done   |
| Composer placeholder during `needs_review`                                 | Done   |
| Remove approve/revise from content action bar                              | Done   |
| Wire proceed CTA → `approvePhase` IPC                                      | Done   |

## Phase 2 — Chat-as-revision (MVP) ✅

**Goal:** Route feedback during review gates through revision + re-run.

| Task                                                           | Status |
| -------------------------------------------------------------- | ------ |
| `isRevisionFeedback(text)` heuristic (non-question → revision) | Done   |
| `sendChatMessage` routes revision when phase is `needs_review` | Done   |
| Auto `schedulePhaseRun` after chat revision                    | Done   |
| Record revision source as `chat` in workflow events            | Done   |

**Documented MVP behavior:** Any composer message that does not end with `?` during `needs_review`
triggers `requestPhaseRevision` and re-runs the phase. Questions continue through the normal chat
harness.

## Phase 3 — Deferred

| Task                                                          | Notes                                                                |
| ------------------------------------------------------------- | -------------------------------------------------------------------- |
| Stale upstream confirmation card                              | When chat feedback invalidates downstream approved phases; stub/TODO |
| Smart intent classifier                                       | Replace question-mark heuristic with keyword/LLM routing             |
| Change-keyword refinement                                     | Optional middle ground between `?` heuristic and full classifier     |
| Hide View entirely (not just de-emphasize) when artifact open | UX polish                                                            |
| Slice-level approve in structured panels                      | Prototype only; out of MVP scope                                     |

## Test plan

- [x] `getPhaseNextStepLabel` unit tests (`packages/workflow`)
- [x] `isRevisionFeedback` unit tests (`packages/workflow`)
- [x] Stream normalizer tests updated for new action card shape
- [ ] Manual: phase completes → card shows View + Proceed
- [ ] Manual: workflow panel proceed advances phase
- [ ] Manual: question during needs_review → chat answer
- [ ] Manual: feedback during needs_review → revision + re-run

## Files touched (MVP)

| Area             | Files                                                                       |
| ---------------- | --------------------------------------------------------------------------- |
| Workflow helpers | `packages/workflow/src/phase-next-step.ts`, `revision-feedback.ts`          |
| Protocol         | `packages/protocol/src/stream-items.ts`, `stream-normalizer.ts`             |
| Stream UI        | `StreamItemViews.tsx`, `CircuitAgentStream.tsx`, `useTaskStreamItems.ts`    |
| Workbench        | `CurrentWorkflowSection.tsx`, `WorkbenchActionBar.tsx`, `TaskWorkbench.tsx` |
| Main             | `send-chat-message.ts`, `request-revision.ts`                               |
| Docs             | `docs/adr/004-simplified-artifact-review.md`, this plan                     |

# Implementation plan: Attached workflow, chat always

**ADR:** [002-attached-workflow-chat-always.md](../adr/002-attached-workflow-chat-always.md)  
**Status:** Implemented (MVP)  
**Goal:** Replace interaction-mode toggle UX with stable chat + Workflow panel attachment model.

---

## Locked product rules

1. Composer always sends **chat** (`sendChatMessage`); placeholder always generic.
2. Workflow enabled only from **Workflow panel** (+ optional stream suggestion card).
3. **Enable workflow** → `workflow_status = active`, ticket only; **no** phases/artifact files until
   **Start phase**.
4. Workbench **always** tri-pane (+ projects); no `chatOnly` swap.
5. Workflow status: `not_started | active | completed | cancelled` only.
6. Workflow mutations via **panel actions** or **confirmed** stream cards — never implicit from chat
   send.
7. **Cancel workflow** replaces archive/pause-as-chat for MVP.

**Cancel semantics (deferred UI):** `workflow_status = cancelled`; abort active phase harness run if
locked; artifacts remain on disk; chat continues freely; phase rows stay until user starts a new
workflow (restart clears phases).

---

## Phase 1 — Schema & domain (backend)

### 1.1 Workflow status enum

**Files:** `packages/db/src/schema.ts`, new drizzle migration via `pnpm db:generate`

- Change default `workflow_status` from `none` to `not_started`.
- Data migration (backfill script, not hand-written SQL):

  ```txt
  none, draft, paused → not_started or active (see mapping in ADR 002)
  active → active
  completed → completed
  archived → cancelled
  ```

- Stop writing `interaction_mode` except fixed `'chat'`.

**Files:** `packages/db/src/backfill-interaction-mode.ts` → rename/refactor to
`backfill-workflow-status.ts`.

### 1.2 Shared types

**Files:** `apps/desktop/src/shared/workflow-status.ts` (new), refactor `interaction-mode.ts`

```ts
export type WorkflowStatus = 'not_started' | 'active' | 'completed' | 'cancelled'

export function formatWorkflowSubtitle(task: {
  workflowStatus: string
  workflowType: string
  currentPhase: string
  phases: Array<{ name: string; status: string }>
}): string
```

- Derive running/waiting from current phase status.
- Deprecate `InteractionMode`, `ComposerMode`, `taskUsesChatOnlyLayout`,
  `canShowComposerModeToggle`.

### 1.3 Enable workflow (replaces start-as-mode)

**File:** `apps/desktop/src/main/features/workflow/start-workflow.ts`

Rename/export clearly:

| Function                         | Behavior                                                                                                   |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `enableWorkflow(taskId, input)`  | Ticket + `workflow_type` + `workflow_status = active`; **no** `ensureWorkflowState`; **no** auto phase run |
| `startPhase(taskId, phaseName?)` | `ensureWorkflowState` if needed + `schedulePhaseRun`                                                       |
| `cancelWorkflow(taskId)`         | `workflow_status = cancelled`; stop run if locked; emit event                                              |

- Remove auto-run on enable (`autoRunFirstPhase` default false).
- Keep `synthesizeTaskBrief` for enable-from-chat-history path.
- `convertChatToWorkflow` → `enableWorkflowFromChat`.

### 1.4 Demote pause/resume

**Files:** `pause-workflow.ts`, `resume-workflow.ts`

- Remove from primary IPC/UI (or keep handlers as internal only until deleted).
- **Cancel workflow** is the user-facing exit ramp.

### 1.5 Composer path

**Files:** `send-chat-message.ts`, `run-chat-message.ts`

- Remove `interaction_mode !== 'chat'` guard (or always pass).
- Intake first message: always chat send + optional enable suggestion; remove workflow branch in
  `submit-intake.ts` for mode toggle.

**File:** `submit-intake.ts`

- First message → chat only; `recordSteering` for feed only if needed for suggestion heuristics.

### 1.6 Chat → workflow intent (later in phase 3)

**File:** `workflow-events.ts` / new `infer-chat-workflow-intent.ts`

- On chat send, optional async classify; if material, insert suggestion event — **no mutation**.

---

## Phase 2 — Stable workbench shell (UI structure)

### 2.1 Always tri-pane

**Files:**

- `TaskDetailPage.tsx` — remove `taskUsesChatOnlyLayout`; always render full `TaskWorkbench`.
- `TaskWorkbench.tsx` — delete `chatOnly` branch; single return with `WorkbenchPanelLayout`.
- `ComposeTaskPage.tsx` — align to same shell (stream + empty content + inspector).

### 2.2 Header

**File:** `TaskWorkbenchHeader.tsx`

- Remove `WorkflowLifecycleActions` (Switch to Chat / Resume).
- Show: title, workflow subtitle chip (`formatWorkflowSubtitle`), adapter badge, task status.
- Phase rail: render only when `workflow_status === active'` **and** at least one phase run exists
  (or first phase started).

### 2.3 Workflow panel (right inspector)

**New file:** `apps/desktop/src/renderer/src/features/workbench/WorkflowPanel.tsx`

Replace flat artifact list as primary workflow UI:

```txt
not_started  → Enable workflow CTA
active       → phase tree (template or DB phases) + actions
completed    → summary + Start new workflow
cancelled    → message + Start new workflow
```

**File:** `TaskRightSidebar.tsx`

- Rename tab **Artifacts → Workflow** (first tab).
- Render `WorkflowPanel` in Workflow tab; keep Files + Changes tabs.
- Default tab: `workflow` when `workflow_status === active`, else `files` or workflow with CTA.

### 2.4 Content view

**New file:** `WorkflowOverviewPanel.tsx`

- Shown when workflow active but selected artifact empty / pre-first-phase.
- Ticket summary, template steps, **[Start Questions]** duplicates panel action.

**File:** `TaskWorkbench.tsx`

- Navigation: overview when no meaningful artifact content; auto-open artifact on phase complete
  event.

### 2.5 Composer

**Files:** `CircuitInputComposer.tsx`, `CircuitAgentStream.tsx`

- Remove `showModeSelector`, Workflow toggle, `ComposerMode` state.
- Remove `useStartWorkflow` on send; always `useSendChatMessage`.
- Keep generic placeholder.
- Optional: stream **Enable workflow** suggestion card (links/focuses Workflow panel) — no layout
  change.

### 2.6 Remove / deprecate UI

| File                                          | Action                                 |
| --------------------------------------------- | -------------------------------------- |
| `WorkflowLifecycleActions.tsx`                | Delete                                 |
| `ResumeWorkflowDialog.tsx`                    | Delete                                 |
| `ConfirmWorkflowStartBanner.tsx`              | Move actions into WorkflowPanel        |
| `ConversionSuggestionCard.tsx`                | Repoint to Enable workflow             |
| `PausedChatGuardCard.tsx`                     | Delete (chat never mutates by default) |
| `usePauseWorkflow.ts`, `useResumeWorkflow.ts` | Delete                                 |
| `useStartWorkflow.ts` on composer send        | Keep hook for panel Enable only        |

---

## Phase 3 — IPC & hooks

### 3.1 API surface

**File:** `apps/desktop/src/shared/api.ts`

```ts
// Remove or deprecate
ComposerMode, PauseWorkflowRequest, ResumeWorkflowRequest

// Add / rename
enableWorkflow({ taskId, description?, workflowType? })
startPhase({ taskId, phaseName? })
cancelWorkflow({ taskId, stopRun?: boolean })
```

### 3.2 Handlers & preload

**Files:** `handlers.ts`, `preload/index.ts`, `renderer/src/ipc/client.ts`

- Wire new handlers; remove pause/resume from preload unless kept internal.

### 3.3 Hooks

| Hook                 | Purpose                   |
| -------------------- | ------------------------- |
| `useEnableWorkflow`  | Panel Enable              |
| `useStartPhase`      | Panel Start phase         |
| `useCancelWorkflow`  | Panel Cancel              |
| `useSendChatMessage` | Composer (only send path) |

---

## Phase 4 — Stream cards & explicit actions

### 4.1 Card types (in stream, not layout changes)

| Event                              | Card                                        |
| ---------------------------------- | ------------------------------------------- |
| Enable complete                    | Workflow attached — [Open overview]         |
| Phase run started                  | Phase running — [Stop]                      |
| Phase complete                     | Artifact ready — [Open] [Approve] [Revise]  |
| Chat intent (optional)             | Apply to workflow? — [Apply] [Just discuss] |
| Background complete while chatting | Workflow update — [Open] [Review in panel]  |

### 4.2 Apply to workflow

**File:** `workflow-events.ts`

- `applyChatToWorkflow(taskId, text)` — explicit only; may call steering inference + revision flow.

---

## Phase 5 — Sidebar & polish

**File:** `ProjectTreeSidebar.tsx`

- Use `formatWorkflowSubtitle` (not phase name raw).

**File:** `docs/circuit-brief.md`

- Align principle #2 with ADR 002 (chat always + attached workflow).

**File:** `docs/adr/001-...md`

- Add supersession banner at top pointing to ADR 002.

---

## Suggested PR sequence

| PR      | Scope                                                                                              | Risk                    |
| ------- | -------------------------------------------------------------------------------------------------- | ----------------------- |
| **PR1** | ADR 002 + status migration + shared types + `enableWorkflow`/`startPhase`/`cancelWorkflow` backend | Low                     |
| **PR2** | Stable shell: remove `chatOnly`, always tri-pane, generic composer                                 | Medium — touches layout |
| **PR3** | WorkflowPanel + overview content view + header subtitle                                            | Medium                  |
| **PR4** | Remove toggle/pause/resume UI; IPC cleanup                                                         | Low                     |
| **PR5** | Stream cards + Enable suggestion + Apply-to-workflow                                               | Medium                  |

Each PR should leave the app runnable.

---

## Files touched (checklist)

### Delete or gut

- [x] `WorkflowLifecycleActions.tsx`
- [x] `ResumeWorkflowDialog.tsx`
- [x] `PausedChatGuardCard.tsx`
- [x] `usePauseWorkflow.ts`, `useResumeWorkflow.ts`
- [x] Composer mode props in `CircuitInputComposer.tsx`

### Heavy edit

- [x] `TaskWorkbench.tsx`
- [x] `TaskDetailPage.tsx`
- [x] `CircuitAgentStream.tsx`
- [x] `TaskRightSidebar.tsx` → Workflow tab
- [x] `TaskWorkbenchHeader.tsx`
- [x] `start-workflow.ts`
- [x] `submit-intake.ts`
- [x] `interaction-mode.ts` → `workflow-status.ts`
- [x] `shared/api.ts`
- [x] `handlers.ts`

### New

- [x] `WorkflowPanel.tsx`
- [x] `WorkflowOverviewPanel.tsx`
- [x] `useEnableWorkflow.ts`, `useStartPhase.ts`, `useCancelWorkflow.ts`
- [x] `docs/adr/002-...md` ✓
- [x] `docs/plans/attached-workflow-implementation.md` ✓

---

## Test plan (manual)

1. New task → chat-only intake; send first message → tri-pane; Workflow panel shows Enable.
2. Enable workflow → status active; overview in content view; **no** empty artifact files on disk;
   **no** phase rail.
3. Start Questions → phase run; rail appears; artifact fills; chat still works in parallel.
4. Phase completes → **Artifact ready** card (needs_review only); Workflow panel shows needs_review;
   chat unaffected.
5. Approve → next phase startable from panel only.
6. Cancel workflow → cancelled; chat continues; Start new workflow works.
7. Complete all phases → completed; sidebar subtitle correct.

### Automated

- [x] Unit tests for `formatWorkflowSubtitle` derivation
      (`apps/desktop/src/shared/workflow-status.test.ts`)
- [ ] Integration test: `enableWorkflow` does not call `ensureWorkflowState`
- [ ] Integration test: `startPhase` creates phases idempotently

---

## Out of scope (this plan)

- `WorkflowRun` table / multiple workflows per task
- Workflow template picker UI
- `interaction_mode` column drop migration
- Pause/resume workflow status
- Archive distinct from cancel
- Checks tab (per product note)

---

## Open questions (none blocking MVP)

- Should **Enable workflow** require a description if ticket is empty? (Default: synthesize from
  last N chat messages.)
- Should stream suggestion card auto-open Workflow panel on click? (Default: yes, focus panel.)

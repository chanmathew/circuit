# Implementation plan: Task mode switcher

**ADR:** [005-task-mode-switcher.md](../adr/005-task-mode-switcher.md)  
**Status:** Implemented (MVP)  
**Goal:** Composer mode switcher that pre-configures the Workflow panel without changing chat send
behavior.

---

## Locked product rules

1. Composer **Send → chat harness always** (ADR 002).
2. Mode switcher sets **intent** on `tasks.task_mode`; default `auto`.
3. **No suggestion cards** on send when mode is explicit.
4. Workflow panel shows **template preview** when `workflow_status = not_started`.
5. **Start workflow** still required to attach (ADR 002 bootstrap).
6. Switcher **locked** while `workflow_status = active`.
7. User-facing **Guided Build** replaces Structured Change label; ID stays `structured_change`.

---

## Phase 1 — Domain (`@circuit/workflow`)

**Files:** `packages/workflow/src/task-mode.ts`, `workflow-definitions.ts`, `index.ts`

- `TaskMode` type: `auto | quick_fix | structured_change | investigation`
- `TASK_MODE_OPTIONS` with user labels
- `resolveWorkflowTypeFromTaskMode(mode, description)` — Auto delegates to `autoSelectWorkflow`
- `resolvePreviewWorkflowType(mode, description)` — for panel preview
- `isTaskModeEditable(workflowStatus)` — false when `active`
- `getEffectiveTaskMode(task)` — locked type when active, else `task_mode`
- Rename `STRUCTURED_CHANGE.label` → `Guided Build`
- Unit tests in `task-mode.test.ts`

---

## Phase 2 — Schema & API

**Files:** `packages/db/src/schema.ts`, migration via `pnpm --filter @circuit/db db:generate`

- Add `task_mode` column on `tasks`, default `'auto'`
- `updateTask` patch includes `taskMode`
- `insertTask` / `createDraftTask` default `taskMode: 'auto'`

**Files:** `apps/desktop/src/shared/api.ts`, IPC handlers, preload

- `UpdateTaskModeRequest { taskId, taskMode }`
- `CreateTaskFromIntakeRequest` optional `taskMode`
- `updateTaskMode(taskId, taskMode)` — reject when workflow active

---

## Phase 3 — Enable workflow resolution

**Files:** `start-workflow.ts`, `start-follow-up-workflow.ts`

When `input.workflowType` omitted, use `resolveWorkflowTypeFromTaskMode(task.taskMode, description)`
instead of bare `autoSelectWorkflow`.

---

## Phase 4 — Composer UI

**Files:**

- `ComposerModeSelector.tsx` — ModelSelector pattern, mirrors `ComposerProjectSelector`
- `CircuitInputComposer.tsx` — `taskMode`, `onTaskModeChange`, `taskModeDisabled` props
- `ComposeTaskPage.tsx` — local mode state → `createTaskFromIntake({ taskMode })`
- `CircuitAgentStream.tsx` / `TaskWorkbench.tsx` — wire task mode + `useUpdateTaskMode`

---

## Phase 5 — Workflow panel preview

**Files:** `WorkflowModePreview.tsx`, `WorkflowPanel.tsx`

When `canStart`:

- Show mode header: `Guided Build · Ready to start` or `Auto → Guided Build`
- List planned phases from preview resolution
- Keep **Start workflow** button

---

## Phase 6 — Copy sweep

Update fixtures, tests, and docs referencing "Structured Change" user-facing label where
appropriate.

---

## Test plan

- [ ] `task-mode.test.ts` — resolve, preview, editable lock
- [ ] Enable workflow with explicit mode uses correct type without inference override
- [ ] Enable with Auto still infers from description
- [ ] `updateTaskMode` rejected when workflow active
- [ ] Compose creates task with selected mode
- [ ] Panel preview updates when mode changes (not_started)
- [ ] Switcher disabled during active workflow

---

## Out of scope

- Review Changes / Council Review modes
- Auto-enable workflow on mode selection or send
- Renaming internal `structured_change` ID or prompt paths

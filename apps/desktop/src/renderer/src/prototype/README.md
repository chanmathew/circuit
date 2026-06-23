# Workbench UX prototype

Isolated scenario-driven UI lab (`/prototype/workbench`). Uses fixture state and structured approval
flows — not wired to IPC or the production task feed.

**Shared with production:** `PhaseRail`, `phase-styles`, and `@circuit/workflow` proceed labels from
`features/workbench/`.

**Prototype-only:** `structured-approval.ts` (fixture `WorkbenchState` gates with
`canApprovePrototypeState`, etc.), structured panels, and scenario fixtures.

Do not duplicate production helpers here; import from `features/` or `@circuit/workflow` when the
logic is the same.

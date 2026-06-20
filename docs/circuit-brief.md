# Circuit Project Brief

## Working Name

**Circuit**

## One-line Description

Circuit is a local-first control plane / harness for governed coding-agent workflows.

Shorter tagline:

```txt
Circuit keeps coding agents in a controlled loop from task to reviewed diff.
```

## Product Thesis

Current AI coding tools make it very easy to ask an agent to build something, but too easy for the
agent to jump straight into code, make broad changes, lose context, or produce plausible but
low-quality implementation plans.

Circuit solves this by turning agentic software development into a governed workflow harness:

```txt
Simple UX surface
+ governed workflow engine
+ fresh sessions
+ artifacts as memory
+ parallel worktrees/slices
+ adapter-based agent runtimes
```

Internal flow for Structured Change:

```txt
Questions → Research → Design → Structure → Plan → Parallelize → Implement slices → Integrate → Review
```

User-facing simplification:

```txt
Understand → Design → Plan → Build → Review
```

The goal is not to replace Cursor, Codex, Claude Code, or OpenCode. The goal is to provide a better
control plane around agentic coding: workflow state, artifacts, decisions, approvals, workspaces,
validation, diffs, and PR-ready summaries.

### What Circuit Is Not

- Not a chat wrapper.
- Not a full IDE.
- Not only an OpenCode UI.
- Not a prettier HumanLayer/QRSPI clone.

Circuit is a workflow engine that keeps agents aligned across sessions, artifacts, worktrees,
validation, and review.

Circuit should feel closer to Cursor/Codex in simplicity, but with HumanLayer-style structure under
the hood — exposed as **guided autonomy**, not visible harness complexity.

## Core User Experience Principles

1. **Minimal setup friction**
   - Users should start with a task description and repo.
   - Task name, slug, branch name, workflow, review level, and workspace strategy should be inferred
     automatically.
   - Advanced configuration should be available but hidden by default.

2. **Guided autonomy — not wizard, not freeform chat**
   - The primary object is a task, not a conversation.
   - Structure answers: Where are we? What is allowed now? What evidence exists? What needs my
     decision? What happens next?
   - Chat answers: Steering, clarifying, revising, going backward, choosing options, asking why,
     changing scope.
   - The UX model is:
     ```txt
     Structured task workspace
     + contextual agent chat/control surface
     + artifact/diff/review panels
     ```
   - Avoid rigid per-stage approve-only wizards. Avoid unstructured chat-as-primary-navigation.

3. **Structured feed over raw transcript**
   - Default visible activity is a structured event stream with contextual cards — not endless chat
     logs.
   - Raw transcript remains available for audit and debugging (`Show raw transcript`).
   - User messages should be able to affect workflow state and artifacts (e.g. a design decision in
     chat triggers stale downstream phases).

4. **Progressive disclosure**
   - Show only what matters now.
   - Hide model/provider/worktree details unless the user changes them or something needs approval.
   - Explain decisions only when useful.

5. **Human control at judgment points**
   - The app should auto-advance through safe read-only phases when appropriate.
   - It should pause before design decisions, plan approval, implementation, and final merge/PR.
   - The user should feel the agent is fast but boxed in.

6. **Artifacts as source of truth**
   - Each phase produces a durable artifact on disk.
   - Artifacts should be readable markdown files.
   - Durable memory is artifacts, task state, workgraph, implementation logs, diffs, validation
     output, and review results — not chat history.
   - Final PR summaries should be generated from artifacts, not from transient chat memory.

7. **Fresh sessions by default**
   - Prefer a fresh agent session per major phase, per implementation slice, and for final review.
   - This reduces context rot, token bloat, and audit noise.
   - Each session receives a generated, bounded context pack — not full prior transcripts.

8. **Local-first trust**
   - The app should run locally against local repos.
   - It should be transparent about files read, files changed, commands run, and validations
     performed.
   - The user should be able to open the worktree in Cursor or another editor at any time.

## Target Users

Primary:

- Developers who use Cursor, Claude Code, Codex, OpenCode, or similar agentic coding tools.
- Technical founders and senior engineers who want AI speed without low-quality code.
- Teams experimenting with multiple coding agents and worktrees.

Secondary:

- Engineering leads who want reviewable AI coding workflows.
- Agencies/consultancies running repeatable implementation work.
- Open-source maintainers reviewing AI-generated changes.

## MVP Goal

Build a local desktop harness that lets a user:

1. Add a local git repo.
2. Create a new structured task from a single text prompt.
3. Auto-generate task name, slug, branch name, and workspace.
4. Run a structured workflow through an agent runtime adapter (OpenCode first).
5. Generate and review markdown artifacts for each phase.
6. Steer and approve via structured cards and contextual chat — not rigid wizard buttons alone.
7. Implement vertical slices (serial first; parallel after core loop works).
8. View changed files and diffs.
9. Run validation commands.
10. Pass an Oracle/no-ship final review gate.
11. Generate a final review / PR summary.

## Initial Workflow Types

The app should support workflow types internally, but avoid forcing the user to choose upfront.

Default UX:

```txt
Approach: Auto
Review level: Standard
```

Auto maps to one of:

### Quick Fix

For small, obvious changes.

Internal flow:

```txt
Task → Plan → Implement → Review
```

### Structured Change

For features, integrations, refactors, and multi-file changes.

Internal flow:

```txt
Questions → Research → Design → Structure → Plan → Parallelize → Implement slices → Integrate → Review
```

User-facing:

```txt
Understand → Design → Plan → Build → Review
```

### Investigation

For bugs, flaky tests, unknown behavior, or performance issues.

Internal flow:

```txt
Questions → Research → Hypotheses → Reproduce → Fix Plan → Implement → Review
```

### PR Review

For reviewing an existing branch or diff.

Internal flow:

```txt
Diff Intake → Risk Review → Test Review → Comments → Summary
```

### Freeform

For exploratory agent sessions.

Internal flow:

```txt
Open-ended transcript, still attached to a task
```

For MVP, implement only:

```txt
Quick Fix
Structured Change
Investigation
```

## Circuit Protocol Layer

Circuit defines its own canonical events, artifacts, decisions, gates, and workflow states — then
maps external runtimes into Circuit via adapters.

This keeps Circuit from being locked into OpenCode-specific concepts.

`packages/protocol` holds:

- event schemas
- artifact schemas
- decision schemas
- workflow schemas
- tool schemas
- markdown block parsers
- MCP schemas (future)

Potential runtime adapters:

- OpenCode (first)
- Claude Code
- Codex
- Cursor / manual
- ZOB-style harnesses
- future custom agents

### Structured Event Blocks

To power contextual UI, agents should emit structured blocks or call Circuit tools.

Markdown/JSON block types (MVP):

```txt
circuit-decision
circuit-artifact
circuit-validation
circuit-blocker
circuit-diff
```

Future MCP/custom tools:

```txt
circuit_decision()
circuit_artifact_ready()
circuit_mark_stale()
circuit_validation_result()
circuit_blocker()
```

MVP can parse markdown/JSON blocks first; custom tools and MCP come later.

### Structured Event Feed

Layered model:

```txt
Raw transcript → structured event stream → contextual UI cards
```

Default visible feed events:

```txt
phase started
files read
artifact written
decision required
validation passed/failed
diff ready
blocker
```

Stream primitives (lightweight — heavy content renders in the center content view):

```txt
user_message      — user steering and clarifications
agent_message     — agent prose (driver, oracle, scout, builder)
activity_group    — collapsed tool/file/command activity
action_card       — decisions, approvals, blockers, revision prompts
reference_card    — links to artifacts, diffs, checks, files, reviews
```

The stream summarizes and navigates; artifacts, diffs, validation output, and file
content render in the center content view. Reference cards update content selection
and the right inspector tab when opened.

`ActionCard` variants cover decisions, approvals, blockers, and no-ship gates.
`ReferenceCard` variants cover artifacts, diffs, checks, files, and reviews.

Example decision card (rendered as an action card in the stream):

```txt
Decision needed:
Choose routing strategy

[Use labels] [Use folders] [Compare more] [Ask]
```

When the user steers via chat:

```txt
User: Actually, use folder routing.
```

Circuit should infer workflow impact and offer:

```txt
This changes Design.
Mark Structure and Plan stale?
[Revise Design] [Add note only] [Cancel]
```

## Harness / Agent Design

Circuit is role-capable, not multi-agent-first.

Default model:

```txt
Circuit = deterministic orchestrator
Driver agent = does the work
Oracle/Reviewer = skeptical review / no-ship gate
```

MVP roles:

```txt
Driver
Oracle
```

Future roles (defer):

```txt
Scout
Architect
Builder
Reviewer
Security Reviewer
Test Reviewer
```

Important: a role does not necessarily mean a separate session. A role can be:

- same session with different prompt posture
- separate session
- separate model/provider

Default UX should not ask users to pick agents. Instead:

```txt
Review level: Fast / Standard / Strict
```

## Fresh Sessions and Context Packs

Because sessions are fresh, each run needs a generated context pack.

Example for Slice 2:

```txt
AGENTS.md
00-ticket.md
approved design
approved structure
approved plan
active slice spec
dependency outputs
previous implementation logs
validation failures
```

Avoid including:

```txt
full raw transcripts
stale artifact versions
unrelated slice logs
unbounded repo summaries
```

Context pack generation is a core feature: Circuit produces bounded context for each run.

## Main Product Objects

### Repo

A local git repository registered with Circuit.

Fields:

- id
- name
- path
- defaultBranch
- createdAt
- updatedAt

### Task

A unit of work.

Fields:

- id
- repoId
- title
- slug
- description
- workflowType
- status
- currentPhase
- branchName
- workspacePath
- workspaceStrategy
- reviewLevel
- createdAt
- updatedAt

Task statuses:

- draft
- running
- needs_review
- needs_decision
- blocked
- implementing
- diff_ready
- done
- archived

### Phase

A step in the workflow.

Phase names for Structured Change (internal):

- questions
- research
- design
- structure
- plan
- parallelize
- implement
- integrate
- review

Fields:

- id
- taskId
- name
- status
- order
- currentArtifactId
- dependsOnArtifactIds
- staleReason

Phase statuses:

- locked
- ready
- running
- needs_review
- approved
- needs_revision
- stale
- failed
- skipped

### Artifact

A markdown file generated during a phase.

Fields:

- id
- taskId
- phase
- path
- title
- content
- version
- status
- createdAt
- updatedAt

Artifact statuses:

- draft
- needs_review
- approved
- rejected
- stale

Standard artifacts:

- 00-ticket.md
- 01-questions.md
- 02-research.md
- 03-design.md
- 04-structure.md
- 05-plan.md
- 06-parallelization-plan.md
- 06-implementation-log.md (per-slice logs may also exist)
- 07-integrate-log.md
- 08-review.md
- 09-replan.md (when needed)

### Slice

An implementation unit derived from the parallelization plan.

Fields:

- id
- taskId
- name
- order
- dependsOnSliceIds
- expectedFiles
- conflictRisk
- executionGroup
- validationCommands
- status
- workspaceId
- currentRunId

Slice statuses:

- pending
- ready
- running
- needs_review
- approved
- blocked
- failed
- merged

### Phase Run

One execution of an agent phase or slice in a fresh session.

Fields:

- id
- taskId
- phase
- sliceId (optional)
- role (driver | oracle | …)
- runtimeAdapter
- sessionId
- contextPackHash
- agent
- model
- status
- inputPrompt
- transcript
- structuredEvents
- filesRead
- filesChanged
- commandsRun
- startedAt
- completedAt

### Workflow Event

A normalized Circuit protocol event for the structured feed.

Fields:

- id
- taskId
- phaseRunId
- type
- payload
- timestamp

Event types include:

- phase:started
- phase:completed
- artifact:written
- decision:required
- validation:passed
- validation:failed
- diff:ready
- blocker:raised
- agent:activity

### Iteration and Revisiting Phases

The workflow is linear by default but must support revisiting earlier phases.

Approving a phase does not make it immutable. It marks the current artifact version as approved and
allows downstream phases to proceed.

If an upstream artifact is materially revised, downstream artifacts that depend on the previous
version should be marked as stale.

Example:

- Design v1 approved
- Structure v1 generated from Design v1
- Plan v1 generated from Structure v1
- User revises Design to v2
- Structure v1 and Plan v1 become stale
- Implementation is locked until Structure and Plan are refreshed

The app should distinguish between three kinds of revision:

1. **Minor revision** — wording or small details; downstream work remains valid.
2. **Material revision** — design, architecture, scope, or direction changes; new artifact version;
   downstream phases become stale.
3. **Alternate path** — explore a second path without replacing the approved path (defer until after
   MVP).

The UX should provide actions:

- Revisit this phase
- Revise without invalidating downstream
- Revise and refresh downstream
- Regenerate next phase
- View stale artifact
- Compare artifact versions

Each phase should track which artifact versions it depends on.

Example:

```json
{
  "name": "plan",
  "status": "stale",
  "currentArtifactId": "plan-v1",
  "dependsOnArtifactIds": ["design-v1", "structure-v1"],
  "staleReason": "Design was revised from v1 to v2"
}
```

If implementation has already started, revisiting Design, Structure, or Plan should show a warning
because existing code may no longer match the approved workflow.

For MVP, support:

- artifact versions
- stale phase status
- downstream invalidation
- revisit phase action
- warning if implementation has started
- chat-inferred revision prompts (minor vs material)

Defer until later:

- alternate design branches
- visual artifact comparison
- automatic reconciliation of already-written code

### Workspace

An isolated local workspace for a task or slice.

Strategies:

- current
- git-worktree
- cow-worktree
- full-copy

Workspace model for parallel implementation:

```txt
one task integration branch/workspace
one worktree per parallel slice
one session per slice
one implementation log per slice
one diff/review per slice
```

Approved slices merge into the integration workspace/branch.

MVP should support:

- current
- git-worktree (task workspace first; slice worktrees when parallel execution lands)

Future:

- cow-worktree using filesystem copy-on-write/reflink support where available.

## Parallel Execution and Slice DAG

After planning, Circuit should not assume serial implementation only.

It should generate a **Parallelization Plan** / slice DAG:

```txt
slices
dependencies
expected files touched
conflict risks
execution groups
validation commands
integration requirements
```

Example:

```txt
Slice 1: Classification primitive
Depends on: none

Slice 2: Webhook integration
Depends on: Slice 1

Slice 3: Dashboard visibility
Depends on: Slice 1

Slice 4: Final integration
Depends on: Slice 2 + Slice 3
```

Independent slices can run in parallel in isolated worktrees.

**MVP sequencing:** ship serial slice implementation first to validate the end-to-end loop; add
parallelize + slice worktrees once the core harness works.

## Oracle / No-Ship Gate

Final review uses an explicit Oracle posture (fresh session, bounded context).

Oracle outputs:

```txt
Ready
Ready with risks
No-ship
```

No-ship blockers include:

```txt
validation failed
implementation diverged from plan
missing tests
security concern
scope creep
unresolved dependency conflict
```

This is more meaningful than “review complete.”

## UX Screens

### 1. Repo Dashboard

Purpose:

- Show registered repos.
- Let user add a repo.
- Show active tasks by repo.

Key actions:

- Add repo
- Open repo
- New task

### 2. Task Dashboard

Purpose:

- Show active tasks and their current phase/status.
- Surface an **attention inbox** for items needing human action.

Task card should show:

- task title
- repo
- current phase
- status
- branch/workspace
- last updated
- next required action

Example statuses:

- Running Research
- Needs Design Review
- Slice 2 diff ready
- Slice 3 typecheck failed
- Slice 4 blocked waiting on Slice 2
- Blocked

### 3. New Task

The default screen should be very simple.

Fields:

- Task description
- Repo selector
- Approach: Auto
- Start button

Hidden/advanced fields:

- task name
- slug
- branch name
- workflow type
- workspace strategy
- review level
- coding agent runtime
- provider
- model
- effort

Default UI:

```txt
What should the agent work on?

[large text area]

Repo: chorus-client-runtime
Approach: Auto · Structured Change
Review: Standard
Workspace: Isolated branch

[Start]
```

Behavior:

- Generate title from task description.
- Generate slug from title.
- Generate branch name as `Circuit/<slug>`.
- Infer workflow type.
- Infer workspace strategy.
- Create task folder under `.Circuit/tasks/<slug>/`.
- Create initial `00-ticket.md`.

### 4. Task Detail (Workbench)

This is the main workbench screen.

Layout:

- Left sidebar: artifacts, changed files, validation, links.
- Main panel: current artifact, diff, or review.
- Right panel: structured event feed, contextual cards, steering chat.

Top area:

- task title
- repo
- branch/workspace
- current phase
- open in Cursor button
- advanced settings menu

Phase rail (user-facing can simplify Build/Review while internal phases remain granular):

```txt
Understand → Design → Plan → Build → Review
```

Internal Structured Change rail:

```txt
Questions → Research → Design → Structure → Plan → Parallelize → Implement → Integrate → Review
```

Each phase should show:

- locked
- ready
- running
- needs review
- approved
- needs revision
- stale
- failed
- skipped

### 5. Artifact Review

For pre-implementation phases, the main panel shows a markdown artifact.

Features:

- markdown source editor
- markdown preview
- structured cards inline (decisions, Q&A, findings)
- contextual steering chat
- revisit / revise actions (minor vs material)
- structured event feed (default)
- show raw transcript (toggle)
- files read
- commands run

The user should be able to edit artifacts manually before approving.

### 6. Implementation Board

Implementation is slice-based.

During Build, show:

- implementation board (slice status overview)
- attention inbox (compact slice review cards)
- active slice summary (not multiple live chats by default)

Per slice:

- summary
- changed files
- validation status
- oracle status (when applicable)
- review diff
- approve / request changes

Default order: summary first, diff second, raw transcript last.

Serial MVP: one active slice at a time. Parallel: multiple slices in flight with inbox-driven
review.

### 7. Diff Review

Shows:

- changed files
- additions/deletions
- unified/split diff
- validation results
- agent summary
- risk notes

Actions:

- approve slice
- request changes
- open file in Cursor
- open worktree in Cursor
- rerun validation
- revert slice

### 8. Integration

After parallel slices are approved:

- merge/rebase approved slice work into integration workspace
- run integration validation
- surface conflicts and blockers
- lock final review until integration passes

Defer full integration UX until parallel slice execution exists. For serial MVP, integration is
implicit (single worktree).

### 9. Final Review (Oracle)

Shows:

- completed slices
- changed files
- tests run
- unresolved risks
- rollback notes
- Oracle verdict (Ready / Ready with risks / No-ship)
- generated PR summary

Actions:

- copy PR summary
- create commit
- push branch
- archive task

## Ideal Default Flow

User enters:

```txt
Add invoice inbox triage for AP emails. Classify incoming emails into PDF invoice, invoice without PDF, and needs review. Preserve existing webhook behavior and add tests.
```

Circuit should:

1. Infer title: `Invoice inbox triage`
2. Infer workflow: `Structured Change`
3. Infer workspace: `git-worktree`
4. Create branch: `Circuit/invoice-inbox-triage`
5. Create task folder.
6. Write `00-ticket.md`.
7. Start Questions phase automatically in a fresh session with a bounded context pack.
8. Produce `01-questions.md`.
9. If auto-advance is enabled for read-only setup phases, continue to Research (new session).
10. Pause at Design if a human decision is needed.
11. Pause before implementation.
12. Generate parallelization plan after Plan (can be trivially serial for small tasks).
13. Implement slices (serial in MVP; parallel when ready).
14. Integrate approved slice outputs (when parallel).
15. Run Oracle final review.
16. Generate final PR summary.

## Agent Integration

Primary runtime for MVP:

- OpenCode

Architecture:

```txt
desktop app + workflow engine + protocol layer + runtime adapters + workspace orchestration
```

Division of responsibility:

**OpenCode handles:**

- agent execution
- models
- tool calls
- file edits
- bash commands
- sessions

**Circuit handles:**

- workflow state
- artifacts
- decisions
- approvals
- stale dependencies
- diffs
- validation
- review queues
- context packs
- fresh session policy

### Integration Levels

```txt
Level 0: file protocol only
Level 1: prompt protocol with markdown/JSON blocks
Level 2: custom Circuit tools / MCP
Level 3: native adapter/plugin integration
```

MVP starts with:

```txt
OpenCode SDK/server
+ artifact files
+ structured prompt blocks
+ file/git watchers
+ raw transcript storage
+ structured event normalization
```

Then later:

```txt
custom tools
MCP server
OpenCode plugin
```

Circuit communicates with runtimes through local adapters.

Adapter responsibilities:

- start or connect to runtime server
- create fresh sessions with context packs
- send phase prompts
- stream activity/events
- normalize runtime output into Circuit protocol events
- parse structured markdown/JSON blocks
- collect transcripts
- detect completion/failure
- read produced artifacts from disk
- capture files changed and commands run if available

Future adapters:

- Codex
- Claude Code
- Cursor CLI if available
- custom local agent

## Prompt/Workflow System

Prompts should live in the repo as versioned, inspectable product assets — not hidden runtime text.

Suggested structure:

```txt
packages/prompts/src/
  structured-change/
    using-circuit.md
    01-questions.md
    02-research.md
    03-design.md
    04-structure.md
    05-plan.md
    06-parallelize.md
    07-implement-slice.md
    08-integrate.md
    09-review.md
    10-replan.md

  quick-fix/
    01-plan.md
    02-implement.md
    03-review.md

  investigation/
    01-questions.md
    02-research.md
    03-hypotheses.md
    04-reproduce.md
    05-fix-plan.md
    06-implement.md
    07-review.md
```

Eventually, users should be able to inspect and edit these from the app:

```txt
Settings → Workflow Templates → Structured Change → Edit Prompt
```

### Prompt and Skill Design

Circuit should use a root workflow prompt plus phase-specific prompts.

Root prompt:

- `using-circuit.md`

Phase prompts (Structured Change):

- `01-questions.md`
- `02-research.md`
- `03-design.md`
- `04-structure.md`
- `05-plan.md`
- `06-parallelize.md`
- `07-implement-slice.md`
- `08-integrate.md`
- `09-review.md`
- `10-replan.md`

Each phase prompt should follow the same structure:

1. Inputs
2. Mission
3. Rules
4. Output Format
5. Stop Condition

Each phase run should also follow the same behavioral loop:

1. Announce phase
2. Verify required inputs exist
3. State allowed/prohibited actions
4. Perform the phase work
5. Write one artifact (and emit structured blocks where applicable)
6. Self-review the artifact
7. Stop for human approval or mark ready for next phase

Prompts should produce structured markdown artifacts with consistent sections: Mermaid diagrams
where useful, file maps, decision tables, risks, assumptions, validation commands, and rollback
notes.

Research artifacts should emphasize objective codebase facts, file paths, symbols, current behavior,
tests, risks, and unknowns.

Design artifacts should include current state, desired end state, recommended approach, options
considered, tradeoffs, key decisions, risks, assumptions, and Mermaid diagrams when useful.

Structure artifacts should include file maps, proposed interfaces, data flow, vertical slices,
dependency diagrams, and validation points.

Plan artifacts should include implementation slices, files changed, steps, automated verification,
manual verification, testing strategy, migration notes, rollback notes, and references.

Parallelization artifacts should include slice DAG, dependencies, expected files, conflict risks,
execution groups, validation commands, and integration requirements.

Implementation artifacts should include files changed, commands run, validation results, deviations
from plan, and follow-up notes.

Review artifacts should include plan alignment, diff summary, validation results, risks, Oracle
verdict, potential issues, rollback notes, PR summary, and human review checklist.

Example phase rules:

Questions:

- Do not inspect files yet unless necessary.
- Do not propose a solution.
- Produce questions and research targets.

Research:

- Read-only.
- Gather objective codebase facts.
- Do not recommend implementation.
- Cite files, functions, commands, and patterns.

Design:

- Propose approaches and tradeoffs.
- Surface decisions required from human.
- Do not write implementation plan yet.

Structure:

- Define files, types, modules, and vertical slices.
- Avoid horizontal implementation phases.

Plan:

- Produce tactical checklist.
- Include validation commands.
- Stop before implementation.

Parallelize:

- Derive slice DAG from approved structure and plan.
- Identify parallelizable groups and conflict risks.
- Do not implement code.

Implement:

- Implement one approved slice only.
- Do not refactor unrelated code.
- Run validation.
- Update implementation log.

Integrate:

- Merge approved slice outputs into integration workspace.
- Run integration validation.
- Surface conflicts; do not start new feature work.

Review (Oracle):

- Review diff against plan.
- Emit Ready / Ready with risks / No-ship.
- Summarize tests, risks, and rollback.
- Generate PR-ready summary.

## Tech Stack

Use Vite+ for project/toolchain management.

Desktop:

- Electron

Build/dev:

- electron-vite
- Vite+

Frontend:

- React
- TypeScript
- TanStack Router
- TanStack Query
- Tailwind CSS
- shadcn/ui
- Radix UI

State:

- Zustand for local UI state
- XState or a strongly typed reducer/state machine for workflow phase state

Database:

- SQLite
- Drizzle ORM

Git/filesystem:

- simple-git
- execa
- chokidar

Diff:

- Evaluate `@pierre/diffs`
- Evaluate `@git-diff-view/react`
- Choose whichever better supports interactive review, comments, widgets, and performance.

Editor:

- Monaco Editor

Terminal:

- Defer initially.
- Later: xterm.js + node-pty

Validation/logs:

- run commands through Node service
- stream output into structured event feed

Packaging:

- Electron builder or Electron Forge
- Auto-update later

Conceptual architecture:

```txt
not just desktop app + OpenCode
→ desktop app + workflow engine + protocol layer + runtime adapters + workspace orchestration
```

## Monorepo Structure

Suggested structure:

```txt
apps/
  desktop/
    src/
      main/
      preload/
      renderer/

packages/
  protocol/
    events/
    artifacts/
    decisions/
    blocks/
    parsers/

  ui/
    components/
    styles/

  workflow/
    types.ts
    phase-machine.ts
    workflow-definitions.ts
    auto-select-workflow.ts
    context-pack.ts
    phase-revisit.ts

  prompts/
    src/
      index.ts
      structured-change/
      quick-fix/
      investigation/

  agent-adapters/
    types.ts
    opencode-adapter.ts
    mock-adapter.ts

  workspace-manager/
    types.ts
    create-workspace.ts
    create-git-worktree.ts
    create-cow-worktree.ts
    create-slice-worktree.ts
    detect-capabilities.ts
    cleanup-workspace.ts
    merge-slices.ts

  git/
    status.ts
    diff.ts
    worktrees.ts
    branches.ts
    validation.ts

  db/
    schema.ts
    migrations/
    client.ts

  shared/
    ids.ts
    paths.ts
    errors.ts
    events.ts
```

## Local Data Storage

Use SQLite for app state.

Suggested tables:

- repos
- tasks
- phases
- artifacts
- slices
- phase_runs
- workflow_events
- workspaces
- validation_runs
- settings

Artifacts should also exist as markdown files on disk.

Default location inside target repo:

```txt
.Circuit/
  tasks/
    <task-slug>/
      00-ticket.md
      01-questions.md
      02-research.md
      03-design.md
      04-structure.md
      05-plan.md
      06-parallelization-plan.md
      slices/
        slice-1/
          implementation-log.md
        slice-2/
          implementation-log.md
      07-integrate-log.md
      08-review.md
```

Alternative global app storage can be added later for users who do not want metadata inside their
repos.

## Workspace Strategy

MVP:

- Current workspace for quick fixes.
- Git worktree for structured changes (task integration workspace).

Default:

- Quick Fix → current branch unless repo has uncommitted changes.
- Structured Change → git worktree.
- Investigation → git worktree.
- PR Review → existing branch or selected diff.

Future (parallel slices):

- One worktree per parallel slice.
- Merge approved slices into integration workspace.
- CoW worktrees where available.

The user-facing UI should say:

```txt
Workspace: Isolated
Storage: Optimized when available
```

Do not expose low-level mechanics by default.

## Phase Execution

Each phase run should:

1. Load task metadata.
2. Build bounded context pack from approved artifacts and slice state.
3. Create a fresh runtime session.
4. Render the phase prompt template.
5. Send prompt to runtime with correct role/posture.
6. Stream activity; normalize into Circuit protocol events.
7. Parse structured blocks from output.
8. Wait for completion.
9. Read expected artifact.
10. Update phase/slice state.
11. Ask for approval, surface decision cards, or auto-advance if safe.

Phase permission defaults:

Questions, Research, Design, Structure, Plan, Parallelize:

- read-only
- no code edits

Implement:

- file edits allowed
- terminal commands allowed
- destructive commands require approval

Integrate:

- merge/rebase allowed
- integration validation allowed
- no new feature work

Review (Oracle):

- read-only
- no code edits unless explicitly requested

## Auto-Advance Rules

Default behavior:

- Auto-run Questions after task creation.
- Auto-run Research after Questions if confidence is high and no questions require human
  clarification.
- Pause at Design if decisions are required.
- Always pause before Implementation.
- Always pause after each implementation slice.
- Always pause before commit/push.

Settings:

- Conservative
- Balanced
- Fast

Conservative:

- Pause after every phase.

Balanced:

- Auto-advance through Questions and Research when safe.
- Pause before Design approval and Implementation.

Fast:

- Auto-advance through all read-only phases.
- Pause only before Implementation and final Oracle review.

Default should be Balanced.

## MVP UI Components

Required:

- Repo selector
- Task list with attention inbox
- New task launcher
- Phase rail
- Artifact tree
- Artifact markdown editor
- Markdown preview
- Structured event feed
- Contextual cards (decision, validation, diff, blocker)
- Steering chat input
- Show raw transcript toggle
- Changed files list
- Diff viewer
- Validation output panel
- Implementation board / slice cards
- Open in Cursor button

Optional later:

- Terminal
- Full file explorer
- Inline diff comments
- Multi-agent comparison
- GitHub issue import
- Linear/Jira import
- GitHub PR creation
- Team sync

## MVP Action Labels

Avoid generic labels like “Send” or “Run” where phase context matters.

Prefer contextual cards and primary continue actions when gates pass. Examples:

- Start task
- Continue
- Revise design
- Unlock implementation
- Review diff
- Approve slice
- Request changes
- Prepare PR summary

Decision cards should use explicit option labels, not generic approve buttons alone.

## Naming and Brand Direction

Working name:

- Circuit

Positioning:

- A local-first control plane / harness for governed coding-agent workflows.
- Circuit keeps coding agents in a controlled loop from task to reviewed diff.
- Run agents through reviewable software development workflows.

Tone:

- calm
- technical
- precise
- trustworthy
- not hype-driven

Avoid:

- “10x developer”
- “autonomous engineer”
- “vibe coding”
- “ship anything instantly”

Preferred language:

- harness
- control plane
- governed
- structured
- reviewable
- isolated
- controlled
- artifacts
- phases
- workspaces
- validation
- approval
- implementation slices
- guided autonomy

## Open Source Strategy

Circuit should likely be open source, at least for the local desktop/core version — and potentially
as a protocol/harness layer, not just an app.

Recommended model:

- Open-source local desktop app, workflow engine, and protocol.
- Keep hosted/team features for later commercial offering.

Open-source:

- desktop app
- workflow engine
- Circuit protocol
- runtime adapters (OpenCode first)
- prompt templates
- SQLite schema
- local task/artifact system
- basic diff/review UI

Potential paid/cloud features later:

- team sync
- hosted remote runners
- GitHub app
- shared workflow library
- audit logs
- org policies
- centralized provider/model settings
- collaboration/comments
- enterprise controls

License:

- MIT or Apache-2.0 for broad adoption.
- Consider Apache-2.0 if patent protection matters.
- Avoid AGPL initially unless intentionally choosing a stricter open-source model.

## What Not To Build First

Do not build:

- full IDE replacement
- autocomplete
- full terminal environment
- complete git GUI
- hosted cloud runners
- team collaboration
- custom agent runtime
- custom LLM provider abstraction from scratch
- custom diff renderer
- custom markdown editor
- full plugin marketplace
- visible multi-agent orchestration UI

Use existing primitives wherever possible.

## First Build Milestones

### Milestone 1: Local shell ✅

- Electron app opens.
- Add local repo.
- Persist repo in SQLite.
- Show task dashboard.
- Create task with description.
- Generate name, slug, branch name.
- Write `.Circuit/tasks/<slug>/00-ticket.md`.

### Milestone 2a: Circuit protocol

- Add `packages/protocol`.
- Define canonical event, artifact, decision, and block schemas.
- Add markdown/JSON block parsers.
- Extend shared event types.

### Milestone 2b: Workflow state

- Implement Structured Change workflow (internal phases).
- Show phase rail.
- Store phase state in SQLite.
- Show artifact tree.
- Create empty artifact files for phases.

### Milestone 3: Mock agent loop

- Build mock agent adapter.
- Simulate Questions/Research/Design outputs.
- Render artifacts in editor/preview.
- Structured event feed + contextual cards (not raw transcript only).
- Approve/revise phase; chat-inferred revision prompts.
- Auto-advance according to Balanced mode.

### Milestone 3b: Context packs and fresh sessions

- Context pack builder from approved artifacts.
- Fresh session per phase run in mock adapter.
- Store sessionId and contextPackHash on phase_runs.

### Milestone 4: OpenCode integration (Level 1)

- Start/connect to OpenCode server.
- Send Questions phase prompt with context pack.
- Stream transcript/activity; normalize to protocol events.
- Parse structured blocks from output.
- Write/read generated artifact.
- Repeat for Research and Design.

### Milestone 5: Workspaces

- Create git worktree for structured tasks.
- Show branch/workspace path.
- Open workspace in Cursor.
- Remove/cleanup workspace.

### Milestone 6: Implementation slice (serial)

- Generate plan artifact.
- Parse implementation slices from plan (serial DAG).
- Run implement-slice prompt through OpenCode in fresh sessions.
- Capture changed files.
- Show git status and diff.

### Milestone 7: Diff review and validation

- Render diff viewer.
- Run validation command.
- Show validation cards in structured feed.
- Approve/request changes for slice.
- Update implementation log.

### Milestone 8: Oracle final review

- Generate review artifact with Oracle verdict.
- Ready / Ready with risks / No-ship gate.
- Generate PR summary.
- Copy PR summary.
- Optional commit creation.

### Milestone 9: Parallelize and slice worktrees (post-MVP core)

- Parallelization plan artifact and slice DAG.
- Slice worktrees and implementation board.
- Attention inbox for parallel slice review.
- Merge approved slices into integration workspace.

### Milestone 10: Integration phase

- Integrate prompt and validation.
- Conflict surfacing and integration gate before final Oracle review.

## Cursor Build Instructions

When building this project in Cursor:

1. Start with the Electron + React + Vite+ project setup.
2. Do not implement OpenCode integration first.
3. Add `packages/protocol` before wiring agent output to the UI.
4. Build the local data model, task UI, and mock adapter first.
5. Use mock agent output to validate guided-autonomy UX (cards + feed, not transcript-only).
6. Add real OpenCode integration only after the phase/artifact loop works.
7. Avoid building a full IDE.
8. Keep code modular around packages:
   - protocol
   - workflow
   - agent-adapters
   - workspace-manager
   - git
   - db
   - ui

9. Treat workflow state and the Circuit protocol as the core product.
10. Keep artifacts as markdown files on disk.
11. Every major feature should be testable without a real coding agent.
12. Ship serial slice implementation before parallel worktrees.

## Initial Success Criteria

The MVP is successful if a developer can:

1. Add a local repo.
2. Start a task from one prompt.
3. Watch Circuit produce Questions, Research, Design, Structure, and Plan artifacts.
4. Steer and approve via structured cards and contextual chat.
5. Let an agent implement one slice in an isolated worktree (serial).
6. Review the diff.
7. Run validation.
8. Receive an Oracle verdict and generate a clean final review/PR summary.
9. Open the worktree in Cursor whenever they want deeper code control.

The user should feel:

```txt
The agent is fast, but constrained.
I can see what it understands.
I can correct it before code is written.
I approve the plan.
I review each slice.
Nothing important happens invisibly.
```

Extended north star:

```txt
Circuit is a local-first control plane for coding agents that coordinates fresh sessions,
artifacts, worktrees, parallel implementation slices, validation, and review gates through a
simple task-first UX.
```

That is the product north star.

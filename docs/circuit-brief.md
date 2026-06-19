# Circuit Project Brief

## Working Name

**Circuit**

## One-line Description

Circuit is a local-first desktop app for running AI coding agents through structured, reviewable
development workflows.

## Product Thesis

Current AI coding tools make it very easy to ask an agent to build something, but too easy for the
agent to jump straight into code, make broad changes, lose context, or produce plausible but
low-quality implementation plans.

Circuit solves this by turning agentic software development into a controlled workflow:

**Task → Questions → Research → Design → Structure → Plan → Implement → Review**

The goal is not to replace Cursor, Codex, Claude Code, or OpenCode. The goal is to provide a better
control plane around agentic coding: task state, workspaces, artifacts, approvals, diffs,
validation, and PR-ready summaries.

Circuit should feel closer to Cursor/Codex in simplicity, but with HumanLayer-style structure under
the hood.

## Core User Experience Principles

1. **Minimal setup friction**
   - Users should start with a task description and repo.
   - Task name, slug, branch name, workflow, agent, effort, and workspace strategy should be
     inferred automatically.
   - Advanced configuration should be available but hidden by default.

2. **Workflow over chat**
   - The primary object is a task, not a conversation.
   - The interaction model is phase → artifact → approval.
   - Agent output should be shown as phase transcripts and artifacts, not endless chat logs.

3. **Progressive disclosure**
   - Show only what matters now.
   - Hide model/provider/worktree details unless the user changes them or something needs approval.
   - Explain decisions only when useful.

4. **Human control at judgment points**
   - The app should auto-advance through safe read-only phases when appropriate.
   - It should pause before design decisions, plan approval, implementation, and final merge/PR.
   - The user should feel the agent is fast but boxed in.

5. **Artifacts as source of truth**
   - Each phase produces a durable artifact on disk.
   - Artifacts should be readable markdown files.
   - Final PR summaries should be generated from artifacts, not from transient chat memory.

6. **Local-first trust**
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

Build a local desktop app that lets a user:

1. Add a local git repo.
2. Create a new structured task from a single text prompt.
3. Auto-generate task name, slug, branch name, and workspace.
4. Run a structured workflow through OpenCode.
5. Generate and review markdown artifacts for each phase.
6. Approve or revise each phase.
7. Implement one vertical slice at a time.
8. View changed files and diffs.
9. Run validation commands.
10. Generate a final review / PR summary.

## Initial Workflow Types

The app should support workflow types internally, but avoid forcing the user to choose upfront.

Default UX:

```txt
Approach: Auto
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
Questions → Research → Design → Structure → Plan → Implement → Review
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

Phase names for Structured Change:

- questions
- research
- design
- structure
- plan
- implement
- review

Phase statuses:

- locked
- ready
- running
- needs_review
- approved
- needs_revision
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

Standard artifacts:

- 00-ticket.md
- 01-questions.md
- 02-research.md
- 03-design.md
- 04-structure.md
- 05-plan.md
- 06-implementation-log.md
- 07-review.md

### Phase Run

One execution of an agent phase.

Fields:

- id
- taskId
- phase
- agent
- model
- status
- inputPrompt
- transcript
- filesRead
- filesChanged
- commandsRun
- startedAt
- completedAt

### Workspace

An isolated local workspace for a task.

Strategies:

- current
- git-worktree
- cow-worktree
- full-copy

MVP should support:

- current
- git-worktree

Future:

- cow-worktree using filesystem copy-on-write/reflink support where available.

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
- Ready to Implement
- Diff Ready
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
- coding agent
- provider
- model
- effort

Default UI:

```txt
What should the agent work on?

[large text area]

Repo: chorus-client-runtime
Approach: Auto · Structured Change
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

### 4. Task Detail

This is the main workbench screen.

Layout:

- Left sidebar: artifacts, changed files, validation, links.
- Main panel: current artifact, diff, or review.
- Right panel: agent activity, phase transcript, decisions.

Top area:

- task title
- repo
- branch/workspace
- current phase
- open in Cursor button
- advanced settings menu

Phase rail:

```txt
Questions → Research → Design → Structure → Plan → Implement → Review
```

Each phase should show:

- locked
- ready
- running
- needs review
- approved
- failed

### 5. Artifact Review

For pre-implementation phases, the main panel shows a markdown artifact.

Features:

- markdown source editor
- markdown preview
- approve button
- request revision button
- scoped feedback box
- activity transcript
- files read
- commands run

The user should be able to edit artifacts manually before approving.

### 6. Implementation

Implementation is slice-based.

The active slice is derived from `05-plan.md`.

Implementation screen shows:

- active slice
- scope
- files expected to change
- validation command
- agent activity
- files changed
- test results
- implementation log

Actions:

- implement next slice
- stop
- view diff
- run validation
- approve slice
- request changes
- open in Cursor

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

### 8. Final Review

Shows:

- completed slices
- changed files
- tests run
- unresolved risks
- rollback notes
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
7. Start Questions phase automatically.
8. Produce `01-questions.md`.
9. If auto-advance is enabled for read-only setup phases, continue to Research.
10. Pause at Design if a human decision is needed.
11. Pause before implementation.
12. Implement one vertical slice at a time.
13. Require diff review before moving to the next slice.
14. Generate final PR summary.

## Agent Integration

Primary engine for MVP:

- OpenCode

Architecture:

- Circuit owns workflow state, artifacts, approvals, workspaces, git/diff UI.
- OpenCode owns agent runtime, model providers, tool execution, file edits, shell commands, and
  codebase interaction.

Circuit should communicate with OpenCode through a local adapter.

Adapter responsibilities:

- start or connect to OpenCode server
- create sessions
- send phase prompts
- stream activity/events
- collect transcripts
- detect completion/failure
- read produced artifacts from disk
- capture files changed and commands run if available

The app should be designed so future adapters can be added:

- Codex
- Claude Code
- Cursor CLI if available
- custom local agent

## Prompt/Workflow System

Prompts should live in the repo as versioned templates.

Suggested structure:

```txt
packages/prompts/
  structured-change/
    01-questions.md
    02-research.md
    03-design.md
    04-structure.md
    05-plan.md
    06-implement-slice.md
    07-review.md

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

Each prompt should specify:

- phase goal
- allowed actions
- prohibited actions
- required inputs
- required output artifact
- stop condition

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

Implement:

- Implement one approved vertical slice only.
- Do not refactor unrelated code.
- Run validation.
- Update implementation log.

Review:

- Review diff against plan.
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
- stream output into task activity log

Packaging:

- Electron builder or Electron Forge
- Auto-update later

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
  ui/
    components/
    styles/

  workflow/
    types.ts
    phase-machine.ts
    workflow-definitions.ts
    auto-select-workflow.ts

  prompts/
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
    detect-capabilities.ts
    cleanup-workspace.ts

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
- phase_runs
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
      06-implementation-log.md
      07-review.md
```

Alternative global app storage can be added later for users who do not want metadata inside their
repos.

## Workspace Strategy

MVP:

- Current workspace for quick fixes.
- Git worktree for structured changes.

Default:

- Quick Fix → current branch unless repo has uncommitted changes.
- Structured Change → git worktree.
- Investigation → git worktree.
- PR Review → existing branch or selected diff.

Future:

- CoW worktrees where available.
- On macOS, explore APFS clonefile / `cp -c`.
- On Linux, explore reflink-based copy with supporting filesystems.
- Fall back safely to normal git worktree.

The user-facing UI should say:

```txt
Workspace: Isolated
Storage: Optimized when available
```

Do not expose low-level mechanics by default.

## OpenCode Phase Execution

Each phase run should:

1. Load task metadata.
2. Load required prior artifacts.
3. Render the phase prompt template.
4. Send prompt to OpenCode with the correct agent/mode.
5. Stream activity into the Circuit UI.
6. Wait for completion.
7. Read expected artifact.
8. Update phase state.
9. Ask for approval or auto-advance if safe.

Phase permission defaults:

Questions:

- read-only
- no code edits

Research:

- read-only
- no code edits

Design:

- read-only
- no code edits

Structure:

- read-only
- no code edits

Plan:

- read-only
- no code edits

Implement:

- file edits allowed
- terminal commands allowed
- destructive commands require approval

Review:

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
- Pause only before Implementation and final PR.

Default should be Balanced.

## MVP UI Components

Required:

- Repo selector
- Task list
- New task launcher
- Phase rail
- Artifact tree
- Artifact markdown editor
- Markdown preview
- Agent activity panel
- Scoped feedback box
- Approval buttons
- Changed files list
- Diff viewer
- Validation output panel
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

## MVP Button Labels

Avoid generic labels like “Send” or “Run.”

Use phase-aware actions:

- Start task
- Generate questions
- Approve questions
- Run research
- Approve research
- Revise design
- Approve design
- Generate structure
- Approve structure
- Generate plan
- Unlock implementation
- Implement next slice
- Run validation
- Review diff
- Approve slice
- Request changes
- Prepare PR summary

## Naming and Brand Direction

Working name:

- Circuit

Positioning:

- Structured agent workspaces for safer code changes.
- A local-first control plane for AI coding agents.
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

## Open Source Strategy

Circuit should likely be open source, at least for the local desktop/core version.

Recommended model:

- Open-source local desktop app and workflow engine.
- Keep hosted/team features for later commercial offering.

Open-source:

- desktop app
- workflow engine
- OpenCode adapter
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

Use existing primitives wherever possible.

## First Build Milestones

### Milestone 1: Local shell

- Electron app opens.
- Add local repo.
- Persist repo in SQLite.
- Show task dashboard.
- Create task with description.
- Generate name, slug, branch name.
- Write `.Circuit/tasks/<slug>/00-ticket.md`.

### Milestone 2: Workflow state

- Implement Structured Change workflow.
- Show phase rail.
- Store phase state in SQLite.
- Show artifact tree.
- Create empty artifact files for phases.

### Milestone 3: Mock agent runs

- Build mock agent adapter.
- Simulate Questions/Research/Design outputs.
- Render artifacts in editor/preview.
- Approve/revise phase.
- Auto-advance according to Balanced mode.

### Milestone 4: OpenCode integration

- Start/connect to OpenCode server.
- Send Questions phase prompt.
- Stream transcript/activity.
- Write/read generated artifact.
- Repeat for Research and Design.

### Milestone 5: Workspaces

- Create git worktree for structured tasks.
- Show branch/workspace path.
- Open workspace in Cursor.
- Remove/cleanup workspace.

### Milestone 6: Implementation slice

- Generate plan artifact.
- Parse implementation slices from plan.
- Run implement-slice prompt through OpenCode.
- Capture changed files.
- Show git status and diff.

### Milestone 7: Diff review and validation

- Render diff viewer.
- Run validation command.
- Show command output.
- Approve/request changes for slice.
- Update implementation log.

### Milestone 8: Final review

- Generate `07-review.md`.
- Generate PR summary.
- Copy PR summary.
- Optional commit creation.

## Cursor Build Instructions

When building this project in Cursor:

1. Start with the Electron + React + Vite+ project setup.
2. Do not implement OpenCode integration first.
3. Build the local data model, task UI, and mock adapter first.
4. Use mock agent output to validate the UX.
5. Add real OpenCode integration only after the phase/artifact loop works.
6. Avoid building a full IDE.
7. Keep code modular around packages:
   - workflow
   - agent-adapters
   - workspace-manager
   - git
   - db
   - ui

8. Treat workflow state as the core product.
9. Keep artifacts as markdown files on disk.
10. Every major feature should be testable without a real coding agent.

## Initial Success Criteria

The MVP is successful if a developer can:

1. Add a local repo.
2. Start a task from one prompt.
3. Watch Circuit produce Questions, Research, Design, Structure, and Plan artifacts.
4. Approve or revise those artifacts.
5. Let an agent implement one slice in an isolated worktree.
6. Review the diff.
7. Run validation.
8. Generate a clean final review/PR summary.
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

That is the product north star.

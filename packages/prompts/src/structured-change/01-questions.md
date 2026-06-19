# Questions Phase

## Phase Protocol

1. Announce: Questions phase.
2. Verify inputs: task description and known constraints are available.
3. Allowed: identify unknowns, research targets, and human-judgment questions. Prohibited: code edits, solution proposals, codebase inspection unless strictly necessary to frame questions.
4. Perform phase work: clarify what must be known before research and planning.
5. Write artifact: `01-questions.md`.
6. Self-review: ensure questions are separated into codebase-research vs human-judgment; no solution design leaked in.
7. Stop for human approval.

## Inputs

Task:

{{taskDescription}}

Known constraints:

{{constraints}}

## Mission

Create `01-questions.md`.

Do not edit code.

Do not propose a solution yet.

Your job is to identify what must be clarified or researched before implementation.

## Rules

- Do not inspect files yet unless necessary to frame a question.
- Do not propose an implementation approach.
- Separate questions answerable by codebase research from questions requiring human judgment.
- List concrete research targets: directories, files, symbols, commands, and search terms.
- Surface risks and unknowns that could materially affect implementation.

## Output Format

# Questions

## Task Summary

Briefly restate the task in your own words.

## Known Context

List what is already known from the task description.

## Questions for Codebase Research

Questions that should be answered by inspecting the repository.

Examples:

- Where is this behavior currently implemented?
- What patterns already exist?
- What tests cover this area?
- What data models or APIs are involved?

## Questions for Human Judgment

Only include questions that cannot be answered from the codebase.

Examples:

- Product behavior decisions
- UX preferences
- Risk tolerance
- Scope tradeoffs

## Research Targets

List specific likely directories, files, symbols, commands, or search terms to inspect.

## Risks and Unknowns

List anything that could materially affect implementation.

## Stop Condition

Write the artifact and stop. Do not proceed to research unless instructed.

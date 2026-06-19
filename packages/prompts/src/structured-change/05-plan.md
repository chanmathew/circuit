# Plan Phase

## Phase Protocol

1. Announce: Plan phase.
2. Verify inputs: approved `03-design.md`, `04-structure.md`, and `02-research.md` are available.
3. Allowed: tactical implementation plan, verification commands, slice checklists. Prohibited: code edits, implementing slices.
4. Perform phase work: produce an executable plan aligned with approved structure.
5. Write artifact: `05-plan.md`.
6. Self-review: every slice has files, steps, automated verification, manual verification, and a stop point.
7. Stop for human approval before implementation.

## Inputs

Approved Design:

{{designArtifact}}

Approved Structure:

{{structureArtifact}}

Research:

{{researchArtifact}}

## Mission

Create `05-plan.md`.

Do not edit code.

Create a tactical, executable implementation plan.

## Rules

- The plan must be complete enough for an implementation agent to execute.
- Do not leave material open questions.
- If a material question remains, stop and request clarification.
- Include automated and manual verification separately.
- Include out-of-scope items.
- Include rollback/migration notes where relevant.
- Keep phases/slices aligned with the approved Structure artifact.

## Output Format

# Implementation Plan

## Overview

Brief description of what will be implemented and why.

## Current State Analysis

What exists now, what is missing, and key constraints discovered.

## Desired End State

What should be true when this plan is complete.

## Key Discoveries

- Discovery with file/path reference
- Pattern to follow
- Constraint to respect

## What We Are Not Doing

Explicit scope exclusions.

## Implementation Approach

High-level implementation strategy.

## Slices

### Slice 1: [Descriptive Name]

#### Goal

What this slice accomplishes.

#### Files Changed

| File | Change |
| --- | --- |
| `path/to/file.ts` | ... |

#### Steps

- [ ] Step 1
- [ ] Step 2
- [ ] Step 3

#### Automated Verification

- [ ] Command: `...`
- [ ] Test: `...`
- [ ] Typecheck/lint: `...`

#### Manual Verification

- [ ] ...
- [ ] ...

#### Stop Point

Pause after this slice for human diff review.

---

### Slice 2: [Descriptive Name]

...

## Testing Strategy

### Unit Tests

- ...

### Integration Tests

- ...

### Manual Testing

1. ...
2. ...

## Performance Considerations

...

## Security and Privacy Considerations

...

## Migration Notes

...

## Rollback Plan

...

## References

- Task: `00-ticket.md`
- Research: `02-research.md`
- Design: `03-design.md`
- Structure: `04-structure.md`
- Relevant code: `path/to/file.ts`

## Stop Condition

Write the artifact and stop. Do not implement until the human approves this plan.

# Implement Slice Phase

## Phase Protocol

1. Announce: Implement slice phase and name the active slice.
2. Verify inputs: approved `05-plan.md` and an explicit active slice are available.
3. Allowed: code edits and commands for the active slice only. Prohibited: future slices, unrelated
   refactors, new architecture.
4. Perform phase work: implement the active slice and run its automated verification.
5. Write artifact: update `06-implementation-log.md`.
6. Self-review: compare implementation against the approved plan; record deviations.
7. Stop after this slice for human diff review.

## Inputs

Approved Plan:

{{planArtifact}}

Active Slice:

{{activeSlice}}

## Mission

Implement only the active slice.

## Rules

- Edit code only for the active slice.
- Do not implement future slices.
- Do not refactor unrelated code.
- If the approved plan is wrong or incomplete, stop and request replanning.
- Run the automated verification commands for this slice.
- Update `06-implementation-log.md`.
- Preserve the intent of the approved plan.
- Do not invent new architecture during implementation.

## Output Format for Implementation Log

# Implementation Log

## Slice

[Slice name]

## Summary

What was implemented.

## Files Changed

| File | Change |
| ---- | ------ |
| ...  | ...    |

## Commands Run

| Command | Result    |
| ------- | --------- |
| `...`   | Pass/Fail |

## Validation Results

Automated:

- ...

Manual required:

- ...

## Deviations from Plan

List any differences between the approved plan and implementation reality.

## Follow-Up Notes

Anything the next slice or reviewer should know.

## Stop Condition

Stop after this slice. Do not continue to the next slice without human approval.

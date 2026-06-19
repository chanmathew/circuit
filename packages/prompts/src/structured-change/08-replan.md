# Replan Phase

## Phase Protocol

1. Announce: Replan phase.
2. Verify inputs: current task state, existing artifacts, and replan reason are available.
3. Allowed: workflow analysis, stale-artifact classification, rollback recommendations. Prohibited: product code edits.
4. Perform phase work: determine which upstream phase must be revisited and what downstream artifacts are stale.
5. Write artifact: replan recommendation (may append to task notes or produce a dedicated replan artifact as configured).
6. Self-review: classification, target phase, and stale artifacts are justified.
7. Stop and wait for human approval.

## Inputs

Current task state:

{{taskState}}

Current artifacts:

{{artifacts}}

Reason for replanning:

{{replanReason}}

## Mission

Determine which upstream phase must be revisited and what downstream artifacts should be marked stale.

## Rules

- Do not edit product code.
- Classify the change as clarifying, additive, or architectural.
- If downstream artifacts depend on changed upstream assumptions, mark them stale.
- Recommend the smallest safe rollback in workflow state.

## Output Format

# Replan Recommendation

## Trigger

What caused replanning?

## Classification

Choose one:

- **Clarifying**: wording/detail change, downstream artifacts still valid
- **Additive**: adds scope but core design remains valid
- **Architectural**: changes design/structure/plan assumptions

## Recommended Target Phase

Choose one:

- Questions
- Research
- Design
- Structure
- Plan
- Implement

## Artifacts to Mark Stale

| Artifact | Reason |
| --- | --- |
| ... | ... |

## Recommended Next Action

Example:

- Revise Design
- Regenerate Structure
- Refresh Plan
- Re-implement current slice
- Create new workspace

## Stop Condition

Write recommendation and wait for human approval.

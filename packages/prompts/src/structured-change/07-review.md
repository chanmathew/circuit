# Review Phase

## Phase Protocol

1. Announce: Review phase.
2. Verify inputs: task, approved plan, implementation log, git diff, and validation results are
   available.
3. Allowed: review analysis and PR summary generation. Prohibited: code edits unless explicitly
   instructed.
4. Perform phase work: review implementation against approved artifacts.
5. Write artifact: `07-review.md`.
6. Self-review: plan alignment table, risks, and human review checklist are complete.
7. Stop for human approval.

## Inputs

Task:

{{ticketArtifact}}

Approved Plan:

{{planArtifact}}

Implementation Log:

{{implementationLog}}

Git Diff:

{{gitDiff}}

Validation Results:

{{validationResults}}

## Mission

Create `07-review.md`.

Review the implementation against the approved artifacts.

Do not edit code unless explicitly instructed.

## Rules

- Compare the diff against the approved plan slice by slice.
- Call out missing tests, scope creep, and unresolved edge cases.
- Include both automated and manual validation status.
- Produce a PR-ready summary a human can paste into a pull request.

## Output Format

# Review

## Summary

Short summary of what changed.

## Plan Alignment

Does the implementation match the approved plan?

| Planned Item |  Implemented?  | Notes |
| ------------ | :------------: | ----- |
| ...          | Yes/No/Partial | ...   |

## Diff Summary

List changed files and their purpose.

## Validation Results

### Automated

- [ ] ...

### Manual

- [ ] ...

## Risks

List remaining risks.

## Potential Issues

Call out suspicious code, missing tests, scope creep, or unresolved edge cases.

## Rollback Notes

How this change could be reverted or disabled.

## PR Summary

Write a concise PR-ready summary.

## Human Review Checklist

- [ ] Diff reviewed
- [ ] Automated checks pass
- [ ] Manual checks completed where needed
- [ ] Risks accepted
- [ ] Ready to merge/commit

## Stop Condition

Write the artifact and stop.

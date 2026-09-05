---
name: merge-close-linked-issues
description: Merge a GitHub pull request or MR, close its explicitly linked issues, and mark them Done in the configured project. Use whenever the user asks to merge a PR/MR in this repository.
---

# Merge, close, and complete linked issues

Treat the merge, issue state, and project status as one completion gate when an
issue is explicitly associated with the requested PR/MR.

1. Identify the requested PR/MR and inspect its body and GitHub links for
   explicitly linked issues. Do not ask for an issue number when none is
   present. Follow the [issue tracker configuration](../../../docs/agents/issue-tracker.md)
   when reading or updating issues.
2. Merge only after the repository's required checks and requested review
   state are satisfied.
3. After the merge succeeds, read the state of every explicitly linked issue.
   If one remains open, close it with a short comment pointing to the merged
   PR, unless the PR or issue says the work is intentionally incomplete.
4. Read the current project and field configuration named by the issue tracker.
   Ensure every applicable linked issue has an item in that project, set its
   workflow status to `Done`, and read the item again to verify the result.
5. Report the merged PR plus the final issue state and project status of every
   linked issue. The workflow is complete only after every applicable issue is
   confirmed closed and `Done`, or an explicit reason for leaving either state
   incomplete is reported.

Never close an issue that is only mentioned as background, a duplicate, or a
follow-up. If the relationship is ambiguous, report it and ask whether that
specific issue should be closed.

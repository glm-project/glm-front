---
name: merge-close-linked-issues
description: Merge a GitHub pull request or MR and verify that its explicitly linked issue is closed. Use whenever the user asks to merge a PR/MR in this repository.
---

# Merge and close linked issues

Treat the merge and the issue state as one completion gate when an issue is
explicitly associated with the requested PR/MR.

1. Identify the requested PR/MR and inspect its body and GitHub links for
   explicitly linked issues. Do not ask for an issue number when none is
   present; this repository does not use an issue tracker as a general rule.
2. Merge only after the repository's required checks and requested review
   state are satisfied.
3. After the merge succeeds, read the state of every explicitly linked issue.
   If one remains open, close it with a short comment pointing to the merged
   PR, unless the PR or issue says the work is intentionally incomplete.
4. Report the merged PR and the final state of each linked issue. The workflow
   is complete only after every applicable issue is confirmed closed, or an
   explicit reason for leaving it open is reported.

Never close an issue that is only mentioned as background, a duplicate, or a
follow-up. If the relationship is ambiguous, report it and ask whether that
specific issue should be closed.

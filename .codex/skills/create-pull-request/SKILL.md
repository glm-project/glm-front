---
name: create-pull-request
description: Create a GitHub pull request or MR in this repository and link the issue it delivers for automatic closure. Use whenever the user asks to open or create a PR/MR.
---

# Create a pull request

When the PR/MR delivers an explicitly identified GitHub issue, add one GitHub
closing reference in its description: `Fixes #123`, `Closes #123`, or
`Resolves #123`. This lets GitHub close the issue when the PR is merged into
the default branch.

Use a closing reference only for the issue whose work is actually delivered by
this PR. Do not request an issue number when none is part of the task. Follow the
[issue tracker configuration](../../../docs/agents/issue-tracker.md) for tracker operations.
Keep contextual, duplicate, and follow-up issues out of closing references.

After creating the PR/MR, confirm that the description contains the closing
reference and report the PR URL and the linked issue. If no issue applies,
report that the PR has no linked issue.

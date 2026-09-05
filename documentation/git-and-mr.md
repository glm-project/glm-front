# Git and MR

Trunk-based: short-lived branches off `main`, named `type/short-description` (e.g.
`feat/add-perimeter-panel`, `docs/restructure-documentation`).

Conventional Commits, scope optional and naming the affected area: `docs(documentation): link documentation
from README`. Issues live in GitHub and are organized on Backlog GLM; follow the
[issue tracker configuration](../docs/agents/issue-tracker.md). Keep scopes descriptive and use an issue
reference only when the task identifies a relevant issue; do not require an issue number for every change.

**Structural and behavioral changes never share a commit.** A rename, an extraction, a file move is
`refactor:` or `chore:`, goes first, and leaves the tests green before and after — the existing tests are the
net, no new test. What changes behavior is `feat:` or `fix:`, comes after, and carries its test. A task
needing both produces two commits, in that order.

A refactoring that **creates** a file brings that file's spec with it, in the same commit: the 100 % per-file
bar leaves no other option, and a commit that is not green is not a commit. That is the one exception to "no
new test" above, and it is bounded — the spec asserts the contract the extraction just gave the file, never
a behaviour the change introduced.

**MR descriptions fit in a few bullets**: one sentence of context, one bullet per change (`file:line` plus
the behavior), one bullet for what is still to be decided, one verification line. The detail lives in the
commit messages and in the diff.

Husky + lint-staged run `eslint --fix` and `prettier --write` on staged files. Do not bypass them with
`--no-verify`.

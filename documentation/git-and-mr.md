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

A refactoring that **creates** a file keeps 100 % coverage for that file in the same commit. Existing
scenarios through its owner's public entry point can provide that coverage. Move or adapt their wiring
with the extraction while preserving their expected results. Add a dedicated spec only when a distinct
observable contract needs one, following [testing.md](testing.md); an extraction alone does not require a
new test. A commit that is not green is not a commit.

**MR descriptions fit in a few bullets**: one sentence of context, one bullet per change (`file:line` plus
the behavior), one bullet for what is still to be decided, one verification line. The detail lives in the
commit messages and in the diff.

Husky + lint-staged run `eslint --fix` and `prettier --write` on staged files. Do not bypass them with
`--no-verify`.

# Git and MR

Trunk-based: short-lived branches off `main`, named `type/jira-ref-short-description` (e.g.
`feat/d1cainca-123-add-perimeter-panel`).

Conventional Commits with the Jira key as scope: `feat(D1CAINCA-123): add user authentication endpoint`. Ask
for the key if you do not have it.

**MR descriptions fit in a few bullets**: one sentence of context, one bullet per change (`file:line` plus
the behavior), one bullet for what is still to be decided, one verification line. The detail lives in the
commit messages and in the diff.

Husky + lint-staged run `eslint --fix` and `prettier --write` on staged files. Do not bypass them with
`--no-verify`.

---

New rules on this topic go here.

# ESLint rules

Custom ESLint rules that enforce this repository's architecture and style conventions, plus their specs.

## Read a rule's source only when necessary

`npm run lint` already names the rule that fired, and `documentation/code-style.md` and
`documentation/testing.md` carry the intent behind these rules. That is enough to fix a violation. Open a
rule's `.mjs` source only to fix the rule itself, extend it, or diagnose a false positive the lint message
and documentation do not explain.

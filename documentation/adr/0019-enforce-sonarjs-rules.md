# 0019 — Enforce SonarJS rules through ESLint

## Status

Accepted.

## Context

The extract-method rule in ADR 0008 deliberately rejects line count as a substitute for design judgment.
ESLint's cyclomatic complexity treats sequential and nested branches alike and counts TypeScript conveniences
such as optional chaining, so it does not reliably identify control flow that is difficult to understand.
SonarJS cognitive complexity weights nesting and changes in control flow. Its recommended ESLint configuration
also detects suspicious asynchronous, conditional, collection and regular-expression code through the lint gate
the repository already runs.

A dry run of SonarJS 4.2.0 enabled 279 rules and reported 20 findings from six rules. Cognitive complexity did
not exceed 7. The run exposed a Promise used inside a synchronous `try` and an implicit asynchronous operation
in a test-fixture constructor. Three type-aware rules also reported false positives on values already narrowed by
TypeScript or deliberately returned as discriminated unions.

## Considered options

- Enable the SonarJS recommended configuration with narrow exclusions — **kept**: it adds broad bug detection
  while the measured migration remains small.
- Enable only cognitive complexity — rejected: installing the dependency for one rule leaves useful, currently
  clean checks unused.
- Keep ESLint core complexity — rejected: its scoring penalizes optional chaining without accounting for nesting.
- Enable every recommended rule without exclusions — rejected: known false positives would force misleading
  rewrites or suppressions at each call site.

## Decision

Pin `eslint-plugin-sonarjs` and apply its recommended configuration to every TypeScript source. Override
`sonarjs/cognitive-complexity` with a maximum of 7: the current maximum remains accepted and any increase must
be redesigned before merging.

Keep `sonarjs/function-return-type` disabled because domain decisions intentionally return discriminated union
members. Keep `sonarjs/null-dereference` and `sonarjs/argument-type` disabled because their measured findings
contradict TypeScript's strict narrowing or generic types. Treat these exclusions as part of the decision; a
future plugin upgrade may revisit them with a fresh dry run.

Keep `sonarjs/prefer-specific-assertions` disabled only for Cypress suites: the Chai property assertions it
requires are rejected by the type-aware `no-unused-expressions` rule, while Cypress's callable assertions retain
the same semantics without weakening that TypeScript rule.

Fix findings from the remaining recommended rules rather than weakening the preset. A cognitive-complexity
failure is a review gate, not an automatic instruction to extract a method: reshape the decisions and levels of
abstraction in the smallest behavior-preserving way.

## Consequences

### Positive

- Nested and branching workflows fail locally before they grow beyond the repository's current complexity.
- ESLint gains additional bug and code-smell checks without another validation service.
- The exact dependency version keeps changes to the recommended preset explicit.

### Negative

- Lint installs and executes a larger analyzer and therefore consumes more dependency and validation time.
- The broad preset can introduce findings unrelated to the code being changed after an intentional upgrade.
- Three disabled type-aware rules must be reconsidered rather than assumed useful when SonarJS changes.
- Cognitive complexity remains a proxy and cannot prove that an extraction exposes intent.

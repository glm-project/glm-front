# 0020 — Keep pre-push feedback quick

## Status

Amended by [ADR 0024](0024-extend-mutation-to-the-unit-tested-project.md).

## Context

ADR 0017 introduced the complete validation graph at both pre-push and Codex Stop. The graph runs security
reports, coverage, two production builds, component tests, application tests and the production offline restart.
It took about one minute for a small lint-policy branch and then the CI repeated the same checks in isolated
jobs. This makes an ordinary push wait for comprehensive evidence that the remote pipeline and Codex completion
gate already provide.

The commit hook already limits itself to staged secret detection, ESLint fixes and Prettier. The existing
`validate:quick` group checks the pinned runtime and API contract, then runs lint, Prettier, TypeScript and
workflow validation without executing the test suites or builds.

## Considered options

- Run `validate:quick` at pre-push — **kept**: it catches deterministic static failures without duplicating the
  expensive evidence gates.
- Keep `validate:complete` at pre-push — rejected: it serializes every push behind checks immediately repeated
  by CI.
- Remove pre-push validation — rejected: pushing known lint, format, type or generated-contract failures wastes
  CI feedback.
- Run only ESLint and Prettier at pre-push — rejected: that duplicates the commit gate while omitting the cheap
  type, runtime, contract and workflow checks already grouped by `validate:quick`.

## Decision

Run `validate:quick` from the pre-push hook and record its duration through the existing measurement command.
Keep staged secret detection, ESLint fixes and Prettier at commit. Keep `validate:complete` at Codex Stop and
retain its equivalent checks across the CI jobs.

This amends ADR 0017 only for the pre-push gate. The validation commands remain composed in `package.json` and
the hooks continue to name those groups instead of duplicating command lists.

## Consequences

### Positive

- A push receives fast feedback on lint, formatting, types, generated contracts and workflow syntax.
- Coverage, builds and browser suites are no longer executed twice in the normal local-to-CI path.
- Codex still produces complete local evidence before handing work back.

### Negative

- A person pushing outside a trusted Codex task can discover test, build or audit failures only in CI.
- The quick hook still performs more work than the commit hook and can require API-generation access.
- Complete local validation remains an explicit developer action when CI evidence is not sufficient.

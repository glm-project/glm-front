# 0022 — Keep conventions contextual and enforceable

## Status

Accepted. Amends [ADR 0008](0008-extract-methods-to-expose-intent.md).

## Context

The repository turned several readability defaults into absolute rules: no comments, a named helper for every
test step, and no Angular effects anywhere. These rules made some small, clear code more ceremonial while the
lint could not determine whether a comment, helper or effect served its intended purpose. The existing effect
ban also had no narrow route for an imperative browser integration in a presentation adapter.

## Considered options

- Keep the defaults as contextual review rules and enforce only their observable boundaries — **kept**.
- Preserve the universal form rules — rejected: they require indirection even when it adds no intent.
- Remove the linting around test plumbing and Angular effects — rejected: technical detail and state
  orchestration would again spread without an executable boundary.

## Decision

Use comments for non-obvious constraints or trade-offs, not narration. Extract a method or test helper when it
adds a meaningful name or hides technical plumbing; keep a direct public action and assertion in a short test
readable. Continue to extract a workflow whose details obscure its caller, as ADR 0008 requires.

Keep Angular effects out of business orchestration and application-state propagation. Permit their named static
imports only under `infrastructure/primary/` for a narrow imperative presentation integration with explicit
lifetime and cleanup. Keep front and shared-kernel import boundaries plus namespace and dynamic Angular-import
guards active there. Lint proves that syntactic scope, not that an individual integration is justified.

## Consequences

### Positive

- Tests and production code retain direct expressions when a wrapper would only rename them.
- Presentation adapters have an explicit escape hatch without weakening architectural import boundaries.
- Executable rules state exactly what automation can prove.

### Negative

- Reviewers must judge whether a comment, helper or effect has earned its presence.
- A primary adapter can misuse the permitted effect imports; the lint scope limits location but cannot infer
  business intent or cleanup quality.

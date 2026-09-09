# 0030 — Shape scenarios at lint

## Status

Accepted. Amends [ADR 0022](0022-keep-conventions-contextual-and-enforceable.md).

## Context

`local/given-when-then` keeps technical plumbing out of a scenario but says nothing about its shape. Two
shapes crossed review unnoticed. A scenario that branches hides an assertion behind a condition, and an
assertion that does not execute still reads green; the same branch also states a type narrowing twice, once
as an assertion and once as a condition. A scenario that resumes after its assertions tells two stories, so
a failure names neither of them.

Both shapes were measured on the whole repository: 9 branching scenarios, and 100 scenarios acting after
their first assertion — 9 of them in the domain, the rest mostly in Cypress journeys where alternating acts
and observations is the narrative being written.

## Considered options

- Extend the local rules with a syntactic shape check, scoped per folder — **kept**.
- Add `eslint-plugin-jest` or `@vitest/eslint-plugin` for `no-conditional-expect` — rejected: a new
  dependency and its ADR for one check, when the local rule already reads a scenario.
- Rely on `sonarjs/assertions-in-tests`, already enabled — rejected: it requires an assertion to be present,
  not to be reachable.
- Leave both to review — rejected: review had already accepted them.

## Decision

Enforce the shape through `local/scenario-shape`.

Refuse any `if`, loop, `switch` or `try` in the body of an `it` or `test`, on every spec. A union is narrowed
by a helper that returns the narrowed value or throws; cases are a table through `it.each`; a teardown that
must run whatever happens belongs to the fixture, not around the assertions.

Refuse an act after the first assertion where the `order` option is set, and set it on
`src/main/webapp/**/domain/**/*.spec.ts`. A scenario that acts again after concluding is two scenarios.
Widening the option to the other layers is a later decision, not a pending obligation.

Neither check judges what an assertion targets. That a scenario asserts an observable business result rather
than an intermediate structure stays a review question, stated in [testing.md](../testing.md).

## Consequences

### Positive

- An assertion under a condition, and the false green it can produce, is refused before review.
- The narrowing helper is written once per spec instead of being restated at each scenario.
- A failing scenario names one rule.

### Negative

- A guard clause that throws is refused as well, although it never produced a false green; uniformity is
  paid with one helper.
- The `order` check is on for one folder only, so the same defect stays legal in the application,
  infrastructure and Cypress specs until each is cleaned.
- Splitting a scenario duplicates its arrangement, which lengthens some specs.
- Syntax cannot see that two scenarios state the same rule, nor that an assertion targets an internal
  mechanism; both remain review concerns.

# 0030 — Shape scenarios at lint

## Status

Accepted. Extended during MR5 (#141) to component scenarios and observation helpers. Amends [ADR 0022](0022-keep-conventions-contextual-and-enforceable.md).

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

Refuse an act after the first assertion where the `order` option is set. Apply it to domain specs,
primary adapters, front shells and headers, and Cypress component specs. A scenario that acts again after
concluding is split while preserving each observation and its required arrangement. Application journeys
explicitly retain alternating actions and observations; application coordinators and secondary port
contracts keep their existing order policy.

The MR5 review exposed two other gaps: DOM assertions embedded selector plumbing in scenarios, and a
`then…` helper moved focus before checking it. Extend `local/given-when-then` to recognize DOM access,
including callbacks, and to reject known gestures, clock changes and calls to `given…`/`when…` inside
`then…`. An action deferred in an `expect` callback remains valid for exception assertions. Test both
rejection and acceptance, and exercise the order rule through the actual repository configuration.

Keep direct public calls and simple assertions legal. The goal is a readable separation of responsibilities,
not mandatory wrappers around every statement. [Testing](../testing.md) owns the per-cycle writing check.

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
- The order policy remains scoped: application journeys deliberately allow several action/observation
  pairs, and coordinators and secondary contracts are not migrated by this decision.
- Gesture and DOM checks recognize known syntax and names; arbitrary indirect calls and semantic
  misclassification of helpers remain review concerns.
- Splitting a scenario duplicates its arrangement, which lengthens some specs.
- Syntax cannot see that two scenarios state the same rule, nor that an assertion targets an internal
  mechanism; both remain review concerns.

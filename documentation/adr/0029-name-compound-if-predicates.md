# 0029 — Name compound if predicates

## Status

Accepted. Amends [ADR 0022](0022-keep-conventions-contextual-and-enforceable.md).

## Context

Contextual extraction guidance and the cognitive-complexity ceiling do not set a deterministic limit on the
number of criteria assembled at an `if`. A short condition can still bury a business decision in its caller.

## Considered options

- Enforce the syntactic limit with a local ESLint rule and review predicate ownership — **kept**.
- Rely only on cognitive complexity and review — rejected: neither guarantees the requested per-condition limit.
- Automatically extract a local helper — rejected: syntax cannot choose the domain owner or preserve TypeScript
  narrowing and deferred evaluation safely in every case.

## Decision

Apply the compound-condition policy in [code style](../code-style.md#code-carries-its-own-intent) through
`local/max-if-criteria`. Report JavaScript and TypeScript `if` conditions containing any `&&` or
`||` operator, regardless of parentheses or expression wrappers, without traversing nested function or class
bodies. Keep the threshold fixed and provide no autofix: the author chooses a meaningful predicate and its owner.

## Consequences

### Positive

- Lint enforces the same limit in application code, tests and JavaScript tooling.
- Extracted decisions can expose their intent and live with their domain responsibility.

### Negative

- Even a familiar two-criterion condition requires an additional named predicate.
- Static analysis cannot prove that the chosen name, owner or extraction preserves behavior; review and
  existing behavioral tests remain necessary.
- The check covers `if` statements, not every conditional construct or Angular template expression.

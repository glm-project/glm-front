# 0021 — Own immutable domain contracts

## Status

Accepted. Amends [ADR 0013](0013-keep-business-decisions-in-rich-domain-models.md).

## Context

ADR 0013 correctly put stateful business transitions with their domain owner, but its wording could be read
as requiring every rule to become a method on a class. That conflicts with a policy such as gesture replay or
a projection that is naturally a pure function over a public union. The journal also exposed mutable arrays
through an operator-window snapshot, and its event type allowed an accepted event to retain a refusal field.

## Considered options

- Give each domain rule an explicit owner, using stateful models for invariants and pure functions for policies
  and projections — **kept**.
- Require every decision to be a method on a rich class — rejected: it hides simple pure policies behind
  artificial state.
- Keep mutable journal documents as public snapshots — rejected: callers can bypass the window's invariants.

## Decision

Give every business rule a domain owner. Use a class when state and invariants belong together. Use a pure
function when a policy or projection owns an exhaustive rule over its input. A discriminated union is a valid
public contract for such a function.

Expose domain commands, decisions and snapshots as immutable contracts, including their nested collections.
`snapshot()` states whether it returns an independent copy or shares an immutable value; the operator-window
snapshot returns a copy. Represent mutually exclusive event states with discriminated unions; use `never` for
a field prohibited by a variant. Reconstruct an event result from its target state rather than spreading an
earlier state into it.

Every domain model is immutable: a transition constructs and returns its next version without modifying `this`.
The application replaces its current reference with that returned version. A local collection may be mutable while
constructing a result, but it neither mutates an input nor escapes as a mutable domain contract.

When a business collection owns rules or queries, encapsulate it in an immutable named value object. Its
methods decide from the collection rather than making callers reconstruct `length`, membership or ordering
rules. Transport documents and display projections may retain readonly arrays when no business responsibility
belongs to the collection itself.

ESLint requires `readonly` on property signatures (including nested object types and index signatures), class
properties and constructor parameter-properties for every visibility in production `domain/**/*.ts`. It does not
inspect test doubles or fixtures. Setters and auto-accessors are rejected because a transition returns a new
state instead. The check is syntactic: aliases, inferred types and mapped types remain outside it, and it cannot
decide whether a readonly collection needs a value object. `readonly` does not provide a full deep freeze; use
readonly collections and readonly nested property signatures where a public contract needs them, and keep a runtime
copy when a snapshot must be independent.

## Consequences

### Positive

- A caller cannot mutate a typed snapshot or represent an accepted event with a carried refusal.
- Policies and projections stay direct, testable functions without weakening ownership of their rules.
- An asynchronous application step applies its result to the latest version for the same stable opening identity;
  earlier model versions remain reliable inputs for work that already began.

### Negative

- Snapshots allocate copies and adapter translations must construct immutable values rather than fill objects
  incrementally.
- TypeScript immutability does not stop untyped JavaScript, so the snapshot copy remains part of the runtime
  contract and needs behavioral tests.

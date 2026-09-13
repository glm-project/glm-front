# 0032 — Limit constructor parameters

## Status

Accepted by the project owner during the MR2 review corrections for ticket #60.

## Context

Long positional constructor calls obscure the role of their arguments and let values with the same primitive
representation be swapped without a compiler error.

## Decision

Limit constructors to three parameters. Group additional construction data in a named immutable contract or
cohesive Value Objects. Optional and defaulted parameters count toward the limit; rest parameters and opaque
arrays must not conceal additional positional arguments. Ordinary functions and methods keep their existing rules.

The operational convention lives in [Code style](../code-style.md). The limit applies to all handwritten constructors.

## Consequences

Construction names its data explicitly when more than three inputs are needed. This adds small contracts but
preserves the responsibility and invariants of the receiving model without expanding the current change to
unrelated contexts.

# 0028 — Default to Value Objects for domain values

## Status

Accepted. Complements [ADR 0021](0021-own-immutable-domain-contracts.md).

## Context

The existing rules explicitly recommend Value Objects for business collections with rules or queries.
They leave the default for meaningful scalar and composite values implicit. During the review of
`AtelierCoordinator`, the project owner requested broader use of Value Objects as a basic modeling tool.

## Considered options

- Default to Value Objects wherever values carry domain meaning, including single-use concepts — **kept**.
- Wait for reuse or complex validation before introducing a Value Object — rejected: domain distinctions
  remain implicit and their operations accumulate in callers.
- Wrap every technical field mechanically — rejected: technical representation alone supplies no domain
  concept to own the value.

## Decision

Treat Value Objects as the default representation of meaningful domain values, including a single primitive,
a composite value or a business collection. A distinction in the ubiquitous language is sufficient reason;
reuse and complex behavior are not prerequisites. Follow the operational rules in
[Architecture](../architecture.md#use-value-objects-by-default-for-domain-values) for ownership, equality,
immutability and adapter translation.

Adopt this default while designing or refactoring the code in scope. It does not require a repository-wide
migration or change aggregate boundaries. Preserve behavior during structural extraction and keep any
functional correction in a separate commit under the existing Tidy First convention.

## Consequences

### Positive

- Domain distinctions become explicit even when their underlying primitives have the same representation.
- Validation, comparisons and collection queries have small domain owners instead of accumulating in
  coordinators or spreading across callers.

### Negative

- More domain types require navigation and explicit translation at adapter boundaries.
- Modeling still requires judgment: a domain name needs a precise meaning, and new constraints must come
  from the business rules rather than the choice to introduce a type.

# 0012 — Give each front ownership of its business contexts

## Status

Accepted.

## Context

`gestion` and `pupitre` are independently built applications with different users, authentication and lifecycles. Their business contexts previously lived under a common `app/` tree, which implied a shared domain and made application-specific technical adapters look reusable. A root glossary also gave identically spelled terms one cross-application definition.

## Considered options

- Put each business context below its owning front and keep only technical sharing under `shared/` — **kept**.
- Keep all contexts under `app/` — rejected: ownership and deployable boundaries remain implicit.
- Create a shared business kernel between the fronts — rejected: no cross-application business contract currently exists.

## Decision

Place gestion contexts under `gestion/contexts/` and pupitre contexts under `pupitre/contexts/`. Keep `app/` for genuinely common technical code and composition glue. Keep application-specific technical code under that application's `shared/` or composition root. Make every `shared/` tree exclusively technical.

The applications have no dependency or communication path between them. Contexts inside one application communicate through ports and adapters without importing a neighbouring domain directly.

Each bounded context owns an `AGENTS.md` containing its vocabulary, responsibilities, invariants and local rules. Its `CLAUDE.md` imports only `@AGENTS.md`. Do not create a root business glossary when no bounded context is identified.

## Consequences

### Positive

- Files reveal which application owns each business decision and adapter.
- Identical words may have independent local meanings without creating accidental contracts.
- Architecture tests can enforce application isolation and technical-only shared code.

### Negative

- Paths are longer and some technical abstractions have an application-specific copy or location.
- Repository tooling must scan several architecture roots instead of one `app/` tree.
- A future real integration between the applications requires an explicit external contract.

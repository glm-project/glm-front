# 0035 — Share a structural Result type for domain ports

## Status

Accepted. Complements [ADR 0006](0006-how-the-front-calls-the-back.md) and its publication amendment.

## Context

ADR 0006 established that secondary HTTP adapters translate REST responses into hand-written domain models,
and that business refusals reject promises with domain-specific errors. ADR 0006 initially rejected a
`Resultat<Refus, Succes>` across ports because the pupitre queued writes locally in an offline queue that
answered before the server responded. Later, the publication amendment in ADR 0006 recognized that when
communicating directly with the server (`AtelierExchangePort.send`), expected business refusals and
unexpected technical failures must be strictly distinguished, introducing `Result<void, RefusDePublication>`
locally in `pupitre/contexts/atelier/domain/synchronisation/Result.ts`.

In `gestion`, there is no offline queue: actions are synchronous user commands submitted directly to the
backend API. When creating, modifying or deleting a workstation, a 409 conflict (duplicate name or dependent
operators/clockings) is an expected business outcome, not an exceptional crash. Rejecting promises for expected
refusals forces call sites into untyped `catch (e: unknown)` blocks with manual `instanceof` narrowing, while
TypeScript cannot enforce handling of domain error branches at compile time. Furthermore, `gestion` cannot
import `pupitre/contexts/atelier/` due to architectural boundaries.

## Considered options

- Promote `Result<T, E>` to a common shared kernel in `app/shared/result/` — **kept**.
- Keep rejected promises for all ports in `gestion` — rejected: untyped catch blocks, no compiler exhaustiveness, and mixes expected business refusals with unexpected technical failures.
- Duplicate `Result<T, E>` locally in each business context — rejected: pure structural typing utility with zero dependencies that belongs in a shared kernel.

## Decision

Introduce a minimal, zero-dependency shared kernel in `src/main/webapp/app/shared/result/domain/Result.ts`
exposing the structural discriminated union `Result<T, E>` and its companion constructors `ok` and `err`:

```typescript
export type Result<T, E> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });
```

Domain ports performing interactive commands with expected business outcomes return `Promise<Result<T, E>>`.
The resolved `Result` carries domain success (`ok: true, value`) or expected domain refusals (`ok: false, error`),
which callers must explicitly inspect. Unexpected technical failures (network drops, 500 internal server errors,
401 unauthorized) continue to reject the promise.

## Consequences

### Positive

- TypeScript enforces exhaustive checking of business refusal branches before access to values.
- Expected business outcomes are clearly separated from unexpected technical failures.
- Coordinators and UI components handle business outcomes linearly without noisy `try / catch` statements.
- The shared kernel has zero dependencies and carries no framework logic.

### Negative

- Introducing a shared utility requires discipline to keep it strictly minimal: no monadic combinators,
  method chaining (`map`, `flatMap`) or asynchronous wrappers are added to maintain simplicity.
- The pupitre's existing `Result.ts` can be migrated to this shared kernel or kept as is until refactored.

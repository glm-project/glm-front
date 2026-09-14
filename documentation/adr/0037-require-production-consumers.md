# 0037 — Require production consumers for tested members

## Status

Accepted. Complements [ADR 0014](0014-resolve-architecture-dependencies-through-the-compiler.md)
with a compiler-backed check for production declarations whose consumers are exclusively tests.
Amends [ADR 0006](0006-how-the-front-calls-the-back.md): remove the unused `Page.isComplete()` helper
while retaining the page elements and server total.

## Context

Tests can keep otherwise unused public methods and exported values alive. Local unused-variable
checks cannot distinguish those consumers across files. Fixtures calling those methods can also
make source coverage look complete while no shipped behavior needs them.

## Considered options

- A local ESLint rule backed by the installed TypeScript and Angular compilers — **kept**: resolves
  symbols across files and includes template usages without another dependency.
- `no-unused-vars` alone — rejected: exported values and public members need cross-file consumers.
- A text search for names — rejected: unrelated classes share member names and templates use domain values.

## Decision

Run `local/no-test-only-production` across handwritten production TypeScript. Report implemented
methods, fields, functions and module variables with test consumers but no production consumers.
Imports and re-exports alone do not establish a consumer. Resolve aliases and recognize calls through
inherited contracts. Include Angular-generated template type-check blocks as production consumers;
exclude test templates and test fixtures from those consumers. Follow dependencies from tested operations
so a helper or recursive chain cannot justify itself. Recognize configured Angular file replacements
and methods implementing external framework contracts.

Remove the unused production surface and adapt the tests. Exercise an existing application entry point
when a rule has a real production owner. Do not add an artificial production call to satisfy the check.

## Consequences

### Positive

- Tests cannot alone justify retaining production operations or values.
- Template references and polymorphic port calls remain legitimate consumers.
- The existing lint command runs the same gate locally and in CI.

### Negative

- A project-wide compiler pass adds lint time and must track the pinned Angular compiler's template APIs.
- The compiler snapshot reads saved files once per ESLint process. The authoritative check is a fresh
  `npm run lint` invocation; unsaved editor buffers are outside its scope.
- This is a static consumer check, not a proof that every production reference executes at runtime.
  Untyped template accesses conservatively preserve matching member names, so unrelated names can
  escape detection. Dynamic reflection and serialization need review; an unreferenced declaration without test consumers
  is outside this rule and remains subject to existing unused-code checks and review.

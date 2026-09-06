# 0024 — Extend mutation to the unit-tested project

## Status

Accepted. Amends [ADR 0018](0018-run-replay-mutation-through-angular.md).

## Context

ADR 0018 deliberately limited the first mutation measurement to `GesteReplayPolicy.ts`. That experiment proved the Angular command runner, the TypeScript checker and the 100 % threshold, but its report could not say anything about the rest of the applications.

Extending a strict 100 % blocking threshold across all unit-tested TypeScript files (including UI components, DOM event listeners and secondary infrastructure adapters) created significant friction without proportionate business confidence:

- Engineers were forced to write fragile tests targeting browser DOM plumbing (e.g. asserting `event.defaultPrevented` on synthetic `PointerEvent` instances or handling multi-digit key events like `'12'`).
- Angular component testbeds and asynchronous browser infrastructure adapters significantly slowed the pre-push feedback loop.
- Presentation literals, framework lifecycle hooks and equivalent mutants outside the domain encouraged artificial assertions rather than protecting business invariants.

Conversely, mutation testing inside the domain core (`**/domain/**`) runs in milliseconds, has zero framework dependencies, and systematically catches subtle boundary conditions and state transition regressions.

## Considered options

- Keep the replay-only scope — rejected: its project-level report name and score would overstate what was checked.
- Mutate every TypeScript file with a strict 100 % threshold across all layers — rejected: high maintenance burden, slow push validation and proliferation of change-detector tests coupled to implementation details.
- Enforce the 100 % blocking threshold on the domain core and treat mutation scores as informational outside the domain core — **kept**: strictly protects business invariants while preserving developer velocity and test maintainability.
- Add Cypress and production-offline suites to every mutant — rejected: these suites require independently owned servers and make one mutant run too slow for useful feedback. Their browser contracts remain separate validation gates.

## Decision

Adopt the **Domain mutation policy**:

1. All changed domain code (`src/main/webapp/**/domain/**/*.ts`) must be mutation-tested.
2. No surviving mutant affecting a business invariant is allowed in the domain core (blocking threshold at 100 %).
3. Equivalent mutants may be explicitly waived when identified.
4. Mutation score is informational outside the domain core (`break: null`).

Implementation:

- `stryker.config.mjs` mutates `src/main/webapp/**/domain/**/*.ts` by default with a 100 % blocking threshold (`thresholds.break: 100`), excluding specs, declarations and package-info files.
- The pre-push hook (`npm run test:mutation:diff`) inspects pushed refs and mutates only lines modified within `src/main/webapp/**/domain/**/*.ts`. Pushes modifying only code outside the domain skip mutation.
- `npm run test:mutation:project` executes whole-project mutation testing with `thresholds.break: null` as an informational diagnostic.

## Consequences

### Positive

- Pre-push feedback remains fast: pure domain suites execute in seconds without launching Angular browser harnesses.
- Eliminates fragile, change-detecting tests on UI presentation strings and browser DOM events.
- Business invariants in the domain core remain unconditionally protected with a 100 % mutation score requirement.
- Developers pushing UI or infrastructure changes are no longer blocked by cosmetic or equivalent mutants.

### Negative

- Regressions in test assertion strength outside the domain core are not automatically blocked at pre-push. They rely on unit test coverage, component tests and application tests.

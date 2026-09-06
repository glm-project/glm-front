# 0024 — Extend mutation to the unit-tested project

## Status

Accepted. Amends [ADR 0018](0018-run-replay-mutation-through-angular.md).

## Context

ADR 0018 deliberately limited the first mutation measurement to `GesteReplayPolicy.ts`. That experiment proved the Angular command runner,
the TypeScript checker and the 100 % threshold, but its report could not say anything about the rest of the applications.

The repository now needs mutation feedback for every changed handwritten production TypeScript file exercised by the unit-test coverage gate.
The command runner still cannot select tests per mutant or collect per-test coverage, so running the complete project on every push would make
the feedback loop too expensive.

## Considered options

- Keep the replay-only scope — rejected: its project-level report name and score would overstate what was checked.
- Mutate every TypeScript file, including generated declarations, bootstraps and configuration — rejected: those files are outside the unit-test
  coverage contract and would create invalid or behaviorless mutations.
- Match the production scope of the 100 % unit-test coverage gate — **kept**: it covers handwritten behavior in both applications while retaining
  the same explicit exclusions.
- Add Cypress and production-offline suites to every mutant — rejected: these suites require independently owned servers and make one mutant run
  too slow for useful feedback. Their browser contracts remain separate validation gates.

## Decision

Mutate every `src/main/webapp/**/*.ts` file except specs, declarations, `main.ts`, environment files, providers, `package-info.ts` and generated
sources. These exclusions mirror the unit-test coverage boundary in `angular.json`.

Run the complete Angular unit suite for each valid mutant, keep the TypeScript checker, one worker and the 100 % blocking threshold, and produce
project-level HTML and JSON reports under `reports/mutation/`. Mutation does not run in GitHub Actions. The pre-push hook derives the net production
lines added or modified by each pushed ref and mutates only those ranges after `validate:quick` succeeds. A new branch is compared with the parent
of its first commit absent from the named remote; a first repository push uses the complete local tree. Deleted refs and pushes without mutable
production TypeScript skip mutation. The complete project run remains an explicitly invoked local diagnostic.

## Consequences

### Positive

- The available mutation scope covers handwritten unit-tested behavior across `gestion`, `pupitre` and shared kernels.
- The report no longer implies that one replay policy represents the complete project.
- Source coverage and mutation testing use the same production-file boundary.
- Ordinary pushes receive mutation feedback proportional to their production diff.

### Negative

- The full run is substantially slower than the former replay-only run.
- Browser-only behavior remains outside mutation scope and is protected by component, application and production-offline suites instead.
- A new production file can introduce surviving mutants even when source coverage remains at 100 %, and this drift is visible only when someone
  pushes that file or runs the complete diagnostic explicitly.
- The command runner does not report test locations, so Stryker's incremental mode cannot safely infer the effect of a test-only change; the hook
  deliberately scopes from production changes instead.
- Stryker runs against the current working tree. Uncommitted changes to a selected production file or its tests therefore influence the pre-push
  result even though they are not part of the commits being pushed.

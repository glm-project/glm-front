# 0018 — Run replay mutation through Angular

## Status

Amended by [ADR 0024](0024-extend-mutation-to-the-unit-tested-project.md).

## Context

Line and branch coverage showed that `GesteReplayPolicy` executed, but did not show whether its assertions
defended arrival absorption, implicit-resumption absorption, one concurrency retry and propagation of other
refusals. Its unit scenarios depend on the environment installed by Angular's test builder. Running Vitest
directly bypasses the zoneless TestBed and JIT setup required by this repository.

Mutation is materially slower than the unit suite. The initial bounded measurement took 93.49 seconds for
58 mutants. Running it on every push before measuring its value and cost would lengthen the normal feedback
loop.

## Considered options

- Stryker's built-in command runner invoking the Angular test builder, with a TypeScript checker — **kept**.
- Stryker's Vitest runner — rejected: it invokes Vitest rather than Angular's test builder and does not prove
  compatibility with the repository's required unit-test environment.
- Mutate the complete pupitre domain immediately — rejected: the first run would mix unrelated decision
  surfaces and increase the cost before the initial policy results were understood.
- Keep only the existing source-coverage gate — rejected: execution coverage cannot show whether assertions
  detect a changed business decision.

## Decision

Mutate only `GesteReplayPolicy.ts` first. Run its scenarios through
`ng test --watch=false --include` with Stryker's built-in command runner, one isolated sandbox worker and
`coverageAnalysis` off. Use Stryker's TypeScript checker with a narrow `tsconfig.stryker.json` so mutations
that cannot compile are reported as `CompileError` instead of being mistaken for assertion kills.

Keep the regular 100 % Istanbul per-file threshold as independent source-coverage evidence. The command
runner cannot collect per-mutant coverage and therefore cannot distinguish `NoCoverage` from `Survived`;
never interpret its displayed zero uncovered count as proof that every valid mutant executed.

Keep a 100 % blocking mutation threshold over valid mutants. The measured checked run classified 34 mutants
as killed and 24 as compile errors, with no survivors or timeouts. Store JSON and HTML reports under
`reports/mutation/`. Run the check manually and weekly in CI, upload its report and measured duration, and
leave it out of push and pull-request validation. Consider projections and operator windows only from later
bounded results.

## Consequences

### Positive

- A changed valid replay decision fails through the same Angular test environment used by the unit suite.
- Invalid TypeScript mutations, killed mutations, survivors and timeouts have distinct report statuses.
- The permanent command and CI artifact make the measured policy result reproducible and reviewable.

### Negative

- Every valid mutant runs the complete selected spec because the command runner cannot select tests or
  collect per-mutant coverage.
- The checked run took 78.22 seconds on the measured workstation and CI duration may differ.
- A survivor can also be uncovered; deciding which requires inspecting the mutant and the separate Istanbul
  report.
- The initial scope says nothing about mutation strength in projections, operator windows or other contexts.

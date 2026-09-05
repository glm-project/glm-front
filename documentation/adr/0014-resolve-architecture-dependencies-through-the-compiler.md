# 0014 — Resolve architecture dependencies through the compiler

## Status

Accepted.

## Context

The architecture suite described layer rules with `arch-unit-ts`, but that library records import
declarations only. Re-exports and a dependency exposed through a barrel did not enter its graph. Contexts
were discovered from `package-info.ts`, so an undeclared directory was absent from every per-context rule.
Calls to ambient browser APIs have no import declaration and were also invisible. Text matching can reject
those calls, but it cannot reliably distinguish a browser global from a local parameter with the same name.

## Considered options

- Keep `arch-unit-ts` and complement it with a TypeScript compiler graph — **kept**: it preserves the readable
  layer rules while resolving the missing dependency and symbol information with an existing tool.
- Express every rule with ESLint import restrictions — rejected: per-file import selectors do not resolve a
  named export through an arbitrary barrel chain.
- Replace `arch-unit-ts` with another dependency graph package — rejected: migration and a new dependency add
  cost without improving the rules that already work.
- Search source text for forbidden globals — rejected: local homonyms and explicit date operations would
  produce false positives.

## Decision

Run a compiler-backed architecture inspection as part of the Node tests already executed by lint. Enumerate
the directories that can own business contexts and shared kernels, and require each direct child to declare
the matching boundary. Keep generated API code outside that declaration inventory.

Resolve static imports, literal dynamic imports and re-exports to their TypeScript declarations. Apply the
existing direction rules to those resolved targets, including named targets exposed through barrels. Keep
the `arch-unit-ts` specification and correct its secondary-to-own-primary rule to negate “depends on”.

Inspect production domain syntax with compiler symbols. Reject ambient browser I/O, storage, browser globals,
current-time reads and random generation, including local aliases of those globals. Accept injected values,
local homonyms and pure date operations based on an explicit value. Keep positive and negative fixture
projects next to the harness and inspect the real production tree in the same suite.

## Consequences

### Positive

- A newly added boundary cannot disappear from architecture validation by omitting `package-info.ts`.
- Imports, re-exports and barrel-mediated dependencies receive the same layer checks.
- Domain environment rules reject ambient access without reserving ordinary local names.
- Fixture failures demonstrate that each protection can reject a known transgression, while the production
  assertion demonstrates that current code remains accepted.

### Negative

- Lint now constructs an additional TypeScript program and takes longer.
- The repository owns compiler-API traversal code that must evolve when new module syntax or ambient APIs
  enter the codebase.
- The compiler graph complements rather than replaces `arch-unit-ts`, so maintainers must keep overlapping
  dependency rules aligned.

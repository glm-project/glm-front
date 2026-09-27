# 0043 — Forbid Angular effects everywhere

## Status

`Accepted`

- `Amends 0022: the presentation-adapter exception for effect() and afterRenderEffect() is withdrawn; both are refused in every file.`

## Context

[ADR 0022](0022-keep-conventions-contextual-and-enforceable.md) kept Angular effects out of business
orchestration and application-state propagation, but let a primary presentation adapter use `effect()` or
`afterRenderEffect()` for a narrow imperative browser integration with explicit lifetime and cleanup, its reason
kept in a local comment. Lint allowed the imports under `infrastructure/primary/` and could not tell a justified
integration from state propagated through an effect.

No file uses either API. The exception protected nothing, and the comment it required is now refused by
[ADR 0042](0042-forbid-comments-in-code.md).

## Considered options

- Refuse both APIs in every JavaScript and TypeScript file, presentation adapters included — **kept**.
- Keep the presentation exception — rejected: no code uses it, review had to judge each use, and its
  justification relied on a comment that lint now refuses.
- Also refuse the Angular APIs that rely on an effect internally, such as `toObservable()` — rejected: nothing
  uses them, and tracking Angular's implementation would add a rule with no case to enforce.

## Decision

Never use `effect()` or `afterRenderEffect()`. Signals expose state, `computed()` and `linkedSignal()` derive it,
explicit application commands drive mutations, and an imperative browser integration belongs to the event
handler, the lifecycle hook or the one-shot render callback (`afterNextRender`) that owns its side effect.

`no-restricted-imports` refuses both names from `@angular/core` in every JavaScript and TypeScript file ESLint
lints, aliases and re-exports included. Namespace and dynamic imports of Angular Core stay refused so the ban
cannot be bypassed, and each front boundary keeps the effect restriction beside its own import restrictions.

## Consequences

### Positive

- A single rule without exception: review no longer weighs whether an effect has earned its place.
- State cannot be propagated through an effect from a presentation adapter any more than from anywhere else.
- The boundary blocks that existed only to re-enable effects in primary adapters disappear from the lint
  configuration.

### Negative

- A browser integration that Angular only offers through an effect needs another design, typically more
  explicit code in an event handler or lifecycle hook.
- The rule refuses two names, not the mechanism: an Angular API that relies on an effect internally, such as
  `toObservable()`, is not refused.

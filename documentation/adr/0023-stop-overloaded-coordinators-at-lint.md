# 0023 — Stop overloaded coordinators at lint

## Status

Accepted. Complements [ADR 0013](0013-keep-business-decisions-in-rich-domain-models.md) and
[ADR 0022](0022-keep-conventions-contextual-and-enforceable.md).

## Context

`OfflinePupitre` accumulated persistence, synchronization, presentation state and operator-window coordination.
Its tests stayed green, but the class had become the place where unrelated application responsibilities were
added by default. Cognitive complexity catches dense control flow; it does not catch a coordinator whose many
small methods, injected collaborators and owned states are each simple in isolation.

ESLint cannot decide whether a class is a god class or whether an extraction is cohesive. It can, however, stop
the combination that made this accumulation easy to miss and require an explicit design review before it grows
further.

## Considered options

- Block a conjunctive coordinator-size tripwire and require a cohesive review — **kept**.
- Rely on code review alone — rejected: the existing accumulation crossed several reviews without a visible gate.
- Block on lines, methods or dependencies independently — rejected: each measure also describes legitimate deep
  modules, rich domain objects and narrow stateless facades.
- Maintain a named allowlist — rejected: a silent central exception would hide the design decision from the class
  being reviewed.

## Decision

Run `local/responsibility-cohesion` as an error on production TypeScript classes and exclude specs and test
fixtures. Report a class only when it simultaneously coordinates at least four injected collaborators, exposes
at least six public instance methods and owns at least three mutable or signal-backed state fields.

Treat the conjunction as a mandatory design checkpoint, not as proof that a responsibility split exists. First
inventory the class's reasons to change and extract an independently cohesive responsibility when one exists, as
ADR 0013 requires. If the class is demonstrably one deep module and no such responsibility exists, keep a narrow
inline ESLint suppression beside that class with the architectural reason. Do not add a named or path-based
exception to the rule configuration.

The thresholds and counting rules live with the executable rule and its tests. Changing one reopens this
decision because it changes which production designs are blocked.

## Consequences

### Positive

- A stateful coordinator cannot silently accumulate a broad command surface and many collaborators.
- Rich domain objects without injected infrastructure and stateless facades do not fail merely for having a deep
  interface.
- Any exceptional cohesive module carries its review rationale at the exact enforcement point.

### Negative

- The tripwire has false negatives below any one threshold and cannot replace responsibility-oriented review.
- A legitimate large coordinator may require a documented suppression even when extraction would make its
  interface shallower rather than deeper.
- The numeric boundary is repository policy and must evolve deliberately rather than following a generic metric.

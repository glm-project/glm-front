# 0031 — Own workshop supervision in Gestion

## Status

Accepted during the design interview for [#60](https://github.com/glm-project/glm-front/issues/60).
The interview synthesis was confirmed before preparing the iterative implementation plan.

Complements [0012](0012-own-business-contexts-by-front.md): Gestion's `supervision-atelier`

owns the interpretation of workshop presence, activities and anomalies.

Amended by [0033](0033-compose-view-data-in-secondary-adapters.md): the application consumes one supervision
data port; a secondary composition adapter owns the three specialized reads and the mounted operator cache.
The domain still interprets presence, activities and anomalies.

## Context

The real-time grid combines declared operators, working visits and ongoing activities. Gestion's
`operateur` context owns the operator reference and habilitations. The screen semantics are established
by [#12](https://github.com/glm-project/glm-front/issues/12#issuecomment-5542625574).

The available generated contract supports ongoing workshop activities but lacks the working-visit state
filter. Online reads are bounded and expose whether their results are complete.

## Considered options

- A dedicated `supervision-atelier` context in Gestion — **kept**: one owner for interpreting the combined sources.
- Extend `operateur` — rejected: reference administration and instantaneous workshop interpretation have different responsibilities.
- Reuse Pupitre's `atelier` context — rejected: the applications own independent business models.
- Read a bounded history of working visits without a state filter — rejected for the initial wiring: history can truncate the result before all open visits are available.

## Decision

Place the grid and its business rules in Gestion's `supervision-atelier`. Consume the operator reference
through a public TypeScript adapter of `operateur`, without importing its domain. Read working visits and
workshop activities through ports owned by supervision. Keep transport translation in HTTP adapters.

Use the following vocabulary for this responsibility (living vocabulary and invariants belong to
[`supervision-atelier` AGENTS.md](../../src/main/webapp/gestion/contexts/supervision-atelier/AGENTS.md)):

- **Supervision de l'atelier**: interpretation of declared operators, presence and current activities for the real-time grid.
- **Journée de travail**: a working visit, which can cross midnight; it is not a calendar day.
- **Lecture complète**: all required collections have been obtained without truncation or an activity whose operator cannot be identified.
- **Anomalie**: a situation flagged by the supervision rules, without correcting the source data or changing its presence colour.

Treat incomplete pages and activities without an identifiable operator as failed reads. At initial loading,
show a failure without a grid. During refresh, retain the last complete grid and use the passive failure
indication already specified in #12. Do not silently omit an unassignable activity: it could create a false
GLM indication.

For an open working visit with no presence windows, display « Journée ouverte sans heure d'ouverture ».
Do not invent an opening timestamp. For an activity without a workstation, retain the activity and omit
the workstation label. Use the workshop tracking name while its reference is unavailable, as already
specified by #60.

Initially wire working visits to InMemory and activities to HTTP, using the available ongoing-state filter.
Keep the existing online operator read. Align scenario operator identifiers with the loaded reference.
Provide a fully InMemory configuration for reproducible scenarios. Choose adapters per port in the
composition root; an HTTP failure never selects simulated data. Replace the working-visit adapter when the
required backend contract is available and pinned.

## Consequences

### Positive

- The grid exercises its real business rules before the working-visit API is ready.
- Source failures and truncation cannot silently fabricate absence or GLM.
- Operator reference ownership remains separate from workshop interpretation.

### Negative

- Another context and a TypeScript bridge must be maintained.
- One unassignable activity prevents the whole grid from refreshing.
- Mixed HTTP and InMemory data can describe inconsistent situations; this validates the proposed screen,
  not the production integration. Fully simulated scenarios provide controlled examples.
- HTTP working-visit integration and validation against the real backend remain outstanding.

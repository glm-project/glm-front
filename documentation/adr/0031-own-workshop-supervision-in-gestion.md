# 0031 — Own workshop supervision in Gestion

## Status

Accepted during the design interview for [#60](https://github.com/glm-project/glm-front/issues/60).
The interview synthesis was confirmed before preparing the iterative implementation plan.
Complements [0012](0012-own-business-contexts-by-front.md). Acquisition is amended by
[0033](0033-compose-view-data-in-secondary-adapters.md), the layout by
[0041](0041-sort-workshop-supervision-into-state-lanes.md), and activity interpretation by
[0047](0047-count-only-finished-activities.md). This revised account retains the context and acquisition
reasons with the delivered two-lane model. HTTP acquisition now uses the complete atelier projection;
InMemory remains a demonstration adapter.

## Context

The view combines declared operators, interpretable activities and conflicting sequences. Gestion's
`operateur` context owns the operator reference and habilitations; instantaneous workshop interpretation
has another reason to change. The screen semantics originated in
[#12](https://github.com/glm-project/glm-front/issues/12#issuecomment-5542625574) and now follow ADR 0047.
A truncated source or an activity without an identifiable operator would produce a misleading view.

## Considered options

- A dedicated `supervision-atelier` context in Gestion — **kept**: one owner interprets the combined data.
- Extend `operateur` — rejected: reference administration and workshop interpretation differ.
- Reuse Pupitre's `atelier` — rejected: the applications own independent business models.
- Read bounded history as a complete current view — rejected: truncation can omit an ongoing activity.

## Decision

Place the view and its business rules in Gestion's `supervision-atelier`. Consume the required reference
without importing `operateur` domain models. One secondary adapter implements `DonneesDeSupervisionPort`,
acquires the resources and translates transport data. The domain separately decides their business validity.

The living vocabulary belongs to
[`supervision-atelier` AGENTS.md](../../src/main/webapp/gestion/contexts/supervision-atelier/AGENTS.md):

- **Supervision de l'atelier**: interpretation of declared operators, current activities and conflicts.
- **Lecture complète**: every required collection acquired without truncation.
- **Lecture exploitable**: every activity, including a conflicting one, has an identifiable operator.
- **Opérateur à vérifier**: an operator carrying an automatic finish or conflicting sequence.

Reject incomplete acquisition in the secondary adapter. Let the domain refuse activities without an
identifiable operator. Either failure displays an error replacing the previous lanes; omitting an
unassignable activity would silently alter the classification. Keep activities without workstations and
show « Sans poste ». Personal work is represented by a supervisor-created OF Perso, read like every
other fabrication order. Its creation and subtype are a separate feature; a missing element stays invalid.

Provide reproducible activity, automatic-finish and conflict scenarios through one InMemory adapter,
for fixtures. Select HTTP for the normal supervision route at the composition root. Its complete atelier
projection supplies every required source; a failed HTTP call never selects simulated data. The current
two lanes, alphabetical order and NC overlay belong to ADR 0041.

## Consequences

### Positive

- The view exercises its domain rules before real HTTP integration.
- Source failures and truncation cannot silently fabricate a current activity classification.
- Operator reference ownership remains separate from workshop interpretation.

### Negative

- Another context and API-to-domain translation must be maintained.
- One unassignable activity prevents the whole view from refreshing.
- Simulated scenarios validate the screen, without proving production integration.
- Browser interception cannot establish validation against the real backend and Keycloak.

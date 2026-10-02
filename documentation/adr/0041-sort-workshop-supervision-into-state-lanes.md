# 0041 — Sort workshop supervision into state lanes

## Status

Accepted. Amends [0031](0031-own-workshop-supervision-in-gestion.md) and complements
[0040](0040-colour-non-conformity-yellow.md). Revised under
[0047](0047-count-only-finished-activities.md): two fixed lanes classify every declared operator from
interpretable current activities. The positioning, alphabetical order, optional workstation labels,
NC overlay and duration-free reading remain. Local pause ownership is carried by
[0045](0045-keep-the-pause-on-the-pupitre.md).

## Context

The client drew « Temps réel — vue d'ensemble des opérateurs » with Opérateur, Process, Tâche en cours
and NC, striking out Temps passé. Five forms were considered: timeline, list, tiles, state lanes and
exception queue; the client retained lanes on 25/09/2026. The dated timeline delivered by
[PR #143](https://github.com/glm-project/glm-front/pull/143) with filters and a foldable log answered a
different question. The revised activity model makes the immediate question who has interpretable work.

A pause lives only in the journal of the pupitre that took it. Gestion has no source for that local state.
Finishes at the same instant do not establish a pause: an operator may simply finish their only task.
An activity opened elsewhere after the last refresh, or whose finish is still unpublished, can still
appear ongoing in the data being read. The view preserves that evidence.

## Considered options

- Fixed state lanes, alphabetical within each — **kept**: state reads by position before colour and each
  operator appears once. ADR 0047 limits classification to the two states supported by activities.
- Keep the timeline — rejected: it answers since when with durations the client struck out, and its width
  requires horizontal scrolling.
- Tiles at a fixed alphabetical position — rejected: state is spread across the screen.
- A plain list — rejected: it produces the spreadsheet the client declined.
- An exception queue — rejected: it hides operators without an exception.
- Show a pause lane from pupitre memory — rejected: that memory has no Gestion source.
- Infer a pause from simultaneous finishes — rejected: it guesses an operator state from activity history.
- Keep an empty pause lane awaiting a source — rejected: an empty lane falsely suggests nobody is on break.

## Decision

Show **Au travail · Sans activité**, always in that order and visible even when empty. Each declared
operator appears exactly once: at least one interpretable current activity means Au travail; otherwise
Sans activité. Sort by name, first name and identifier within each lane. The operator has no fixed place.

NC is hatching and a text mark laid over an interpretable current activity, never a lane. Conflicting
sequences render separately, including those without an activity to resolve. They yield no interpreted
current activity and no NC signal; independent activities of the same operator still render. Automatic
finishes and conflicts remain visible in the card's verification signal without changing the lane.

Personal work uses an OF Perso created by the supervisor and stays Au travail while ongoing.
Supervision reads it like any fabrication order; creating it and choosing its subtype is another feature.
A missing element never represents personal work.
Show free-text workstation nature as « Métier », exactly as received, and « Sans poste » when no workstation
is supplied. Show the operator's trades when no interpretable activity is current. Keep one card per person
when several operators work on the same machine.

Show instants, never a computed duration. REPRENDRE opens a fresh activity, so its displayed beginning
restarts. No activity or NC is shown suspended. Showing breaks would first require a source Gestion can
read. `warn` remains the pupitre's pause-command colour and paints no supervision lane, edge or icon.

The normal route reads the complete backend supervision projection through HTTP, without a
demonstration fallback. Keep InMemory for reproducible fixtures. The dated history requested by
[glm-back#32](https://github.com/glm-project/glm-back/issues/32) has another owner.

## Consequences

### Positive

- The two states read by position at a glance without horizontal scrolling.
- NC and conflicts remain visible without replacing the activity classification.
- No computed duration can contradict the pupitre or the reports.
- The view exposes only states supported by its source.

### Negative

- An operator changes lanes between reads and loses a fixed location.
- Finding a person requires reading both lists or Ctrl+F; a search control is postponed.
- Au travail grows long beyond about 40 operators; no compact mode exists.
- The supervisor cannot distinguish a local pause from another reason for having no current activity.
- An NC remains signalled while its interpretable activity remains ongoing in the source, including when
  its finish is still unpublished or another pupitre opened it. A conflicting activity contributes none.
- The timeline, filter and suspended-activity scenarios left with their removed UI responsibilities.

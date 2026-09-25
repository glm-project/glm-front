# 0041 — Sort workshop supervision into state lanes

## Status

`Accepted`

- `Amends 0031: the grid becomes four state lanes, ordered alphabetically within each lane, the screen calls an open working visit « venue ouverte », and an activity without a workstation shows « Sans poste » instead of omitting the workstation.`
- `Complements 0040: green means at work, brown warn the pause, red danger the absence, and yellow nc a non-conformity laid over an activity.`

## Context

The client drew the page it wants on paper: « Temps réel — vue d'ensemble des opérateurs », with the columns
Opérateur · Process · Tâche en cours · Temps passé (struck out) · NC (a coloured box). It does not want a
spreadsheet interface.

[#12](https://github.com/glm-project/glm-front/issues/12) had planned one tile per declared operator, in a
fixed alphabetical place, coloured by presence. [PR #143](https://github.com/glm-project/glm-front/pull/143)
then delivered a timeline from 06:00 to 22:00, with filters, a search field and a foldable log per operator,
without a written decision. Neither answers the question the client asks at a glance: who is working, who is
waiting for a task, who is on break and who is missing.

Five forms were drawn: the timeline, a list, tiles, state lanes and an exception queue. The client retained the
state lanes on 25/09/2026.

## Considered options

- Four state lanes, alphabetical within each lane — **kept**: the state is read by position before any
  colour, and every operator appears once.
- Keep the timeline — rejected: it answers "since when" with durations the client struck out, and its width
  forces horizontal scrolling.
- Tiles in a fixed alphabetical place — rejected: a fixed place spreads the states across the screen, so
  counting who is missing means reading every tile.
- A plain list — rejected: the spreadsheet the client does not want.
- An exception queue — rejected: it hides the operators without an exception, whom the client wants to see.

## Decision

Show four fixed lanes, in this order: **Au travail · Sans affectation · En pause · Absents**. Every declared
operator appears in exactly one lane:

- ABSENT → Absents, even with an open activity or an anomaly;
- EN_PAUSE → En pause;
- PRESENT without any activity → Sans affectation;
- PRESENT with at least one activity → Au travail.

"Au travail" is a derived lane, never a fourth presence state. Order operators alphabetically (name, first
name, identifier) within each lane; the fixed place per person no longer exists. The lanes are a pure state:
no working hours, so an arrival passing through "Sans affectation" is normal, and lunch is read in "En pause".

Lay the non-conformity over the activity (hatching and an « NC » mark), never as a lane. An operator is in NC
when their visit is open (PRESENT or EN_PAUSE) and at least one activity is nonconforming. An absent
operator's activities stay visible on their card, dimmed, but never count in the NC signal: their departure
stopped their time.

Work that no manufacturing order bills stays in "Au travail", marked « Hors OF » in place of the mould or order.
Nothing is called « GLM ». Neither the pupitre nor the API declares such work yet: an activity whose element is
missing is never turned into « Hors OF », which would fabricate the very indication 0031 forbids.

Show the trade as « Métier »: it is the nature of the activity's workstation, free text shown as typed. An
activity without a workstation says « Sans poste » rather than omitting the line. An operator without any
activity, unassigned or on pause, lists their trades instead; an absent operator shows none. Show nothing more
when two people work on the same machine: the page stays one card per person.

Show no duration anywhere, only instants: « arrivée », « pause depuis », « depuis » on each task. Remove the
filters, the search field and the log. Show each anomaly as a band on the card, without changing the lane, and
count the operators carrying one in a « à vérifier » signal.

On screen, call a working visit a « venue »: « journée » would suggest a calendar day, and « présence »
already names the PRESENT, EN_PAUSE or ABSENT state. « Venue ouverte sans heure d'arrivée » replaces the
label « Journée ouverte sans heure d'ouverture » that 0031 prescribed. The code keeps `JourneeDeTravail`.

Keep the demonstration dataset hard-coded in the InMemory adapter, the only one wired, in production too, and
show no « démonstration » notice: the HTTP adapter waits for the API to expose open working visits.

Remove the timeline. The dated history that
[glm-back#32](https://github.com/glm-project/glm-back/issues/32) asks for does not belong on this screen.

## Consequences

### Positive

- The four states are read by position and counted at a glance, without scrolling horizontally.
- A non-conformity cannot hide a presence state, and an absence cannot hide an activity left open.
- The screen displays no computed duration, so it cannot contradict the pupitre or the report.

### Negative

- A person changes lane from one read to the next and no longer has a fixed place.
- "Where is X" means reading four lists, or Ctrl+F; a « Trouver » field is postponed.
- The "Au travail" lane grows long beyond about 40 operators, and no compact mode exists.
- The screen says « venue » where the API, the pupitre and the code say « journée ».
- [#23](https://github.com/glm-project/glm-front/issues/23) and the colour table of #12 are reversed: green
  now means at work rather than present, and "Au travail", which #23 declined to distinguish, becomes a
  derived lane.
- The tests of the timeline and of the filters are deleted with them.

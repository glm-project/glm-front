# 0046 — Stop showing the pause in workshop supervision

## Status

`Accepted`

- `Amends 0041: three lanes, Au travail · Sans affectation · Absents; the presence state is PRESENT or ABSENT, an operator on pause is present without activity and appears in Sans affectation, no activity or NC is shown suspended, and a card shows « arrivée », never « pause depuis ».`
- `Amends 0040: warn no longer paints a supervision lane; it stays the colour of the pupitre's PAUSE and REPRENDRE commands.`

## Context

On 28/09/2026 the pause left the server. The back no longer knows `PAUSE`, `REPRISE` or `EN_PAUSE`. At the
pupitre, PAUSE ends each ongoing activity of the operator with a `FIN` and remembers them; REPRENDRE reopens
them. The pause does not touch presence: an operator on pause stays present, and the pause lives only in the
journal of the pupitre that took it.

[ADR 0041](0041-sort-workshop-supervision-into-state-lanes.md) drew four lanes from the `EN_PAUSE` presence
state the back exposed: « En pause » between « Sans affectation » and « Absents », the activities of an
operator on pause kept open and marked « suspendue », a « pause depuis » instant on the card, and
« (suspendue) » on the NC signal when every counted non-conformity belonged to an operator on pause.
[ADR 0040](0040-colour-non-conformity-yellow.md) kept the brown `warn` role, the client's orange, for that
pause.

Once the server has no pause, the data the supervision will read — open working visits and ongoing
activities — cannot tell an operator on pause from a present operator without activity. Only the InMemory
demonstration feeds the screen today, so the screen can change before the back does.

## Considered options

- Remove the lane, the suspended activities and the suspended non-conformities; an operator on pause appears
  in « Sans affectation » — **kept**.
- Keep an « En pause » lane fed by the pupitre's pause — rejected: the pause never leaves the pupitre that
  took it, so gestion has nothing to read it from.
- Infer a pause from a present operator whose activities all ended at the same instant — rejected: the screen
  would guess a state from a history it does not show, and an operator who stops their only task would read as
  being on break.
- Keep the lane and leave it empty until a source exists — rejected: a lane that never fills tells the reader
  that nobody is on break.

## Decision

Show three fixed lanes, in this order: **Au travail · Sans affectation · Absents**. The presence state has two
values: `PRESENT` when the operator has an open working visit, `ABSENT` otherwise. A working visit is open or
closed and carries no state of its own.

An operator on pause is present and has no ongoing activity: they appear in « Sans affectation », with their
arrival and their trades, like any unassigned operator. The supervision does not tell them apart and counts
them among the « Présents ».

Mark no activity « suspendue », never add « (suspendue) » to the NC signal, and show « arrivée » on the card of
every present operator. An operator is in NC when their visit is open and at least one activity is
nonconforming.

`warn` paints no lane, card edge or icon of the supervision. It stays the colour of the pupitre's PAUSE and
REPRENDRE commands.

The demonstration dataset follows: the operators it showed on pause are present, one of them without the
activity his pause closed, and no working visit keeps a lunch gap between two windows. Nothing else draws the
`pause` icon, so it leaves the icon set.

## Consequences

### Positive

- The screen shows only what its future source can say: no lane depends on a state the server no longer holds.
- The three lanes get more width on a desktop screen, and the « Présents » brace still spans the first two.
- The domain loses the presence segments, the pause start and the suspension rules, and their tests.

### Negative

- The supervisor can no longer tell who is on break from who waits for a task: both read « Sans affectation »,
  and lunch now fills that lane.
- An operator on pause drops out of the NC signal, because their pause ended the NC activity; they come back
  when REPRENDRE reopens it as a non-conformity.
- The « depuis » of each activity restarts at REPRENDRE, which opens the activity again.
- This reverses part of the layout the client retained on 25/09/2026, which had an « En pause » lane. Showing
  breaks again needs a source that gestion can read first.
- The tests of the pause lane, the suspended activities and the suspended non-conformities are deleted with
  them.

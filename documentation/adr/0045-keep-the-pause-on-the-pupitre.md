# 0045 — Keep the pause on the pupitre

## Status

`Accepted`

- `Amends 0006: clocking in no longer resumes a paused presence; the only composed gesture left is the arrival assurance, which still swallows journee-de-travail-deja-ouverte and nothing else.`
- `Amends 0007: the first batch of a window commits the arrival assurance and its gestures, never a resumption, and replay absorbs only the arrival already open; PAUSE is fanned out into one finish per known personal activity, and REPRENDRE into one restart per activity it suspended.`
- `Amends 0009: FenetreOperateur prepares the implicit arrival and turns PAUSE and REPRENDRE into finishes and restarts; it no longer prepares any resumption.`

## Context

The product must tell who works on what and what a manufacturing order cost in working time; the presence
record does not pay the operators. Until now a pause was a presence event: the pupitre sent `PAUSE` and
`REPRISE`, the back kept an `EN_PAUSE` state, activities stayed open through the pause and the working time was
read at the intersection of activities and presence windows. The client describes pause, stop and resumption as
one mechanism. The back is removing every notion of pause (`PAUSE`, `REPRISE`, `EN_PAUSE`); it will only receive
finishes and starts.

Two written rules fall with it: the back's « never loop over the elements in progress to reflect a pause », and
[ADR 0007](0007-durable-offline-pupitre.md)'s « Presence remains an operator-level gesture; it is never fanned out
into per-element writes ». The global PAUSE button itself has never been validated first-hand by the client; this
record moves that open question to the pupitre, it does not settle it.

## Considered options

- Mark each finish of a pause with the pause and the pointage that will reopen it, in the journal — **kept**: the
  finishes and the pause are appended in one atomic batch, survive restarts like every gesture, need no new port
  or storage key, and never reach the server because the HTTP adapter builds its bodies field by field.
- Keep the pause as a presence event on the server — rejected: the back is dropping it, and it kept the activities
  running through the pause.
- Store the pause beside the journal, under its own key or port — rejected: a second write loses the atomicity of
  the batch, and a crash between the two leaves finishes without a pause or a pause without finishes.
- Let the back expose the activities closed by the last global stop, so that another pupitre can resume — rejected
  for now: nobody asked to resume elsewhere, and the back would have to learn a notion it is removing.

## Decision

PAUSE ends, in one atomic batch, every personal activity the pupitre knows for the designated operator: one
`FIN` per activity, on its workstation, carrying a **suspension** — the pause, identified by the root identity of
the initiated global intention, and the pointage that will reopen the activity (`DEBUT`, or `NON_CONFORMITE` for
an activity in non-conformity). PAUSE assures no arrival and sends no presence gesture. The suspension never
leaves the pupitre.

`PauseEnCours`, read from the whole journal of the pupitre, is the only owner of when a pause ends and what it
reopens. The pause of an operator is the one of their last suspension; it ends at REPRENDRE, at any later gesture
of that operator appended to this journal whatever its fate at publication, and as soon as the projected
reference shows an activity of that operator other than one whose suspension was refused. It reopens the
activities whose suspension was not refused, whose element is still in the projected reference, whose workstation
is still held and which are not open again on the same element and workstation. No clock is compared across
devices and a pause never expires.

REPRENDRE assures the arrival like a tile, then sends one `DEBUT` or `NON_CONFORMITE` per activity to reopen, on its
workstation. PAUSE is offered only while the operator has a personal activity, REPRENDRE only while a pause is in
progress, TOUT ARRÊTER always. The chrome shows « En pause » only while a pause is in progress and the projected
presence is present; otherwise it shows the presence as before. A global command decided on a window where there
is nothing left to do records no gesture at all, not even the arrival. The pupitre sends no `REPRISE` any more,
not even before an opening pointage.

Until the back and the reset of the pupitres have shipped, `EN_PAUSE` may still arrive from the server or from a
stored reference; the HTTP adapter and the IndexedDB adapter both read it as present.

## Consequences

### Positive

- The server receives only finishes and starts, which is what it will keep understanding; durations and costs of
  an order are read from the element's own journal.
- A pause is durable and atomic like any other batch: a crash cannot leave half a pause, and a restart keeps it.
- The pause, its end and what it reopens have a single domain owner, testable without storage or network.

### Negative

- Correcting a wrong pause time takes one correction per activity, a finish and a start, instead of one.
- A pause closes only what this pupitre's reference knows: an activity opened on another pupitre since the last
  refresh keeps running through the pause. TOUT ARRÊTER remains the end-of-day gesture.
- A pause is resumed only on the pupitre that took it; the operator restarts their tiles elsewhere.
- A tile's duration restarts at REPRENDRE, and the rates of an activity are copied again at the restart.
- Every pause adds two events per activity to the element journals.
- The presence record counts the pause, and supervision can no longer tell a pausing operator from a present one
  without assignment.
- Whether a global PAUSE button is wanted at all is still to be confirmed by the client.

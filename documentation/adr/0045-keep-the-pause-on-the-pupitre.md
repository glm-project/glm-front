# 0045 — Keep the pause on the pupitre

## Status

`Accepted`

Amended by [ADR 0047](0047-count-only-finished-activities.md): the activity-only pupitre has no arrival,
departure or attendance compatibility. PAUSE closes only interpretable, unexpired activities by stable
target; REPRENDRE opens new activities. TOUT ARRÊTER atomically invalidates local resumption memory even
without a finish.

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
  finishes and the pause are appended in one atomic batch, survive restarts like every gesture, need no separate pause port
  or storage key, and never reach the server because the HTTP adapter builds its bodies field by field.
- Keep the pause as a presence event on the server — rejected: the back is dropping it, and it kept the activities
  running through the pause.
- Store the pause beside the journal, under its own key or port — rejected: a second write loses the atomicity of
  the batch, and a crash between the two leaves finishes without a pause or a pause without finishes.
- Let the back expose the activities closed by the last global stop, so that another pupitre can resume — rejected
  for now: nobody asked to resume elsewhere, and the back would have to learn a notion it is removing.

## Decision

PAUSE ends, in one atomic batch, every interpretable nonexpired personal activity the pupitre knows for the designated operator: one
targeted `FIN` per activity, on its workstation, carrying a **suspension** — the pause, identified by the root identity of
the initiated global intention, and the pointage that will reopen the activity (`DEBUT`, or `NON_CONFORMITE` for
an activity in non-conformity). PAUSE assures no arrival and sends no presence gesture. The suspension never
leaves the pupitre.

`PauseEnCours`, read from the whole journal of the pupitre, is the only owner of when a pause ends and what it
reopens. The pause of an operator is the one of their last suspension; it ends at REPRENDRE, at any later gesture
of that operator appended to this journal whatever its fate at publication, and as soon as the projected
reference shows an activity of that operator other than one whose suspension was refused. It reopens the
activities whose suspension was neither refused nor conserved in conflict, whose element is still in the projected reference, whose workstation
is still held and which are not open again on the same element and workstation. No clock is compared across
devices and a pause never expires.

REPRENDRE sends one opening DEBUT or NON_CONFORMITE per activity to reopen, with a new UUID and no
former target. PAUSE is offered while an interpretable personal activity remains, REPRENDRE while a local
pause remains, TOUT ARRÊTER always. The chrome shows the operator identity and « En pause » when appropriate.

TOUT ARRÊTER appends N targeted finishes and clears durable resumption memory in one journal mutation,
including N=0. It retains history and pending gestures. No local or server gesture is fabricated to express
that invalidation. A failed transaction leaves both effects unapplied; restart cannot restore a cleared
pause. The new company-scoped activity journal format discards obsolete attendance documents without
migration and preserves device enrolment and credentials.

## Consequences

### Positive

- The server receives only finishes and starts, which is what it will keep understanding; durations and costs of
  an order are read from the element's own journal.
- A pause is durable and atomic like any other batch: a crash cannot leave half a pause, and a restart keeps it.
- The pause, its end and what it reopens have a single domain owner, testable without storage or network.

### Negative

- Correcting a wrong pause time takes one correction per activity, a finish and a start, instead of one.
- A pause closes only what this pupitre's reference knows: an activity opened on another pupitre since the last
  refresh keeps running through the pause. TOUT ARRÊTER clears the local resumption memory.
- A pause is resumed only on the pupitre that took it; the operator restarts their tiles elsewhere.
- A tile's duration restarts at REPRENDRE, and the rates of an activity are copied again at the restart.
- Every pause adds two events per activity to the element journals.
- Whether a global PAUSE button is wanted at all is still to be confirmed by the client.

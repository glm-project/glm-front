# 0045 — Keep the pause on the pupitre

## Status

`Accepted`

Revised under [ADR 0047](0047-count-only-finished-activities.md): PAUSE closes only interpretable,
unexpired activities; REPRENDRE opens new activities.
Amended on 2026-10-09 by [ADR 0054](0054-ignore-incoherent-pointages-at-reception.md) (lot B9 of #254): a finish
closes the activity of its key and carries no target; a pause has no conflicting suspension to leave unresumed. TOUT ARRÊTER atomically invalidates
local resumption memory even without a finish. The global commands are the confirmed activity workflow.
Amended by [ADR 0049](0049-forget-integrated-gestures-at-reference-activation.md): the journal no longer keeps
accepted history. `PauseEnCours` reads the journal that remains, which always holds the last pause of every
operator, and TOUT ARRÊTER retains pending gestures, refusals and what the last pause still needs.

## Context

The product tells who works on what and what a manufacturing order cost in working time. A pause must
actually end each known personal activity; resumption starts another with the same category and workstation.
The client describes pause, stop and resumption as one mechanism. The recording pupitre possesses the
memory needed to reopen its own activities. The server receives only activity finishes and openings.

## Considered options

- Mark each pause finish with its suspension and reopening pointage, inside the journal — **kept**:
  finishes and memory commit atomically, survive restarts, need no separate pause port or storage key,
  and stay local because the HTTP adapter builds its body field by field.
- Keep pause/resumption memory on the server — rejected: it would add a server workflow for a local command
  and keep activities ongoing through the pause instead of expressing their actual finishes.
- Store the pause under a separate key or port — rejected: a second write loses batch atomicity; a crash
  can leave finishes without resumption memory or memory without finishes.
- Let another pupitre resume from server memory of the last global stop — rejected for now: cross-device
  resumption is unrequested and would require the server to own a new workflow.

## Decision

PAUSE ends, in one atomic batch, every interpretable nonexpired personal activity the pupitre knows for the designated operator: one
`FIN` per activity, on its workstation, carrying a **suspension** — the pause, identified by the root identity of
the initiated global intention, and the pointage that will reopen the activity (`DEBUT`, or `NON_CONFORMITE` for
an activity in non-conformity). The suspension never leaves the pupitre.

`PauseEnCours`, read from the journal of the pupitre, is the only owner of when a pause ends and what it
reopens. The pause of an operator is the one of their last suspension; it ends at REPRENDRE, at any later gesture
of that operator appended to this journal whatever its fate at publication, and as soon as the projected
reference shows an activity of that operator other than one whose suspension was refused, considering only interpretable nonexpired activities. It reopens the
activities whose suspension was not refused, whose element is still in the projected reference, whose workstation
is still held and which are not open again on the same element and workstation. No clock is compared across
devices and a pause never expires.

REPRENDRE sends one opening DEBUT or NON_CONFORMITE per activity to reopen, with a new UUID. PAUSE is offered while an interpretable personal activity remains, REPRENDRE while a local
pause remains, TOUT ARRÊTER always. The chrome shows the operator identity and « En pause » when appropriate.

TOUT ARRÊTER appends N finishes and clears durable resumption memory in one journal mutation,
including N=0. It retains pending gestures. No local or server gesture is fabricated to express
that invalidation. A failed transaction leaves both effects unapplied; restart cannot restore a cleared
pause. The company-scoped activity journal uses its own versioned key and discards the obsolete `atelier:` and `atelier-activites-v1:` documents
without reading or migrating them. Device enrolment and credentials retain their documents.

## Consequences

### Positive

- The server receives only finishes and starts, which is what it will keep understanding; durations and costs of
  an order are read from the element's own journal.
- A pause is durable and atomic like any other batch: a crash cannot leave half a pause, and a restart keeps it.
- The pause, its end and what it reopens have a single domain owner, testable without storage or network.

### Negative

- A wrong pause time cannot be corrected: the correction acts left with [ADR 0054](0054-ignore-incoherent-pointages-at-reception.md),
  and the manager only regularises an automatic finish.
- A pause closes only what this pupitre's reference knows: an activity opened on another pupitre since the last
  refresh keeps running through the pause. TOUT ARRÊTER clears the local resumption memory.
- A pause is resumed only on the pupitre that took it; the operator restarts their tiles elsewhere.
- A tile's duration restarts at REPRENDRE, and the rates of an activity are copied again at the restart.
- Every pause adds two events per activity to the element journals.

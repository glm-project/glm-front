# 0049 — Forget integrated gestures at reference activation

## Status

`Accepted`

`Amends` [ADR 0007](0007-durable-offline-pupitre.md): the company journal no longer retains acknowledged events
forever; an accepted gesture is forgotten once a complete reference that integrates it is activated, and the
journal's size no longer depends on past activity.
`Amends` [ADR 0045](0045-keep-the-pause-on-the-pupitre.md): `PauseEnCours` reads the journal that remains, which
always holds the last pause of each operator, and TOUT ARRÊTER no longer retains accepted history.
`Amends` [ADR 0047](0047-count-only-finished-activities.md): TOUT ARRÊTER keeps pending and refused gestures, and the
accepted ones only while they are still the last gesture of their operator or carry the last pause.
`Amended by` [ADR 0054](0054-ignore-incoherent-pointages-at-reception.md): the pupitre keeps the refusals a server ignore produces
(`pointage-ignore`) in this journal without showing them; only the closure refusal reaches the operator.

## Context

The company journal of the pupitre keeps every gesture since enrolment, accepted ones included, and rewrites the
whole document at every write. `projectReferentiel` replays all events over the last reference; for each accepted
gesture it looks its identity up linearly in `suivi.evenements`, which lists every accepted gesture of the
element. The cost is quadratic in the number of accepted gestures, and almost all of them are already integrated
in the reference the projection starts from, so it ignores them afterwards. Measured on Node with real
projection code and a single element, 10 000 accepted gestures cost 42 ms with realistic identities and 634 ms
with long common prefixes; 30 000 cost 223 ms and 4.4 s. Each gesture triggers some twenty to thirty complete
projections while a window is open.

The decisions taken with the product owner: the history of accepted gestures on the pupitre is useless, refused
gestures stay until an explicit reset, a pause never expires, and previous days are not needed.

The journal is then needed for three things only. Pending gestures are the FIFO still to publish. Refused gestures
are the diagnostics of what the server refused. `PauseEnCours` reads the last suspension of an operator to know what
REPRENDRE reopens. Everything else is already in the reference the server computed.

## Considered options

- Forget every accepted gesture that a complete reference integrates, except what `PauseEnCours` still reads —
  **kept**.
- Keep only a rolling window of recent events — rejected: it adds a threshold nobody can justify and still
  drops the last pause of an idle operator, or keeps arbitrary history.
- Index the identities of `suivi.evenements` in a set inside the projection — rejected: the cost is then linear
  but the journal still grows without bound and each write still copies it whole.
- Move to one store entry per gesture — rejected for now: it is a larger change, and with the journal bounded by
  pending and refused gestures nobody has measured a need. It stays the next step recorded by ADR 0007 should a
  measure justify it.
- Purge on a timer or at start-up — rejected: only a complete activated reference proves a gesture is integrated.

## Decision

Activating a complete reference is one pure domain function, `afterActivatingReferentiel`, applied to the journal
read inside the same IndexedDB transaction that stores the reference: the cleanup and the activation commit
together or not at all. A failed reference read activates nothing and cleans nothing.

The function visits every event, keeping the order, and decides for each:

| Event                                                                       | Fate      |
| --------------------------------------------------------------------------- | --------- |
| pending                                                                     | kept      |
| refused                                                                     | kept      |
| accepted, last gesture of its operator, whatever the state of that gesture  | kept      |
| accepted, carrying a suspension of the pause of its operator's last gesture | kept      |
| any other accepted                                                          | forgotten |

The last gesture and the last pause are read through the same owner as `PauseEnCours`, `DernierePause`, so the
two rules cannot diverge: whatever `PauseEnCours` reads is kept. A pending last gesture without suspension ends the
earlier pause of its operator, whose accepted gestures are then forgotten, exactly as that pause no longer
reopens anything.

The activation also produces:

- the identities of each `suivi.evenements`: those of the received reference, which the HTTP adapter leaves empty
  today, plus those of the accepted gestures kept for that element, without duplicate. A kept accepted gesture is
  thus still recognised as integrated and is not projected again;
- `pausesArretees` restricted to the pauses still carried by a kept gesture. A pause identity is never reused,
  and the last pause of every operator stays in the journal.

The rule rests on a hypothesis the code already made: a gesture accepted before the reference was read is in
that reference. `saveReferentiel` is called only by the synchronization, under its lock and after the queue has been
drained; a gesture appended while the reference is read is still pending and therefore kept. Cleanup happens only
when a complete reference is activated, never on a failed or partial refresh, and a long outage cleans nothing.

## Consequences

### Positive

- The journal's size stops depending on past activity: it follows pending gestures, refused gestures and at most
  a few gestures of pause per operator. The quadratic projection cost applies to that remainder.
- The projection, the pause and the pointage view give the same result before and after a cleanup; only audit
  history disappears.
- One owner for what the pause needs, shared by the cleanup and `PauseEnCours`.

### Negative

- The pupitre keeps no audit trail of accepted gestures. The server journal is the only history, and a
  question about what an operator did yesterday is answered there, not on the device.
- The rule is correct only while an accepted gesture is integrated in the reference that follows its
  acceptance. A server that returned a reference older than an acceptance it had acknowledged would see the gesture
  forgotten and absent from the projection until the next refresh.
- An accepted gesture that is last of its operator stays indefinitely while that operator does nothing else; it
  is the price of the last pause never expiring.
- Anything that grows while the network is away is not cleaned: a long outage still serialises the whole pending
  queue at every write. Only an alert on stale pending gestures, decided separately, limits it in practice.
- Journals that grew before this decision are cleaned at the first reference refresh following the deployment,
  and that first write stays heavy.

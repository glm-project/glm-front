# 0050 — Erase the workshop journals on an explicit reset

## Status

`Accepted`

Amends [ADR 0007](0007-durable-offline-pupitre.md): the former company's journal is no longer suspended intact
after a reenrolment that follows an explicit reset. The automatic return to enrolment after a definitive loss of
authorization keeps every journal, as ADR 0007 and [ADR 0009](0009-pupitre-domain-responsibilities.md) describe.

`Amended by` [ADR 0054](0054-ignore-incoherent-pointages-at-reception.md): the journal document is now `atelier-activites-v2:<tenant>`. The
erasure removes every document under that prefix and nothing else, so the format change leaves this decision intact; the
documents of the obsolete prefixes are discarded when a journal is read.

## Context

The reset gesture (three-second hold on the logo, then a confirmation) revokes the device enrolment on the
server and sends the pupitre back to its first request. It never touched the journals: each company's
`atelier-activites-v1:<tenant>` document (now `atelier-activites-v2:`) stayed on disk, pending gestures included. After the next enrolment the
pupitre read that disk again and published the old gestures under the new credential, whoever now owned the
device and whichever company it was enrolled for.

The administrator who resets a device means to hand it over or to start it afresh, and the journal is the one
place where the old operator's work and the old company's reference survive. Keeping it contradicts that intent.
Erasing it loses every gesture the server never received, which is irreversible, so the person confirming must
know how many are at stake. The journals are also the only copy of the pending work: the server has no other.

The automatic return to enrolment is a different event. A refresh credential revoked or a session removed from
another tab says nothing about the work already captured, and the same device is expected to resume it once
enrolled again.

## Considered options

- Erase every company journal on an explicit reset, warn when pending gestures exist — **kept**: it matches the
  administrator's intent, loses nothing the confirmation did not announce, and leaves the automatic return alone.
- Keep the journals and rely on the new enrolment to ignore them — rejected: the next enrolment for the same
  company publishes the old gestures, and nothing at the pupitre tells the two cases apart.
- Erase only the journal of the current company — rejected: the device would keep other companies' pending
  gestures and references for a hand-over that the reset is meant to complete.
- Block the reset while gestures are pending — rejected: a device that cannot reach the server could never be
  reset, and the administrator, not the pupitre, decides what is worth losing.
- Publish the pending gestures before erasing — rejected: the reset revokes the credential first and works
  offline; a reset that waited for the network would not be a reset.
- Extend `JournauxDuPupitrePort` with the erasure — rejected: that port is per company
  ([ADR 0009](0009-pupitre-domain-responsibilities.md)); erasing every company is a device-wide operation with
  another caller and another lifetime, so it gets its own port.

## Decision

An explicit reset erases the workshop journals of the device, pending gestures included. The confirmation says so
before it happens: it shows the number of pending gestures of the current company when it is above zero and
renames the action « Réinitialiser quand même ». While that number is being read the confirmation stays
disabled; when it cannot be read, the confirmation shows a generic warning and stays available, so a reset is
never blocked for good. The count covers the current company only, because the pupitre reads one journal at a
time.

`EffacementDesJournauxPort.discardAll()` of the `atelier` context removes every document under the journal prefix
and nothing else: credentials and the enrolment keep their documents. `EffacementDesJournaux` orchestrates the
erasure: it waits for the captures already initiated, takes the `synchronisation` lock so as not to cross an
exchange, erases, then replaces the in-memory journal view by an empty one. The last step is not optional: logout
keeps the selected company, so a stale view would present the pupitre as ready on an empty disk the moment it is
enrolled again.

The `enrolement` context reaches that service only through its own port, `JournauxDeLAtelierPort`, implemented by
a secondary adapter over the primary adapter of `atelier`. `reinitialiser()` logs out, which cuts every exchange,
moves to the request step at once so the keypad disappears, erases, then starts the enrolment again. The new
enrolment never starts before the erasure ends. A failed erasure goes to the error handler and the reset
continues: refusing to reset would keep the device bound to its old identity.

## Consequences

### Positive

- A reset hands over a clean device: no gesture of the previous enrolment can be published under a new
  credential, and no reference of the previous company stays readable on disk.
- The administrator learns the cost before paying it, on the one path where the loss is deliberate.
- The automatic return to enrolment keeps its guarantee that a loss of authorization never costs captured work.
- The orchestration has one owner and the rule that serializes it with exchanges stays in `atelier`.

### Negative

- The erasure is irreversible. A pending gesture counted in the warning, or one of another company that the
  count does not cover, is lost for good once the administrator confirms.
- The warning counts the current company only. Another company's pending gestures, which a previous enrolment
  could have left, are erased without being announced.
- A failed erasure leaves the old journals on disk while the device is enrolled again, so the old gestures can
  still be published. The only trace is the error handler.
- The count is read before the confirmation, not at the instant of erasure: a gesture captured between the two is
  erased unannounced. Captures are blocked while a reset confirmation is open, which narrows the window without
  closing it.

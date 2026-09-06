# Offline pupitre

The pupitre acknowledges a gesture only after durable local acceptance. Network synchronization is a later
effect, not the condition for confirming the operator's action.

## Durable storage is the acceptance boundary

`LocalStoragePort` abstracts IndexedDB documents and Web Locks. `IndexedDbLocalStorage.update` resolves on
transaction completion, not on the `put` request. Storage failure rejects explicitly; there is no volatile
fallback that pretends to have captured work.

`JournalDuPupitre` is the local consistency root for one company. `JournauxDuPupitrePort` exposes company reads,
atomic gesture batches, reference activation and push outcomes.
`IndexedDbJournauxDuPupitre` alone owns document keys and layout. Keep application code and tests on the port so a
schema change stays local to that adapter.

Each tenant has an independent journal. Reenrolment selects another journal without deleting or pushing the
former tenant's pending work. Gestures receive their UUID and business timestamp at the operator action,
before asynchronous capture begins.

## Domain owners decide the gesture

`FenetreOperateur` resolves the operator, checks workstation qualifications, prepares implicit arrival and
resumption, and maintains the frozen view of one operator window. Only a successfully committed capture
advances that view.

`GesteReplayPolicy` owns contextual refusal absorption and the single concurrency retry. It compares domain
motifs, never transport URNs.

`OfflinePupitre` coordinates capture and visible snapshots. `PupitreSynchronization` coordinates
authenticated exchange, FIFO publication, aggregate rereads and reference refresh. Keep storage,
authentication and transport mechanics out of the domain owners.

## Synchronization preserves evidence

The queue is FIFO and continues after known business refusals. Persist the refusal and its cause. An unknown
technical failure leaves the gesture pending and stops that push, allowing a later trigger to retry it.

An identical retry reuses the original body. For `saisie-concurrente`, reread the affected aggregate and
retry once; retain a second refusal. Never generate a new UUID or occurrence time during replay.

Refresh the complete operator and workshop reference at boot, on the browser online event and on the runtime
interval. Publish the pair only after every page of both collections passes total, duplicate and progress
checks. Activating that post-write snapshot records accepted pointage identifiers in the local reference so
their optimistic effects are no longer applied, while retaining the gestures in the audit trail. A failed
refresh preserves the previous complete cache and its optimistic effects.

Only push outcomes set connectivity. The browser online event is a trigger, not evidence that the server is
reachable. A received business refusal proves connectivity even though the gesture remains refused.

## Runtime lifecycle is explicit

`PupitreRuntime` restores authentication and owns the initial synchronization, online listeners and refresh timers. Starting it is
idempotent. Its destruction removes listeners, clears timers and prevents later work from starting. Tests use explicit
completion signals for asynchronous exchanges; arbitrary waits hide ordering failures.

The service worker caches the application shell and static assets only. It does not cache API responses or
implement the durable queue; [ADR 0004](adr/0004-ngsw-caches-the-pupitre-shell-and-nothing-else.md) owns that
separate boundary.

`npm run test:production-offline` exercises that boundary in production Chrome. It waits for the generated
worker to activate and control a restarted pupitre, verifies the browser is offline with an uncached failed
request, and recreates the application twice while disconnected. Durable setup and inspection use
`JournauxDuPupitrePort`; the fixture never reads or writes the local adapter's database layout. A second clean
origin with `ngsw-worker.js` unavailable proves that HTTP cache or the fixture server cannot make the same
offline navigation pass.

[ADR 0007](adr/0007-durable-offline-pupitre.md) records durability and synchronization. [ADR 0009](adr/0009-pupitre-domain-responsibilities.md)
records the domain and application ownership split. [ADR 0013](adr/0013-keep-business-decisions-in-rich-domain-models.md)
extends that decision to the designation's interaction and lifecycle rules.

## Designation screen integration

`DesignationOperateur` owns the numeric entry, correction, explicit validation, unknown code and temporary
designation. It receives time explicitly and owns the `FenetreOperateur` shared by designation and capture.
`OfflinePupitre` coordinates local resolution and closure, publishes each designation transition and
explicitly replaces its inactivity schedule through a domain port. The secondary timer adapter only executes
the requested callback. `OfflinePupitre` releases its designation on destruction. The page calls `finish()`
when it is left; switching from keypad to pointage does not destroy the coordinator or close the designation.
`Designation` translates touch and keyboard events and renders the application snapshot, without owning its
lifetime.

The domain checks and renews validity at each gesture's initiation, even when the screen's expiry callback
has not run. Expiry immediately prevents new gestures; captures already initiated retain their operator and
occurrence time and drain before the window is released. The next reference becomes visible after that
drain. The application keeps a single closing operation in flight.

A reset keypad accepts the first new digit while the previous closure or cancelled resolution is still
pending. Validation stays unavailable until that operation finishes. A late resolution cannot reopen an
expired designation or erase a new partial code. Timer callbacks ask the domain to check the current
deadline instead of unconditionally closing a designation that may have been renewed.

The composition gates the keypad on enrolment and reference availability, then switches views on the
same URL. The pointage view's “J'ai fini” action calls `finish()`. Every screen press, including blank
chrome, goes through `registerPress()` before a business command: a `false` result consumes the entire
press, including its subsequent click, because the deadline had already elapsed. Ignore repeated physical
keydown events before calling this guard. Closing the designation must also dismiss the pointage popup.
The keypad already handles its own pointer and physical keyboard events; its parent only needs to route
presses outside it. These composition and pointage responsibilities belong to #75 and #76.

The guard consumes a press that discovers an overdue deadline that has not yet been handled. If the expiry
callback has already reset the keypad, the next press starts a fresh code. This rule also applies after
OS sleep, as agreed in #74: no separate OS-resume detection or timer-delay threshold is needed.

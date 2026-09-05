# Offline pupitre

The pupitre acknowledges a gesture only after durable local acceptance. Network synchronization is a later
effect, not the condition for confirming the operator's action.

## Durable storage is the acceptance boundary

`StockageLocalPort` abstracts IndexedDB documents and Web Locks. `IndexedDbStockageLocal.update` resolves on
transaction completion, not on the `put` request. Storage failure rejects explicitly; there is no volatile
fallback that pretends to have captured work.

`JournalDuPupitrePort` exposes company reads, atomic gesture batches, reference activation and push outcomes.
`JournalLocalDuPupitre` alone owns document keys and layout. Keep application code and tests on the port so a
schema change stays local to that adapter.

Each tenant has an independent journal. Reenrolment selects another journal without deleting or pushing the
former tenant's pending work. Gestures receive their UUID and business timestamp at the operator action,
before asynchronous capture begins.

## Domain owners decide the gesture

`FenetreOperateur` resolves the operator, checks workstation qualifications, prepares implicit arrival and
resumption, and maintains the frozen view of one operator window. Only a successfully committed capture
advances that view.

`PolitiqueDeRejeu` owns contextual refusal absorption and the single concurrency retry. It compares domain
motifs, never transport URNs.

`PupitreHorsLigne` coordinates capture and visible snapshots. `SynchronisationDuPupitre` coordinates
authenticated exchange, FIFO publication, aggregate rereads and reference refresh. Keep storage,
authentication and transport mechanics out of the domain owners.

## Synchronization preserves evidence

The queue is FIFO and continues after known business refusals. Persist the refusal and its cause. An unknown
technical failure leaves the gesture pending and stops that push, allowing a later trigger to retry it.

An identical retry reuses the original body. For `saisie-concurrente`, reread the affected aggregate and
retry once; retain a second refusal. Never generate a new UUID or occurrence time during replay.

Refresh the complete operator and workshop reference at boot, on the browser online event and on the runtime
interval. Publish the pair only after every page of both collections passes total, duplicate and progress
checks. A failed refresh preserves the previous complete cache.

Only push outcomes set connectivity. The browser online event is a trigger, not evidence that the server is
reachable. A received business refusal proves connectivity even though the gesture remains refused.

## Runtime lifecycle is explicit

`PupitreRuntime` starts after authentication restoration and owns online listeners and refresh timers. Its
destruction removes listeners, clears timers and prevents later work from starting. Tests use explicit
completion signals for asynchronous exchanges; arbitrary waits hide ordering failures.

The service worker caches the application shell and static assets only. It does not cache API responses or
implement the durable queue; [ADR 0004](adr/0004-ngsw-caches-the-pupitre-shell-and-nothing-else.md) owns that
separate boundary.

[ADR 0007](adr/0007-durable-offline-pupitre.md) records durability and synchronization. [ADR 0009](adr/0009-pupitre-domain-responsibilities.md)
records the domain and application ownership split.

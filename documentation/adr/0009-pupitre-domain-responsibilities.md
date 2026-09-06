# 0009 — Give operator windows and replay rules a domain owner

## Status

Accepted. Refines the ownership in ADR 0007; complements the method extraction in ADR 0008.

## Context

The offline foundation combines decisions about workshop gestures with storage, authentication and network
coordination in `OfflinePupitre`. Private method extraction makes each step readable but leaves those
business decisions in the application layer. The online and offline transports also implement the same
contextual refusal exceptions independently. Tests reaching into document keys obstruct storage evolution.

## Considered options

- Keep extracting private application methods — insufficient: the ownership of the rules stays unchanged.
- Introduce a bounded context or a service for each step — rejected: the vocabulary and invariants already
  belong to `atelier`; neither another boundary nor forwarding services would clarify them.
- Give the rules domain owners and the durable journal its own port — kept. Keep reference data as read
  models rather than wrapping every interface in a class.

## Decision

`FenetreOperateur` resolves the local operator, checks workstation qualifications, prepares implicit arrival
and resumption, and maintains the window's frozen view. Gesture identities are supplied at the operator's
actual action. The prepared capture chooses its arrival only when it executes in the capture queue; only
successful durable acceptance advances the window. This preserves the first-pointage race and disk-failure
semantics without giving the domain an asynchronous storage dependency.

`GesteReplayPolicy` owns the contextual exceptions and the single concurrency retry. The HTTP exchange adapter and
offline synchronization use its decisions. A transport remains responsible for translating HTTP failures;
the HTTP adapter supplies an optional normalized workshop refusal motif alongside the original diagnostic
code. The replay policy compares only this domain motif and never constructs or parses transport URNs;
an unknown offline business URN is retained verbatim and cannot accidentally match another context's code.

`OfflinePupitre` coordinates capture and publication. `PupitreSynchronization` coordinates authenticated
exchanges, FIFO processing, aggregate rereads and reference refreshes. Their callbacks publish snapshots;
only the capture coordinator decides when a snapshot becomes visible to the operator.

`JournauxDuPupitrePort` exposes company reads, atomic gesture batches, reference activation and push outcomes.
`IndexedDbJournauxDuPupitre` owns the document layout and delegates durable transactions and locks to
`LocalStoragePort`. Its session lock is the existing authentication lock; changing the application port does
not create an independent lock that would let a credential commit overlap an outgoing gesture.

## Consequences

There are two application coordinators and two domain rule owners to navigate, instead of one application
class containing every decision. The journal port adds one adapter; changing its document keys or storage
layout no longer changes the application coordinator or its fixture.

Tests observe prepared gestures, restored reference and activity, retained diagnostics, port outcomes and
server-received gestures. A method or file rename requires adjusting imports or invocation, but does not
change an expected business result. A document-schema change is limited to the local adapter and the
browser's durable-state fixture. The browser fixture seeds storage because no capture screen exists yet;
its journey asserts signed requests, connectivity, restart replay and absence of a replay after acceptance,
without reading storage documents to decide success.

The storage contract uses distinct clients sharing the same durable database. Its exclusion test observes
that a second client cannot enter until the first leaves, and is checked by temporarily bypassing Web Locks:
the modified adapter must fail that guarantee. Explicit completion signals replace repeated arbitrary waits.

Runtime tests retain both application coordinators and replace only authentication, journal and server ports.
They observe complete gestures received at startup, online events and timer ticks; after destruction, a new
gesture remains pending. A failed storage exchange leaves the gesture available for the next trigger.
Changing coordinator methods, call counts or their internal division of work does not change these expected
outcomes. The journal's synchronization boundary waits for in-flight exchanges before checking results;
only interval timers are simulated, leaving I/O fixtures asynchronous.

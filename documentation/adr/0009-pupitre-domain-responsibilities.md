# 0009 — Give operator windows and replay rules a domain owner

## Status

Accepted. Refines the ownership in [ADR 0007](0007-durable-offline-pupitre.md); complements the method
extraction in [ADR 0008](0008-extract-methods-to-expose-intent.md). Complemented by
[ADR 0013](0013-keep-business-decisions-in-rich-domain-models.md), which generalizes the same ownership rule
to every context and brings interaction and lifecycle rules into the domain.

## Context

The offline foundation combines decisions about workshop gestures with storage, authentication and network
coordination in `AtelierCoordinator`. Private method extraction makes each step readable but leaves those
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

`AtelierCoordinator` coordinates capture and publication. `PupitreSynchronization` coordinates authenticated
exchanges, FIFO processing, aggregate rereads and reference refreshes. Their callbacks publish snapshots;
only the capture coordinator decides when a snapshot becomes visible to the operator.

`JournauxDuPupitrePort` exposes company reads, atomic gesture batches, reference activation and push outcomes.
`IndexedDbJournauxDuPupitre` owns the document layout and delegates durable transactions and locks to
`LocalStoragePort`. Its session lock is the existing authentication lock; changing the application port does
not create an independent lock that would let a credential commit overlap an outgoing gesture.

## Consequences

### Positive

- The window and replay rules can be exercised with explicit time and no storage, network or Angular, because
  they no longer live inside the coordinator that owns those dependencies.
- The HTTP exchange and offline synchronization can no longer drift apart on refusals: both ask
  `GesteReplayPolicy`, which owns the contextual exceptions and the single concurrency retry.
- The policy compares a normalized domain motif and never constructs or parses a transport URN, so an unknown
  offline business URN is retained verbatim and cannot accidentally match another context's code.
- A document-schema change is confined to the local adapter and the durable-state fixture; the application
  coordinator does not move. A method or file rename changes wiring, not an expected business result.

### Negative

- Two application coordinators and two domain rule owners to navigate, instead of one class holding every
  decision, plus one more port and one more adapter.
- The journal's session lock is deliberately the existing authentication lock. Nothing enforces that: a later
  change to the application port can introduce a second lock and let a credential commit overlap an outgoing
  gesture, and only review will catch it.
- Splitting capture from publication puts the visibility decision in one coordinator and the exchange in the
  other. Which snapshot an operator sees, and when, is now a contract between them rather than a local call.

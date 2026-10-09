# 0007 — Persist the pupitre before acknowledging a gesture

## Status

Accepted. Implements issue 53 and the decisions confirmed during its execution. Supersedes the in-memory
credential decision in [ADR 0003](0003-hand-written-device-grant-for-the-pupitre.md) and the offline-specific
pagination and retry assumptions in [ADR 0006](0006-how-the-front-calls-the-back.md). Refined by
[ADR 0009](0009-pupitre-domain-responsibilities.md), which moves the window and replay rules out of the
application coordinator into domain owners. Complemented by
[ADR 0026](0026-enrol-pupitre-screen-and-keycloak-delegation.md), which gives the enrolment its screen.
Issue 165 replaced paged reference acquisition with one unpaged `GET /api/pupitre/referentiel` response.
The backend uses READ COMMITTED; successive queries can observe concurrent commits. This response is
complete acquisition, without a shared transactional snapshot. Revised under
[ADR 0045](0045-keep-the-pause-on-the-pupitre.md): pause memory remains local and atomic.
Amended by [ADR 0054](0054-ignore-incoherent-pointages-at-reception.md): a gesture
carries a type and a workstation, no intention or target; no accepted conflict diagnostic is retained; the document
key is `atelier-activites-v2:<tenant>`, and the obsolete `atelier:` and `atelier-activites-v1:` documents are discarded.
Amended by [ADR 0049](0049-forget-integrated-gestures-at-reference-activation.md): an accepted gesture is
forgotten once a complete reference that integrates it is activated, except the last gesture and last pause of
each operator, so the journal no longer retains acknowledged events or grows with past activity; pending and
refused gestures stay.
Amended by [ADR 0050](0050-erase-workshop-journals-on-explicit-reset.md): an explicit
reset erases every company journal, pending gestures included, so the former queue is suspended intact only
after the automatic return to enrolment.

## Context

The enrolled pupitre must restart without a network and continue collecting gestures. An accepted gesture
must survive losing the tab, including when the server committed it but the local acknowledgement did not.
Its operator code identifies a person locally; it does not authenticate a new session. The back now requires
an event UUID and accepts the original business timestamp, returning 200 for an identical replay.

The composition currently has no pointing screen. The work therefore supplies a callable foundation and
connects its lifecycle and passive connectivity state to the existing shell. It does not invent that screen.

## Considered options

- Native IndexedDB behind a shared storage port — kept. A read/write transaction commits a complete local
  change before its promise resolves; independent tabs cannot overwrite one another's append.
- `localStorage` or a memory queue — rejected. The former offers no transaction across concurrent writers;
  the latter loses acknowledged work at restart.
- A storage library in the production bundle — rejected. One object store and Web Locks suffice here.
  `fake-indexeddb` is a pinned development dependency, exercising the real transaction contract rather than
  replacing it with one mock per method.
- Service-worker `dataGroups` — rejected. They cannot express operator-window activation, company partitioning,
  write ordering, or the contextual business refusal rules. The existing asset-only PWA is unchanged.

## Decision

`shared/local-storage` owns `LocalStoragePort`. Its IndexedDB adapter stores structured documents in
`glm-pupitre/documents`. `update` requests strict transaction durability and resolves on transaction completion, never on a successful `put` request.
Storage failures reject explicitly. A separate Web Lock serializes synchronization across tabs, while local
appends remain available during a network request. Another lock coordinates device credential commits with
outgoing gestures; the authentication port rereads the selected durable session before an exchange.

`AtelierCoordinator` coordinates capture; `PupitreSynchronization` coordinates exchange. Each company has
its own `atelier-activites-v2:<tenant>` document containing the complete last reference, original gestures,
outcomes, pause markers and the last push state. Reenrolment after an automatic return selects a different document. The former document remains intact and
its pending queue is suspended; an explicit reset erases every document, pending queue included. Gestures carry their UUID and timestamp before asynchronous work starts. A first activity commits its captured opening alone. A finish closes the activity of its key, and a tile press that changes a category sends a finish then an opening at
the same time. A deferred global batch is decided from the updated window with deterministic identities
and its initiation timestamp; an atomic stop invalidates resumption memory even for an empty batch.
An unsuccessful local commit confirms nothing and changes no optimistic view.

The queue is FIFO. An identical retry carries the same body. A concurrent entry triggers a reread of the affected workshop item
then one identical retry; a further business refusal is retained with its cause, and following gestures continue.
Every other published business code likewise becomes a durable refusal with its cause. Following gestures continue,
even for the same operator. Unknown technical failures remain pending and stop that push. No record has an
application size limit, expiry or rotation. Activating a complete reference forgets the accepted gestures it
integrates, except the last gesture and last pause of each operator
([ADR 0049](0049-forget-integrated-gestures-at-reference-activation.md)).

`HttpAtelierExchange` reads operators and workshop elements together, unpaged and unfiltered by operator, in
one `GET /api/pupitre/referentiel` response under READ COMMITTED. It emits no
request at all without a credential, and ignores the response's `genereLe` version. A failed refresh preserves
the previous complete cache indefinitely. Refresh is attempted on the triggers listed in
[Offline pupitre](../offline-pupitre.md); all of them run in the background except the enrolment screen's
retry. The online event is only a trigger; it never sets the connectivity
indicator. Only push outcomes do that. A received business refusal confirms connectivity while retaining the
refusal separately.

`CurrentOperateurLifecycle` reconciles the current immutable window from its company's journal without
changing its designated operator or frozen observation time. Optimistic effects apply only to local activity
events not already represented by accepted server identities. This prevents losing an accepted activity
before refresh and applying it twice after restart. Refusal reconciliation removes its optimistic effect.
A failed refresh retains the complete previous reference. Reference data
remain pupitre read models, without imports from another context's domain.

PAUSE commits eligible finishes and their suspension in one durable batch; REPRENDRE opens new
activities on still eligible elements and workstations. The pause belongs to the recording pupitre. TOUT
ARRÊTER commits N finishes and clears that operator's resumption memory atomically, N=0 included, while
retaining pending work and refusals. The activity format discards the obsolete `atelier:` and `atelier-activites-v1:` documents without
reading or migrating them; credentials and enrolment remain independent.

The device adapter persists the refresh credential, access-token expiry and company in the same IndexedDB
store. It restores them at startup, serializes renewal across tabs and commits rotation before exposing the
new credential. If logout abandons a rotation during its commit, the adapter conditionally removes that
rotated session too. Each removal compares the complete expected session, preserving a replacement enrolled
meanwhile. Restart assertions observe authorization through its port, so changing the stored document layout
does not alter the expected result. `invalid_grant` removes credentials while retaining the selected company and starts device
enrolment again. The pupitre-specific interceptor also retires an authorization refused with 401/403;
it first checks the durable session so a delayed refusal cannot retire a newer company. Local collection
remains available from the cache. Disk storage does not make bearer tokens
inaccessible to injected same-origin code; this is the explicit trade required by unattended restart.

## Consequences

### Positive

- A gesture the operator sees accepted has been committed. Nothing acknowledges before the transaction
  completes, so a lost tab, a crash or a restart cannot swallow work the screen already confirmed.
- An enrolled pupitre keeps collecting through a network outage of any length, and a server that committed a
  gesture whose acknowledgement was lost returns 200 on the identical replay rather than duplicating it.
- Company partitioning is structural: reenrolment selects another document, and the former queue is suspended
  intact rather than merged. Only an explicit reset discards it, after announcing how many gestures it holds.
- Behavior is what the assertions hold. Moving or renaming an implementation file, a private helper or a CSS
  class does not invalidate them, so the document layout stays free to change.

### Negative

- Chromium/Firefox/Safari must provide IndexedDB and Web Locks in a secure context. Unsupported or failed
  local storage fails explicitly; there is no fallback that pretends to have recorded a gesture.
- Browser-managed quota and user deletion remain possible. No application cap can eliminate those platform
  failures, and requesting another gesture cannot recover a failed commit.
- Each company document grows with its pending and refused gestures, with no size limit or expiry; accepted
  gestures are forgotten at reference activation (ADR 0049). Transactions copy that document today; an event-indexed store is the next change if measured growth makes
  this costly, and it must preserve the same atomic contract.
- The reference read trusts server identifiers and semantics. Under READ COMMITTED, concurrent commits can
  become visible between its queries; a single response does not make both collections one historical instant.
  A failed refresh always keeps the previous complete reference.
- Persisting the refresh credential puts a bearer token where injected same-origin code can read it. That is
  the explicit price of unattended restart, and no browser storage removes it.
- Manual refusal replay/correction, service-screen diagnostics and back-office supervision remain out of scope.

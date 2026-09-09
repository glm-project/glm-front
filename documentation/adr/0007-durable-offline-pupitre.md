# 0007 — Persist the pupitre before acknowledging a gesture

## Status

Accepted. Implements issue 53 and the decisions confirmed during its execution. Supersedes the in-memory
credential decision in [ADR 0003](0003-hand-written-device-grant-for-the-pupitre.md) and the offline-specific
pagination and retry assumptions in [ADR 0006](0006-how-the-front-calls-the-back.md). Refined by
[ADR 0009](0009-pupitre-domain-responsibilities.md), which moves the window and replay rules out of the
application coordinator into domain owners. Complemented by
[ADR 0026](0026-enrol-pupitre-screen-and-keycloak-delegation.md), which gives the enrolment its screen.

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

`atelier/application/AtelierCoordinator` drives the queue and operator windows. Each company has its own
`atelier:<tenant>` document containing the complete last reference, original gestures, outcomes and the last
push state. Reenrolment selects a different document. The former document remains intact and its pending
queue is suspended. Gestures carry their UUID and timestamp before asynchronous work starts. The first
activity of a window commits arrival assurance, implicit resumption and the activity together, in that order.
An unsuccessful local commit confirms nothing and changes no optimistic view.

The queue is FIFO. An identical retry carries the same body. Only an existing arrival on arrival assurance
and a forbidden presence transition on implicit resumption are absorbed. A concurrent entry triggers a reread
then one identical retry; a further business refusal is retained with its cause, and following gestures continue.
Every other published business code likewise becomes a durable refusal with its cause. Following gestures continue,
even for the same operator. Unknown technical failures remain pending and stop that push. No record has an
application size limit, expiry, rotation or purge; acknowledged events are retained too.

`HttpAtelierExchange` reads every page of operators and workshop elements, without filtering by operator.
It publishes the pair only after both collections complete, rejects changed totals, empty intermediate pages
and duplicate identifiers, and aborts if the credential changes during reading. A failed refresh preserves
the previous complete cache indefinitely. Refresh is attempted at boot, on the browser's online event and
every minute. The online event is only a trigger; it never sets the connectivity indicator. Only push outcomes
do that. A received business refusal confirms connectivity while retaining the refusal separately.

The reference and accepted/refused outcomes activate between operator windows. Within a window, only its
own committed gestures change the optimistic view. The projection starts from server activities and overlays
local activity events not already present in the server journal. This avoids both losing an accepted activity
before its next snapshot and applying one twice after a crash. A refused event loses its optimistic effect
when the window closes. The reference contains pupitre read models, not imports from the operator domain.
Presence remains an operator-level gesture; it is never fanned out into per-element writes.

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
  intact rather than merged or discarded.
- Behavior is what the assertions hold. Moving or renaming an implementation file, a private helper or a CSS
  class does not invalidate them, so the document layout stays free to change.

### Negative

- Chromium/Firefox/Safari must provide IndexedDB and Web Locks in a secure context. Unsupported or failed
  local storage fails explicitly; there is no fallback that pretends to have recorded a gesture.
- Browser-managed quota and user deletion remain possible. No application cap can eliminate those platform
  failures, and requesting another gesture cannot recover a failed commit.
- Each company document grows with its event history, with no size limit, expiry, rotation or purge.
  Transactions copy that document today; an event-indexed store is the next change if measured growth makes
  this costly, and it must preserve the same atomic contract.
- Offset pagination has no server snapshot version. Count and identity checks detect common concurrent edits,
  but an equal-size replacement across pages can escape them. A server cursor/snapshot is required to prove
  one instantaneous reference version; a failed detectable refresh always keeps the previous one.
- Persisting the refresh credential puts a bearer token where injected same-origin code can read it. That is
  the explicit price of unattended restart, and no browser storage removes it.
- Manual refusal replay/correction, service-screen diagnostics and back-office supervision remain out of scope.

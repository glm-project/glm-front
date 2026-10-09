# Offline pupitre

The pupitre acknowledges a gesture only after durable local acceptance. Network synchronization is a later
effect, not the condition for confirming the operator's action.

## Durable storage is the acceptance boundary

`LocalStoragePort` abstracts IndexedDB documents and Web Locks. `IndexedDbLocalStorage.update` resolves on
transaction completion, not on the `put` request. Storage failure rejects explicitly; there is no volatile
fallback that pretends to have captured work.

`JournalDuPupitre` is the local consistency root for one company. `JournauxDuPupitrePort` exposes company reads,
atomic gesture batches, reference activation and push outcomes.
`IndexedDbJournauxDuPupitre` alone owns the document layout; the key format lives in `ClesDesJournaux.ts`, which
only the local journal adapters share. Keep application code and tests on the port so a schema change stays local
to those adapters. Erasing every company journal is a device-wide operation with its own port,
`EffacementDesJournauxPort`: `IndexedDbEffacementDesJournaux` removes the documents under the journal prefix, and
nothing else.

Each tenant has an independent journal. Reenrolment after an automatic return selects another journal without
deleting or pushing the former tenant's pending work. An explicit reset instead erases every journal, pending
gestures included, as [ADR 0050](adr/0050-erase-workshop-journals-on-explicit-reset.md) records: its confirmation
announces the pending gestures of the current tenant, `EffacementDesJournaux` waits for the captures already
initiated and for the `synchronisation` lock before erasing, then empties the in-memory journal view so the
pupitre cannot look ready on an erased disk.

Immediate gestures receive their UUID and business timestamp when the screen
declares the intention, before asynchronous capture begins; on the pointage, that is the deadline of the sustained
press, not its start. A deferred global intention receives one UUID root and its business timestamp at that same
declaration; once the updated window decides its batch, every gesture UUID is derived deterministically
from that root before the atomic append. Waiting never introduces new identity randomness or a new occurrence
time.

## Domain owners decide the gesture

`FenetreOperateur` resolves the operator, checks workstation qualifications, captures the pointages a tile press asks for, turns
PAUSE and REPRENDRE into finishes and restarts, and maintains the frozen view of one operator window. `PauseEnCours` decides, from the journal that remains, whether a pause is in progress and what it reopens. Only a
successfully committed capture advances that view.

`GesteReplayPolicy` owns the single concurrency retry. It compares domain
motifs, never transport URNs.

`CurrentOperateurLifecycle` owns the current immutable designation and derives its visible snapshots.
`FraicheurDuReferentiel` owns the decision to refresh the reference and whether that refresh is awaited.
`AtelierCoordinator` coordinates gesture commands and durable capture. `PupitreSynchronization` coordinates
authenticated exchange, FIFO publication, aggregate rereads and reference refresh. Keep storage,
authentication and transport mechanics out of the domain owners.

`GestesRecordingQueue` owns the acceptance queue, shared directly by capture and designation closure.
`EtatHorsLigneDuPupitre` loads and exposes the selected company's journal view; it does not relay capture
commands. Read consumers use that state directly. `AtelierCoordinator` exposes local capture failure separately
from the designation's domain refusal; the primary presentation chooses the message and its precedence.
`EvenementsDuJournal` owns pending-event selection in acceptance order and refused-event queries. Domain
publication functions construct accepted or refused outcomes; synchronization executes and persists them.

## The pupitre writes identifiers and only displays labels

Every gesture carries identifiers — `operateurId`, `suiviId`, `posteId`. Names, element numbers and
workstation labels never leave the screen. A stale label therefore corrupts no data: it misnames a tile for
the length of the outage, and the identifiers behind it stay exact. This is what makes the local reference
cacheable at all.

`glm-back/documentation/atelier-api.md`, under « L'opérateur et le poste sont des identifiants », resolves
those labels at every read and asks the front not to cache them beyond a screen session. The pupitre keeps
its whole reference on disk across restarts and renders designation and tile labels from it, so it holds
that rule for the identifiers it writes back and knowingly diverges for the labels it shows. It is the
capture device that must keep working when the network does not; the back office's online views hold the
rule as written.

Freshness is pushed, never dated. The reference refreshes at boot, on the browser online event, on the
thirty-second interval owned by `PupitreRuntime`, after an accepted capture, when an operator window closes
and when a code came back unknown. The enrolment screen adds the one operator-initiated trigger: its retry
button, offered while the first complete reference is still missing. Every one of those triggers runs the
whole synchronization: pending gestures are published first and the reference is read last, so a failure
earlier in the exchange leaves the reference unchanged. There is no TTL and no per-entry expiry marker; the
chrome's binary connected indicator already carries that information.

An operator added to the reference is therefore missing from the cache for a while, and the pupitre says
nothing about it. Online, the runtime interval closes that gap on its own, and the unknown-code trigger
usually closes it sooner: the operator types their code again and it works.

That last trigger fires once per code. Retyping an identifiant that the freshly pushed reference still does not
know reads nothing new, and a mistyped code on a keypad repeats easily, so `FraicheurDuReferentiel` holds it
back rather than reading the whole reference again. Any successful designation releases the hold.

## Synchronization preserves evidence

The queue is FIFO and continues after known business refusals. Persist the refusal and its cause. An unknown
technical failure leaves the gesture pending and stops that push, allowing a later trigger to retry it.

An identical retry reuses the original body. For `saisie-concurrente`, reread the affected aggregate and
retry once; retain a second refusal. Never generate a new UUID or occurrence time during replay.

Only a completed publication allows synchronization to refresh the complete operator and workshop reference.
Known business refusals do not prevent completion; a technical interruption preserves the previous reference
without attempting a new read. That refresh is one unpaged `GET /api/pupitre/referentiel`, which returns both collections in one response. The backend uses READ COMMITTED; its successive queries
can observe concurrent commits and do not establish a shared transactional snapshot. Its `genereLe` version
is ignored: freshness here is pushed, not dated. Activating that post-write
reference forgets the accepted gestures it integrates, except the last gesture of each operator and the gestures of
that operator's last pause, which `PauseEnCours` still reads; pending and refused gestures stay. It records the
identifiers of the accepted gestures it keeps in the local reference so their optimistic effects are not applied
twice, and drops the stopped pauses that no kept gesture carries. The same transaction stores the reference and
cleans the journal, and a failed refresh cleans nothing. The journal's size therefore follows its pending and
refused gestures, not past activity ([ADR 0049](adr/0049-forget-integrated-gestures-at-reference-activation.md)).

Concurrent synchronization callers share sequential exchanges, and each caller receives publications for
its reconciliation until its requested exchange completes. Callers already waiting when an exchange starts
form one group; their promises settle after that exchange and its storage lock release, without waiting for
later groups. Requests arriving during the exchange or its lock release form the next group. Check for that
group after the storage lock promise settles, and clear the running state in the same continuation as the
final check. Scheduled refreshes therefore cannot prolong the initial workshop load indefinitely.

Only push outcomes set connectivity. The browser online event is a trigger, not evidence that the server is
reachable. A received business refusal proves connectivity even though the gesture remains refused.
The initial workshop load reports its own `CHARGE`, `ECHEC` or `TENANT_ABSENT` outcome to enrolment without
changing that connectivity. The last outcome distinguishes a token missing its tenant claim from a network
failure. A reference is available there only when the active journal view belongs to the currently selected
company.

A technical interruption can leave gestures pending for hours. The designation screen therefore shows a
**publication delay** banner as soon as the oldest pending gesture of the company's journal occurred at least
one hour before the evaluation instant, with the number of pending gestures and that age; it asks the operator
to warn the supervisor. Accepted and refused gestures never count. `EtatHorsLigneDuPupitre` holds the evaluation
instant, which the screen pushes through `updateClock()` when it is displayed and then once a minute, so the
threshold is crossed without any new event. The screen stops pushing when it is left.

## Runtime lifecycle is explicit

`PupitreRuntime` starts the enrolment and owns the online listener and the refresh timer. It installs both
before awaiting that enrolment, so a network event arriving during the first workshop load is not lost.
Starting it is idempotent. Its destruction removes the listener and clears the timer. The first workshop load
belongs to the enrolment, not to the runtime: it happens when the device becomes enrolled, and only then.
Tests use explicit completion signals for asynchronous exchanges; arbitrary waits hide ordering failures.

The runtime also starts observing definitive loss of device authorization before starting its initial enrolment.
After durable credential retirement, including its discovery during cross-tab synchronization or renewal,
it restarts the same visible enrolment, preserving company journals.
That wait is cancellable on destruction; it stays distinct from the network refresh triggers, because a
temporary outage retains the existing device enrolment and offline workshop.

The service worker caches the application shell and static assets only. It does not cache API responses or
implement the durable queue; [ADR 0004](adr/0004-ngsw-caches-the-pupitre-shell-and-nothing-else.md) owns that
separate boundary.

The production pupitre checks for a new application version every five minutes while it is visible and
online, when the network returns and when the PWA becomes visible again. Once the service worker has downloaded
a complete version, the pupitre reloads automatically after the current identifiant entry or operator window
ends and local gesture captures finish. These checks do not run when the service worker is disabled in
development.

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
`CurrentOperateurLifecycle` coordinates local resolution and closure, publishes each designation transition and
explicitly replaces its inactivity schedule through a domain port. The secondary timer adapter only executes
the requested callback. The page calls `CurrentOperateurLifecycle.finish()` when it is left; switching from keypad to
pointage does not destroy the coordinator or close the designation. `Designation` translates touch and keyboard
events and renders the application snapshot, without owning its lifetime.

Only an identifiant absent from the local reference produces the unknown-code state. A technical failure during
resolution goes to `ErrorHandlerPort` and preserves the entered code for another explicit validation, provided
the designation has not expired or been closed. A late failure never restores an expired code or overwrites
new input. It does not trigger the unknown-code reference refresh.

The domain checks and renews validity at each gesture's initiation, even when the screen's expiry callback
has not run. Expiry immediately prevents new gestures; captures already initiated retain their operator and
occurrence time and drain before the window is released. The next reference becomes visible after that
drain. The application keeps a single closing operation in flight.

A reset keypad accepts the first new digit while the previous closure or cancelled resolution is still
pending. Validation stays unavailable until that operation finishes. A late resolution cannot reopen an
expired designation or erase a new partial code. Timer callbacks ask the domain to check the current
deadline instead of unconditionally closing a designation that may have been renewed.

The routed common page owns the permanent chrome, designation and pointage views. The root shell retains
only technical runtime startup and routing. The page gates the keypad on enrolment and reference
availability, then switches views on the same URL, and calls `finish()` when it is destroyed; destruction of
the root-scoped `CurrentOperateurLifecycle` is not the page-exit hook. The pointage view's “J'ai fini” action also calls
`finish()`.

Every screen press, including blank chrome, goes through `registerPress()` when it starts, before a business
command: a `false` result consumes the entire press, because the deadline had already elapsed. For an immediate
control that means its subsequent click; for a pointage gesture target it means the sustained press, since closing
the view destroys the target and its timer before the press can reach its deadline. The command boundary checks the
window again when the intention is declared. Ignore repeated physical keydown events before calling this guard. Closing the designation must
also dismiss the pointage popup. The keypad already handles its own pointer and physical keyboard events;
its parent only needs to route presses outside it. These composition and pointage responsibilities belong
to #75 and #76.

The guard consumes a press that discovers an overdue deadline that has not yet been handled. If the expiry
callback has already reset the keypad, the next press starts a fresh code. This rule also applies after
OS sleep, as agreed in #74: no separate OS-resume detection or timer-delay threshold is needed.

The first action contains only its captured activity gesture. Its chrome identifies the designated operator
and a local pause when one is in progress. Aggregate rereads concern only the affected workshop item.

`TOUT ARRÊTER` is one atomic local mutation: N FIN gestures and durable invalidation of this
operator's resumption memory, including N=0. It retains pending publications and refusals. An aborted transaction changes neither the batch nor the resumption memory; the window
advances only after completion.

`PAUSE` captures one FIN per known interpretable personal activity that has not expired. Each finish carries its local suspension and the opening category to resume. The HTTP
adapter sends only the pointage fields. `REPRENDRE` opens fresh activities with new identities, on still
eligible workstations and elements. A refused suspension is not resumed.
`PauseEnCours` reads that memory from the journal that remains, which always holds the last pause of each
operator; a pause itself never expires.

At the deadline, inclusive, an activity stops being actionable locally, including offline. The deadline of an
activity the server knows is the one the reference gives; that of an activity opened locally is the gesture time plus
`dureeMaximaleDActivite`, which the reference carries and the adapter turns into milliseconds. No duration is written in
the pupitre: an absent, unreadable or null value rejects the reference read, which keeps the previous one. The server
fixes the duration when it receives the opening, not at the gesture time, and keeps no history of the setting.
Every decision receives its evaluation time explicitly. A separate activity timer reevaluates the window
without closing the designation or synthesizing FIN. The indicative duration remains frozen at window
opening. A capture initiated before the deadline keeps its occurrence through delayed I/O.

An activity belongs to a key, operator and workstation within an element, and a key holds at most one activity. A FIN
closes the activity of its key; an opening on a key that is still busy has no local effect, as the server ignores it.
An expired activity frees its key: an opening whose time reaches the deadline replaces it, locally as on the server,
which counts the expired activity as finished. A tile press that changes the category of an activity composes two
pointages with the same timestamp, the FIN first: NC during a work sends a FIN then a `NON_CONFORMITE`, and FIN NC
(the secondary target of a tile in non-conformity) a FIN then a `DEBUT`. The pupitre never relaunches an activity.

A pointage the server judges incompatible with its key answers 409 `pointage-ignore`. The gesture stays refused in the
journal ([ADR 0049](adr/0049-forget-integrated-gestures-at-reference-activation.md)), its optimistic effect disappears
when the window reconciles, and the next synchronization realigns the projection on the reference. Only the closure refusal
is shown to the operator.

The activity journal uses `atelier-activites-v2:<tenant>`. The documents of the obsolete prefixes, `atelier:` and
`atelier-activites-v1:`, are discarded through `LocalStoragePort` when the journal is read, without reading or migrating
them: the pupitres are reset at deployment, and their pending gestures are lost. The key changes whenever the stored
format or a projected rule changes. No credential, enrolment, common database or new company journal is removed. This
format reset is independent of TOUT ARRÊTER, which retains the current journal. [ADR 0045](adr/0045-keep-the-pause-on-the-pupitre.md)
owns local pause memory and [ADR 0054](adr/0054-ignore-incoherent-pointages-at-reception.md) owns the reception rule and
the composed gestures.

A global command pressed while captures are already in flight is retained and decided from the updated
window after those captures settle locally. From that intention until local acceptance, tiles and global
commands are unavailable at both the command boundary and in the rendered controls. “J'ai fini” remains
available: it closes the visible window immediately while already initiated work drains.

The window owns that exclusion through its retained `IntentionGlobaleInitiee`; the application reports local
completion or failure to release it. This Value Object prepares the deferred command with deterministic
gesture identities and the time fixed when the intention was declared. `IdentiteDeFenetre` identifies one opening across immutable
versions, so queued work and a prepared workstation choice can resolve the latest version of that same window.
The designation remains the sole owner of the window during capture, reconciliation and closure. Its visible
projection disappears on closure while the retained model lets previously initiated captures finish.

Under the permanent chrome, the page renders the enrolment screen until the device is enrolled and its first
complete reference is active, and the workshop views afterwards. That switch reads the enrolment context's
projected state, never the reference alone: an administration reset returns the pupitre to enrolment at once,
before the erasure of the journals ends, so the keypad never waits for the disk. The header's own reset gesture opens a confirmation the page
owns. The same chrome identifies a
refused pointage by its element number and a refused gesture of a global command by the originating `PAUSE`,
`REPRENDRE` or `TOUT ARRÊTER` action. Only the closure refusal (`suivi-d-atelier-cloture`) is shown to the
operator, with the server message and only the latest one in a batch; every other refusal stays in the journal
without display. Any local
acceptance failure instead shows “Action non enregistrée — recommencez” until the next durable local success
or window closure.

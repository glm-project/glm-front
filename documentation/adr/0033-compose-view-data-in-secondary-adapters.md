# 0033 — Compose view data in secondary adapters

## Status

Accepted following the review of [PR 138](https://github.com/glm-project/glm-front/pull/138).

Amends [0031](0031-own-workshop-supervision-in-gestion.md): the supervision application consumes one data
read port; its secondary adapter acquires the complete projection directly, without intermediate
source ports. The InMemory configuration also implements only this port.
Amended by [ADR 0054](0054-ignore-incoherent-pointages-at-reception.md): the supervision read no longer carries
conflicting sequences, and no correction changes what the next read shows.
Complements [0013](0013-keep-business-decisions-in-rich-domain-models.md): business interpretation remains
in the domain while acquisition details stay behind the read port.
Complements [0025](0025-route-runtime-errors-through-error-handler-port.md): a view acquisition adapter
reports its failure once and rejects; the primary resource displays the error without logging it again.
Complété par [0048](0048-request-gestion-data-from-the-server-every-time.md) : Gestion / Supervision ne met
pour l'instant aucune réponse métier en cache entre acquisitions ; chacune relit le serveur.

## Context

A view can need several API responses for one functional result. Supervision initially exposed three
source ports to its application coordinator, making it own their completeness checks, concurrency and
operator cache. Changing the backend's endpoint decomposition would then affect application coordination.

## Considered options

- One functional read port, implemented by a secondary composition adapter — **kept**.
- One application dependency per API — rejected as a default: it exposes acquisition topology to the caller.
- One aggregate port backed by three source ports — rejected: the source decomposition remains unnecessary
  even when only the secondary adapter consumes those ports.
- Build the interpreted supervision in the secondary adapter — rejected: it moves business interpretation
  away from its existing domain owner and application invocation.

## Decision

Apply the [view acquisition rule](../architecture.md#acquire-a-view-through-one-read-port-by-default) by
default to new and changed views in either application. Existing views can adopt it when their acquisition
is changed; this decision does not require a repository-wide rewrite.

For supervision, expose only `DonneesDeSupervisionPort`, returning `Promise<DonneesDeSupervision>`. Resolution
guarantees that every required collection was acquired completely. An acquisition failure, including
truncation, is reported once through `ErrorHandlerPort` by the secondary adapter and rejects the read.
The domain separately decides whether the complete data is exploitable through `SupervisionDeLAtelier.determine`.

Use a resource directly in the primary component to load the raw data. An acquisition failure puts the
view in error, including after a successful load; previous data are not retained. The primary displays the
error without logging it again. Use resource's reload and destruction lifecycle instead of an application
loading coordinator or a separate resource factory.

MR3 introduced `InMemoryDonneesDeSupervision` and a first component showing acquisition state and
collection counts. The supervision grid now invokes the domain to classify the acquired activities.
Test acquisition through the component's rendered HTML and refresh button; keep domain rules and the
secondary contract in their own suites.

The supervision HTTP adapter reads `GET /api/atelier/supervision` through `ApiClient`. Each acquisition
reloads the complete, unpaged projection: declared operators and interpreted activities with their
deadline. It keeps no mounted operator cache, so edits appear on the next successful read. A failure rejects
instead of reusing an earlier reference or demonstration. The backend supplies the
common evaluation, deadlines and retained automatic ends; the front classifies and orders the received
data without interpreting raw journals. The primary uses that evaluation for both lanes and freshness.
READ COMMITTED permits concurrent commits between projection queries; a common evaluation is not a
transactional snapshot. A Promise port still does not guarantee HTTP cancellation when the view unmounts.

## Consequences

### Positive

- Endpoint consolidation changes the secondary adapter while preserving the application's contract.
- Acquisition and business interpretation can be exercised through separate seams.
- The caller cannot accidentally publish one source as a complete supervision grid.

### Negative

- The view becomes unavailable on a failed refresh, even when an earlier grid could have been shown.
- An unavailable projection prevents the complete read from succeeding.
- Complete collections can still have been observed at different times; backend snapshot consistency remains unsolved.
- Views whose sections load independently need an explicit functional reason for separate read ports.

# 0033 — Compose view data in secondary adapters

## Status

Accepted following the review of [PR 138](https://github.com/glm-project/glm-front/pull/138).

Amends [0031](0031-own-workshop-supervision-in-gestion.md): the supervision application consumes one data
read port; its secondary adapter makes the operator, working-visit and activity calls directly, without
intermediate source ports. The InMemory configuration also implements only this port.
Complements [0013](0013-keep-business-decisions-in-rich-domain-models.md): business interpretation remains
in the domain while acquisition details stay behind the read port.
Complements [0025](0025-route-runtime-errors-through-error-handler-port.md): a view acquisition adapter
reports its failure once and rejects; the primary resource displays the error without logging it again.

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

Use a primary Angular resource to load and interpret these data. An acquisition failure or an inexploitable
domain result puts the view in error, including after a successful load; the last grid is not retained.
The primary maps a domain refusal to the resource error without logging it as an acquisition failure.
Use resource's reload and destruction lifecycle instead of an application loading coordinator. Read the
evaluation time at the start of each load and pass it explicitly to the domain. A Promise port does not imply
that resource cancellation aborts the underlying HTTP requests; the HTTP adapter owns request completion.

MR3 provides `InMemoryDonneesDeSupervision` for complete and failed scenarios and the primary resource factory.
Implement HTTP acquisition later in one adapter with direct `ApiClient` calls and private mapping methods.
That adapter will own the mounted operator cache and drain engaged requests before completing a read.
The generated backend contract must first support the required open-working-visit query. The HTTP
implementation and its request ordering, pagination and cache tests belong together; no source ports are
introduced to anticipate it.

## Consequences

### Positive

- Endpoint consolidation changes the secondary adapter while preserving the application's contract.
- Acquisition and business interpretation can be exercised through separate seams.
- The caller cannot accidentally publish one source as a complete supervision grid.

### Negative

- The view becomes unavailable on a failed refresh, even when an earlier grid could have been shown.
- An unavailable required source prevents the combined read from succeeding; completion waits for engaged reads.
- Complete collections can still have been observed at different times; backend snapshot consistency remains unsolved.
- Views whose sections load independently need an explicit functional reason for separate read ports.

# 0033 — Compose view data in secondary adapters

## Status

Accepted following the review of [PR 138](https://github.com/glm-project/glm-front/pull/138).

Amends [0031](0031-own-workshop-supervision-in-gestion.md): the supervision application consumes one data
read port; its secondary adapter makes the operator, working-visit and activity calls directly, without
intermediate source ports. The InMemory configuration also implements only this port.
Complements [0013](0013-keep-business-decisions-in-rich-domain-models.md): business interpretation remains
in the domain while acquisition details stay behind the read port.

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

For supervision, expose only `DonneesDeSupervisionPort`. Return complete operator, working-visit and activity
collections, or an explicit incomplete result. Technical failures reject the read. The application retains
refresh coalescing and destruction handling, invokes `SupervisionDeLAtelier.determine`, and preserves the
last usable grid after an unsuccessful load.

MR3 provides `InMemoryDonneesDeSupervision` for complete, incomplete and failed scenarios. Implement HTTP
acquisition later in one adapter with direct `ApiClient` calls and private mapping methods. That adapter will
own the mounted operator cache and drain all engaged requests before completing a read. The generated backend
contract must first support the required open-working-visit query. The HTTP implementation and its request
ordering, pagination and cache tests belong together; no source ports are introduced to anticipate it.

## Consequences

### Positive

- Endpoint consolidation changes the secondary adapter while preserving the application's contract.
- Acquisition and business interpretation can be exercised through separate seams.
- The caller cannot accidentally publish one source as a complete supervision grid.

### Negative

- A composite adapter and its acquisition contract add an indirection.
- An unavailable required source prevents the combined read from succeeding; completion waits for engaged reads.
- Complete collections can still have been observed at different times; backend snapshot consistency remains unsolved.
- Views whose sections load independently need an explicit functional reason for separate read ports.

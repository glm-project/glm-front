# 0033 — Compose view data in secondary adapters

## Status

Accepted following the review of [PR 138](https://github.com/glm-project/glm-front/pull/138).

Amends [0031](0031-own-workshop-supervision-in-gestion.md): the supervision application consumes one data
read port; the secondary composition adapter owns the operator, working-visit and activity reads.
Complements [0013](0013-keep-business-decisions-in-rich-domain-models.md): business interpretation remains
in the domain while acquisition details stay behind the read port.

## Context

A view can need several API responses for one functional result. Supervision initially exposed three
source ports to its application coordinator, making it own their completeness checks, concurrency and
operator cache. Changing the backend's endpoint decomposition would then affect application coordination.

## Considered options

- One functional read port, implemented by a secondary composition adapter — **kept**.
- One application dependency per API — rejected as a default: it exposes acquisition topology to the caller.
- Build the interpreted supervision in the secondary adapter — rejected: it moves business interpretation
  away from its existing domain owner and application invocation.

## Decision

Apply the [view acquisition rule](../architecture.md#acquire-a-view-through-one-read-port-by-default) by
default to new and changed views in either application. Existing views can adopt it when their acquisition
is changed; this decision does not require a repository-wide rewrite.

For supervision, retain the specialized source ports behind a composite secondary adapter. Return complete
operator, working-visit and activity collections, or an explicit incomplete result. Technical failures reject
the read. Retain the operator reference for the mounted view's lifetime; scope the composite adapter to that
same lifetime when wiring the screen. Drain engaged reads before completing the operation so a refresh cannot
overlap unfinished source reads. The application retains refresh coalescing and destruction handling, invokes
`SupervisionDeLAtelier.determine`, and preserves the last usable grid after an unsuccessful load.

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

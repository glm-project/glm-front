# 0026 — Show the pupitre enrolment and delegate its approval to Keycloak

## Status

Accepted. Complements [ADR 0003](0003-hand-written-device-grant-for-the-pupitre.md) and
[ADR 0007](0007-durable-offline-pupitre.md).

## Context

The device grant of ADR 0003 obtains a `user_code` and polls the token endpoint, but nothing ever displayed
that code. A new pupitre could not be enrolled in production even though its adapter worked. The composition
rendered the permanent chrome and nothing else while waiting for credentials and a first reference.

An enrolment is an authorization act, not a workshop gesture. It happens once per device, in front of a
supervisor who is not the operator, and it must not be reachable by mistake from a wall-mounted touchscreen
during production.

The device-grant adapter already owns the protocol, the durable session and its renewal. It reported success
or failure only through the token it later exposed: a caller could not tell a refusal from an expired code
from an unreachable server, and no caller could observe the code while the poll was running.

## Considered options

- Show the code on a dedicated screen and let Keycloak approve it — **kept**.
- Build an approval screen in `gestion` — rejected: neither `gestion` nor the back end owns a device-administration
  API, and interposing one duplicates an authorization act Keycloak performs natively.
- Rotate the code automatically when it expires — rejected: the code would change under the eyes of the person
  typing it.
- Let the screen drive the protocol directly — rejected: the primary adapter would own polling, persistence and
  refusal translation that already belong to the device-grant adapter.

## Decision

Own the enrolment lifecycle in a new business context, `pupitre/contexts/enrolement/`. Its domain holds the
authorization code, its absolute deadline and the state machine; the application coordinates the asynchronous
grant and the workshop load; the primary adapter renders the screen and ticks the countdown.

Expose the grant lifecycle through a narrow port. `DeviceEnrolmentPort.enrol(showCode)` publishes the
authorization code as soon as the authorization server answers, then resolves to one outcome: `ENROLLED`,
`DENIED`, `EXPIRED`, `UNREACHABLE` or `ABANDONED`. The coordinator drives the adapter; the adapter never calls
back into the coordinator, which would close a dependency cycle through `AuthenticationPort`.

Derive expiry in the domain from the deadline and the supplied instant, so the local countdown and the
server's `expired_token` converge on the same state. Never rotate the code silently: the expired state carries
an explicit "Demander un nouveau code" action, as a refusal carries "Recommencer" and an initial network
failure carries "Réessayer".

Keep approval in Keycloak. The pupitre shows the QR code, the `user_code` and the verification URI; a person
with the right to approve authenticates on the Keycloak device page. No repository code implements that page.

Render the enrolment screen instead of the workshop until the first complete reference is active, and keep the
permanent chrome above both. Expose the administration reset behind a three-second press on the `glmfront`
logo followed by a modal confirmation, so no operator reaches it by accident.

## Consequences

### Positive

- A new pupitre can be enrolled in production without a debugger or a seeded database.
- The screen states one cause per failure, and each failure carries the action that resolves it.
- The device-grant adapter keeps ownership of the protocol, persistence and renewal; the context owns the
  visible lifecycle.
- Approval keeps Keycloak's authentication, consent and tenant mapping instead of a home-made equivalent.

### Negative

- Enrolment now depends on the Keycloak client having the device authorization grant enabled and mapping the
  `tenant` claim. That configuration lives outside this repository and breaks the screen when it drifts.
- `reenrol()`, reached when a refresh token becomes `invalid_grant`, still re-enrols silently without showing a
  screen. That path is out of the scope of this decision and remains invisible to the workshop.
- A network cut occurring _during_ the poll is reported as an initial network failure with "Réessayer": the
  polling loop does not distinguish a transient outage from a definitive refusal.
- The administration gesture is unavailable while an operator is designated, because the header then shows that
  operator instead of the logo. Resetting requires finishing the operator window first.
- The context adds a second reader of the workshop load. It reaches it through a port and the
  `TypeScriptChargementDeLAtelier` primary adapter, which is one more indirection than reading `OfflinePupitre`
  directly.

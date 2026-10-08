# Authentication

The common technical contract is at `app/shared/authentication/`. `gestion` owns its Keycloak adapters in
`gestion/shared/authentication/`; `pupitre` owns its device-grant adapters in
`pupitre/shared/authentication/`. Each front chooses an adapter in its composition root.

## The port exposes session capabilities, not an SDK

`AuthenticationPort` is an abstract class so Angular can inject it at runtime. It exposes authentication,
the current bearer token and tenant, session synchronization, and logout. Keep Keycloak, HTTP,
RxJS and browser-storage types outside its signature.

A missing token or tenant is a normal state. Callers branch on the optional value; they do not manufacture a
credential or reach into an adapter.

## Gestion reads the realm roles through a second port

`gestion/shared/authentication/domain/RolesPort.ts` exposes `realmRoles()`, a promise that settles once
authentication has succeeded, with the realm roles of the session. It never rejects and never settles empty
for a failure: when authentication fails or Keycloak opens no session (the window reloads), the promise stays
pending, so no second error is reported and nothing redirects before the reload. Roles are read once, at the
end of `authenticate()`; a role changed in Keycloak applies at the next sign-in, and the back stays the
authority. The port holds no business word. `ROLE_GESTIONNAIRE` and the predicate `isReservedToGestionnaire`
live once, in `gestion/shared/authentication/infrastructure/primary/gestionnaire.ts`, for every Gestion caller.

`KeycloakOidcAuthentication` implements both ports on one object. The header turns `realmRoles()` into a signal
and drops the « Anomalies » destination until it holds `ROLE_GESTIONNAIRE`, so the entry appears when
authentication ends. Do not read this port through `resource()`: a promise that may stay pending would hold the
application unstable. The decision and its alternatives are in
[ADR 0052](adr/0052-reserve-anomalies-to-the-gestionnaire.md).

The `anomalies` route reserves itself with `reservedToGestionnaire`, a `canMatch` guard in
`gestion/shared/authentication/infrastructure/primary/`. It awaits `realmRoles()` and returns `true` for the
gestionnaire, or the `UrlTree` of `/` for anyone else, so the reserved address simply does not match and the
Supervision opens. It never returns `false`: the repository has no `**` route, so a refusal would raise NG04002
towards `ErrorHandlerPort`. While authentication is pending, and for good if it fails, the guard stays pending
with the promise: the address does not change and no error is added to the authentication failure. A unit
spec runs the guard through `TestBed.runInInjectionContext`; the application tests hold, release or refuse
authentication to cover the journeys. The redirection is not recorded for a consultant: in-app, the router never
moved the URL to the reserved address, so it pushes `/` after the current page; on a load or a browser
traversal it replaces the entry. Going back therefore returns to the previous page and never to the reserved
address.

## Each front owns its wiring

`gestion/auth.provider.ts` builds `keycloak-js` from the front environment, binds
`KeycloakOidcAuthentication`, and exposes it as `AuthenticationPort` and `RolesPort` with `useExisting`. The Gestion shell mounts routed content only after `authenticate()` succeeds,
so the first API session synchronization cannot precede the authorization-code exchange. An authentication
failure is reported through `ErrorHandlerPort` and keeps the routed content closed.

The Cypress build replaces that provider file with a composition under `src/test/`. It binds one
`InMemoryGestionAuthentication` to both ports, plays the gestionnaire by default, plays other realm roles
through `window.gestionRolesFixture`, and permits a fixture to retain or refuse authentication. Browser scenarios wait for
authentication to reach the port and for the shell to render before releasing or refusing it; they do not
depend on routing completing while authentication is pending. Those fixture controls belong to the test
build alone.
Keep the replacement at build time: a runtime flag would ship the bypass in the production bundle.

`pupitre/auth.provider.ts` binds `DeviceAuthentication`, its protocol client, its device-grant configuration,
the IndexedDB storage adapter, and its exposed ports (`AuthenticationPort`, `DeviceSessionPort`,
`DeviceEnrolmentPort` and `DeviceAuthorizationPort`) with `useExisting`, so one object owns the session and its enrolment lifecycle. Keycloak URL, realm and
client ID stay in front environments; no client secret belongs in a browser repository. The `deployed`
configuration of `build-gestion` and of `build-pupitre` substitutes the front's `environment.deployed.ts`, whose
Keycloak origin is the `NG_DEPLOYED_KEYCLOAK_URL` identifier that `--define` replaces at build time from
`DEPLOYED_KEYCLOAK_URL`, one origin for both fronts;
Keycloak is always called directly, never through the API proxy of
[ADR 0034](adr/0034-proxy-the-api-at-the-edge.md), because the token's `iss` and the verification URI the
operator reads must name the real host.

Application-specific adapters do not import one another. The port contract runs the shared behavior against each
implementation; adapter-specific behavior stays beside that contract.

## Bearer headers have one owner

`httpAuthInterceptor` reads `AuthenticationPort.currentToken()` and adds `Authorization: Bearer <token>`
when one exists. HTTP adapters rely on it and never attach the header themselves.

`gestion` runs `httpSessionRefreshInterceptor` before bearer signing. It awaits session synchronization,
which asks Keycloak to refresh a token with less than seventy seconds of validity. A refresh failure rejects
the HTTP operation before it sends a stale token; a later request can try again. `pupitre` keeps its separate
durable-session and background-renewal lifecycle.

Device authorization obtains the credential, so its requests must bypass that interceptor.
`DeviceAuthentication` creates its protocol client directly on `HttpBackend`. Keep enrolment, token and
logout calls on that client.

Each device authorization, token and logout request has a thirty-second timeout that cancels its HTTP
subscription. Authorization and polling failures retain the existing `UNREACHABLE` outcome; a renewal timeout
keeps the still-valid session and uses the existing delayed retry. The polling interval and authorization-code
lifetime remain separate from this per-request limit.

The pupitre alone registers `httpDeviceAuthorizationInterceptor`. A 401 or 403 synchronizes the durable
session first, then requests retirement of only the exact token that was refused through
`DeviceAuthorizationPort`. Observe this retirement through `ErrorHandlerPort` rather than awaiting it
inside the intercepted exchange: publication can hold the session lock until that exchange returns.
A delayed response from an older session must not remove its replacement.

## The pupitre uses the device grant

The adapter implements RFC 8628 because `keycloak-js` does not support `device_code`:

1. request device authorization with `openid offline_access`;
2. poll the token endpoint at the announced interval;
3. keep waiting for `authorization_pending` and add five seconds for `slow_down`;
4. persist the granted session before exposing it;
5. renew before expiry and commit token rotation before use.

`DeviceGrantClient` owns that transport: the `HttpBackend` client, the endpoints, the wire documents and the
four protocol calls. `DeviceAuthentication` owns the session and its enrolment and renewal lifecycle.
Its internal `DeviceCredentialsStorage` owns durable credential documents, conditional writes and lock ordering;
`EnrolmentRequirements` owns retained notifications and cancellable waits. These objects remain implementation
details of the same adapter; the four ports still resolve to one session owner.

Use a `Map` for authorization-server refusal delays and for translating a refusal into an enrolment outcome.
The refusal string is external input; a plain object would also expose prototype members such as
`constructor`.

## The enrolment lifecycle is observable

`DeviceEnrolmentPort.enrol(showCode)` publishes the authorization code — user code, verification URI, its
complete form when the server sends one, and the lifetime — as soon as the authorization server issues it,
then resolves to exactly one outcome: `ENROLLED`, `DENIED` on `access_denied`, `EXPIRED` on `expired_token`,
`UNREACHABLE` for any other refusal or a failure to reach the server or the disk, and `ABANDONED` when a
newer enrolment or a logout replaced this one. A restored durable session answers `ENROLLED` and shows no
code. `authenticate()` is that same call with nothing to show.

The caller drives the adapter and reads the outcome. The adapter never calls back into its caller: doing so
would close an injection cycle through `AuthenticationPort`. A caller that shows the code must ignore the
code and the outcome of an attempt it has already replaced.

When replacing an enrolment whose credential commit is still pending, retire that exact credential durably
before requesting another authorization code. This invalidation uses `LocalStoragePort.update` directly:
its transaction compares and removes the credential atomically, without waiting for the `session` Web Lock
held by the previous attempt. Waiting for that attempt's acknowledgement or later cleanup would leave its
credential restorable after a crash following the replacement's network failure. The pending write also
checks abandonment inside its update callback, so it cannot install its credential after invalidation.
The crash guarantee begins when invalidation commits; a failed or interrupted disk write cannot acknowledge
durable abandonment. The selected tenant and any different session retain their existing removal semantics.

A network cut during the poll is reported as `UNREACHABLE`, indistinguishable from a failure to obtain the
code at all; [ADR 0026](adr/0026-enrol-pupitre-screen-and-keycloak-delegation.md) records that limit.

`DeviceSessionPort.withSession` guarantees mutual exclusion on the pupitre: replay takes the
`enrolement` lock before `session`, matching the order used by background renewal and its credential
commit. Keep the outer lock through the network exchange and persistence: protecting only the commit
allows a replay to use a token while the server is rotating it. Never acquire `enrolement` while holding
`session`, or reacquire `session` inside its own critical section.

A transient renewal refusal keeps the unexpired access token and retries later. `invalid_grant` removes the
matching credential and requests visible enrolment while retaining the selected tenant. `DeviceAuthorizationPort`
provides a cancellable wait for that requirement, retained until the caller starts enrolment. `PupitreRuntime`
starts observing loss before beginning its initial enrolment, then drives `EnrolementDuPupitre.enroler()` after each loss.
When synchronization or background renewal discovers that another tab removed the durable credential,
the adapter requests the same visible enrolment and adopts the tenant still selected in storage.
The adapter owns credential retirement; the runtime owns restarting the visible lifecycle outside the
session locks. Its destruction cancels the current wait. Logout conditionally
removes the session it ended, so it cannot erase a newer enrolment.

The durable session contains a bearer credential accessible to same-origin injected code. This is the
accepted trade for unattended offline restart; [ADR 0007](adr/0007-durable-offline-pupitre.md) records it.

## Tests preserve timing and boundaries

Drive the Keycloak adapter through a stateful fake authorization system, not one mock per SDK method. Its
answers settle after a round trip so an un-awaited chain turns the contract red.

Drive device enrolment through its real adapter with intercepted HTTP. Tests needing an existing pupitre
session seed durable storage and then observe restoration, signing and rotation through public behavior.

See [ADR 0002](adr/0002-port-contract-for-secondary-adapters.md) for port contracts and
[ADR 0003](adr/0003-hand-written-device-grant-for-the-pupitre.md) for the device-grant choice.

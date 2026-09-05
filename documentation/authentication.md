# Authentication

Authentication is the shared kernel at `app/shared/authentication/`. The domain owns
`AuthenticationPort`; each front chooses an adapter in its composition root.

## The port exposes session capabilities, not an SDK

`AuthenticationPort` is an abstract class so Angular can inject it at runtime. It exposes authentication,
the current bearer token and tenant, durable-session synchronization, and logout. Keep Keycloak, HTTP,
RxJS and browser-storage types outside its signature.

A missing token or tenant is a normal state. Callers branch on the optional value; they do not manufacture a
credential or reach into an adapter.

## Each front owns its wiring

`gestion/auth.provider.ts` builds `keycloak-js` from the front environment and binds
`KeycloakOidcAuthentication`. Its Cypress build replaces that provider file with the in-memory adapter.
Keep the replacement at build time: a runtime flag would ship the bypass in the production bundle.

`pupitre/auth.provider.ts` binds `DeviceAuthentication`, its device-grant configuration and the IndexedDB
storage adapter. Keycloak URL, realm and client ID stay in front environments; no client secret belongs in a
browser repository.

Sibling adapters do not import one another. The port contract runs the shared behavior against each
implementation; adapter-specific behavior stays beside that contract.

## Bearer headers have one owner

`httpAuthInterceptor` reads `AuthenticationPort.currentToken()` and adds `Authorization: Bearer <token>`
when one exists. HTTP adapters rely on it and never attach the header themselves.

Device authorization obtains the credential, so its requests must bypass that interceptor.
`DeviceAuthentication` creates its protocol client directly on `HttpBackend`. Keep enrolment, token and
logout calls on that client.

The pupitre alone registers `httpDeviceAuthorizationInterceptor`. A 401 or 403 synchronizes the durable
session first, then retires and reenrols only the exact token that was refused. A delayed response from an
older session must not remove its replacement.

## The pupitre uses the device grant

The adapter implements RFC 8628 because `keycloak-js` does not support `device_code`:

1. request device authorization with `openid offline_access`;
2. poll the token endpoint at the announced interval;
3. keep waiting for `authorization_pending` and add five seconds for `slow_down`;
4. persist the granted session before exposing it;
5. renew before expiry and commit token rotation before use.

Use a `Map` for authorization-server refusal delays. The refusal string is external input; a plain object
would also expose prototype members such as `constructor`.

A transient renewal refusal keeps the unexpired access token and retries later. `invalid_grant` removes the
matching credential and starts enrolment again while retaining the selected tenant. Logout conditionally
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

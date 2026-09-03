# 0003 — Enrol the pupitre with a hand-written device grant

## Status

Accepted

## Context

The pupitre runs unattended on the shop floor. Nobody is sitting at it with a password, and the screen is
shared by everyone on shift, so the gestion adapter's flow does not transfer: `onLoad: 'login-required'`
redirects the browser to a Keycloak login form that has no user in front of it.

RFC 8628, the OAuth Device Authorization Grant, is the flow built for this shape: the device asks for a
code, a human types that code once on another machine, and the device polls until it is granted. Keycloak
implements it.

`keycloak-js` does not. Its `flow` option takes `standard | implicit | hybrid`; there is no `device_code`
anywhere in the library. The adapter that gestion wraps around the SDK has nothing to wrap here.

Two further facts bounded the choice. The pupitre's screens are shared, so a refresh token that outlives the
tab is a credential sitting where any XSS can read it. And ADR 0002 already fixed how a secondary adapter is
tested — through its port, against a fake of the external system — so whatever we write has to be reachable
that way.

## Considered options

- Hand-write a `device` adapter behind `AuthenticationPort` — **kept**.
- Add an OIDC library that does support the device grant (`oidc-client-ts`, `angular-auth-oidc-client`) — rejected: a second auth library beside `keycloak-js` for one flow, and both of them would then own part of the same concern.
- Give the pupitre a service account with static credentials — rejected: a shared secret in a browser bundle is not a secret, and the token would carry no operator identity.
- Have gestion enrol the pupitre and hand it a token — rejected: it makes gestion a token issuer, which is Keycloak's job, and it does not survive the pupitre restarting alone.

## Decision

The pupitre authenticates through `app/authentication/infrastructure/secondary/device/`, a third sibling
beside `keycloak-oidc` and `in-memory`, chosen by `pupitre/auth.provider.ts` like every other adapter.

It runs the grant itself: `POST .../auth/device` with `scope=openid offline_access`, then poll
`.../token` on the device code, honouring `authorization_pending` and `slow_down` (+5 s) as "keep waiting"
and treating every other refusal as the end. Absent an `interval` it claims every 5 s, the default RFC 8628
§3.2 sets. It renews on a timer 30 s before expiry, retries a refused renewal after 60 s, and tells Keycloak
to end the session on `logout()`.

Its `HttpClient` is built on `HttpBackend`, so the global `httpAuthInterceptor` never attaches a bearer
token to the requests that exist to obtain one. `authenticate()` never rejects: every failure is "no token",
which the port already treats as a normal answer.

**Tokens live in memory only.** `offline_access` is asked for so a shift outlasts the access token, but
nothing is written to `localStorage` or a cookie. A reload re-enrols.

## Consequences

### Positive

- No second auth library. One `keycloak-js` for gestion, one small adapter for the pupitre, one port over both, and the contract suite from ADR 0002 runs against all three implementations unchanged.
- The whole grant is our code, so the fake in the contract suite can be a real authorization server: it validates `client_id`, `scope`, `device_code`, `refresh_token` and `grant_type`, and a wrong request goes red without any assertion naming a call.
- The device grant makes no browser redirect — only XHRs. That is what lets the enrolment Cypress spec drive the _real_ adapter against an intercepted Keycloak, where gestion has to substitute `auth.provider.cypress.ts` wholesale.
- Nothing on disk means nothing to steal from a shared screen, and no logout path that can leave a live refresh token behind.

### Negative

- We now own an OAuth client. Polling, back-off, renewal timing and revocation are ours to keep correct; the two defects this adapter shipped with — an absent `interval` polling flat out, and a `logout()` that let an in-flight enrolment reopen the session — were both found in review, not by the compiler, and a library would have had neither.
- **Nothing displays the `user_code`.** The grant cannot complete in production until a pupitre screen shows it, and the pupitre has no screen yet — issue #11 specifies its first. The adapter deliberately parses only `device_code` and `interval` so there is no dead field pretending otherwise.
- The polling loop has no client-side deadline. It stops when Keycloak says `expired_token`, which Keycloak does say, but RFC 8628 §3.5 puts that clock on the client and we do not keep one.
- In-memory tokens mean a reload is a re-enrolment, and a re-enrolment needs a human to type a code again. The moment the pupitre is expected to survive a browser restart on its own, this decision reopens — and the answer will not be `localStorage`.
- The adapter needs a device-grant client in the `glmproject` realm, carrying the `glmproject` client scope. That is infrastructure work outside this repository; without it the token has no `tenant` claim and the back end answers 403.

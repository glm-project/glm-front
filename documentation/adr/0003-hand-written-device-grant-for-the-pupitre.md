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
to end the session on `logout()`. Absent a usable `expires_in` — missing, not a finite number, or a lifetime
already spent — it treats the token as lasting a minute, which is short enough to be wrong safely and long
enough not to hammer the server.

**The two reasons that mean "keep waiting" are read from a `Map`, not a plain object.** `authorization_pending`
and `slow_down` arrive as a string the authorization server chose, and a plain object answers that lookup out
of `Object.prototype`: a refusal named `toString` or `constructor` finds a function where the code expects
`undefined`. There is no allowlist to speak of if the table also holds every member of every object.

**A refused renewal does not drop the token.** The session remembers the instant its access token truly
dies, and `currentToken()` answers until then, whatever the renewal did. The shop floor's network drops for
seconds at a time; a pupitre that logged itself out on every blink would be unusable, and the token it holds
stays valid whether or not we managed to replace it. This is what `keycloak-oidc` already does with its own
refresh, so the port promises one thing and not two.

**A renewal the server will not honour again ends the session; it does not loop.** `invalid_grant` is
Keycloak saying this refresh token is finished — revoked, or expired past its own lifetime — and no amount of
waiting changes it. The adapter stops renewing and starts a fresh enrolment, the only gesture that can bring
the pupitre back. Every other refusal, a network failure included, keeps the 60 s retry: those do come back
on their own, and the test that proves it drives an unreachable server, not a refused grant.

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

- We now own an OAuth client, and the bill is already visible. Polling, back-off, renewal timing and revocation are ours to keep correct, and **the adapter was written with seven defects in it**: an absent `interval` polling flat out; a `logout()` that let an in-flight enrolment reopen the session; a `logout()` that never stopped the polling loop, leaving an unenrolled pupitre claiming tokens for the rest of the shift; an absent `expires_in` making the renewal delay `NaN`, which `setTimeout` reads as zero — 45 499 renewals in 90 seconds; a refused renewal throwing away an access token that had not expired; a back-off table read off `Object.prototype`, so a refusal named `toString` turned the poll interval into `NaN` the same way — 500 claims a second, measured; and a renewal refused with `invalid_grant` retried every 60 s for the life of the tab, against a refresh token that was never coming back. Every one was caught in review, none by the compiler, and a library would have had none of them. Five of the seven are timing bugs invisible without fake clocks, which is the class of defect that hides longest.
- **A buried refresh token now sends the pupitre back to enrolment, and enrolment needs a human.** Revoke a session in Keycloak and the adapter asks for a new device code — which nothing displays, until issue #11 gives the pupitre a screen. The pupitre goes dark rather than looping, which is the better of the two, but it does go dark.
- **Nothing displays the `user_code`.** The grant cannot complete in production until a pupitre screen shows it, and the pupitre has no screen yet — issue #11 specifies its first. The adapter deliberately parses only `device_code` and `interval` so there is no dead field pretending otherwise.
- The polling loop has no client-side deadline. It stops when Keycloak says `expired_token`, which Keycloak does say, but RFC 8628 §3.5 puts that clock on the client and we do not keep one.
- **Keeping the token through a refused renewal delays revocation.** Revoke a pupitre's session in Keycloak and the refresh is refused at once, but the access token it already holds is signed and unexpired, so the back end keeps accepting it until it dies — up to the token's lifetime. Cutting a pupitre off is therefore not instant, and the shorter that lifetime is configured in the realm, the shorter the window. This is the ordinary bearer-token trade and gestion has always made it; it is written here because a reader who finds the adapter serving a token whose renewal was refused should see a decision and not an oversight.
- In-memory tokens mean a reload is a re-enrolment, and a re-enrolment needs a human to type a code again. The moment the pupitre is expected to survive a browser restart on its own, this decision reopens — and the answer will not be `localStorage`.
- The adapter needs a device-grant client in the `glmproject` realm, carrying the `glmproject` client scope. That is infrastructure work outside this repository; without it the token has no `tenant` claim and the back end answers 403.

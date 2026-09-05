# 0002 — Test secondary adapters through a port contract

## Status

Amended by 0012

## Context

MR 37 put authentication behind `AuthenticationPort` with two secondary adapters, each arriving with its own
co-located spec. They came out unrecognisably different: `InMemoryAuthentication.spec.ts` was 28 lines with
no double and three behaviors, while `KeycloakOidcAuthentication.spec.ts` was 120 lines covering 45 — one
`vi.fn()` per Keycloak method, `console` silenced, `window.location` redefined.

Passed through the rule this repository already writes down — _every proposed assertion states what a
behavior-preserving refactoring would break_ (`documentation/testing.md`) — four of the Keycloak spec's six
assertions failed it: `init` called with the adapter's own object literal, `updateToken` called with `70`,
`console.error` called, and a `setTimeout` helper that existed only because the refresh was a floating
promise. The two constants named `EXPECTED_*` were the adapter's code copied into its own spec.

Measured while replacing them: both old specs stayed 9/9 green through a real behavior change to the
adapter — the refresh going from fire-and-forget to awaited, two log lines deleted. They were blind to the
exact defect class that had already reached a green build on this branch once.

Two more facts sharpened it. The Keycloak adapter is executed by no test but that one — every application spec binds
`auth.provider.cypress.ts` — so its 100 % coverage measured a mock agreeing with the adapter, and none of the
failure modes that actually break Keycloak (wrong realm, blocked iframe, clock skew, expired refresh token)
can arise from a mock. And MR 37's claim that the in-memory double _"cannot drift, it is type-checked against
the same contract"_ holds for the signature alone: nothing asserted that the two adapters behave alike.

## Considered options

- Port contract test, one suite run against every adapter — **kept**.
- One mock-based spec per adapter — rejected: it is the state being left, and it cannot express "both adapters honour one contract".
- Drop the SDK adapter's unit test, exclude it from coverage as `**/*.provider*.ts` already is — rejected for now: honest about what a mocked SDK proves, but it leaves the adapter covered by nothing until a real Keycloak runs in CI.
- Cover the adapter by an e2e against a real Keycloak — rejected as the immediate step, not as the destination: it is the only thing that tests the integration, but it is infrastructure work and it does not remove the mock-based spec on its own.

## Decision

A secondary adapter is tested through its port, never through the library it wraps. One suite per port,
declared once and run against every implementation through `describe.each`, asserting only what the port
promises. It lives beside the adapters it covers — `infrastructure/secondary/<Port>.contract.spec.ts` — and
that is the one accepted exception to co-location, because a contract belongs to no single adapter.

Where an adapter wraps a third-party SDK, the double replaces **the external system, not the collaborator**:
an object that holds a session and mints, rotates and drops a token, not one `vi.fn()` per method. It settles
on a `setTimeout`, never synchronously — a double that resolves before the call returns hides an un-awaited
chain.

Behavior an adapter has beyond the contract stays in a `beyond the contract` describe next to it, still
phrased as behavior.

When implementations belong to independent applications, the common contract lives under
`src/test/webapp/unit/` instead. This keeps the suite unique without making production shared code import
application-specific adapters, as decided by [ADR 0012](0012-own-business-contexts-by-front.md).

## Consequences

### Positive

- No assertion in the authentication adapters names a Keycloak method or an adapter constant any more; every one of them reads `currentToken()`. The `EXPECTED_INIT_PARAMS` / `EXPECTED_MIN_TOKEN_VALIDITY_SECONDS` pair is gone, so changing the refresh margin or the `onLoad` mode no longer reddens a test.
- The in-memory / Keycloak equivalence is enforced rather than asserted in an MR description: the same three assertions run against both.
- Applying the decision shrank the Keycloak adapter from 45 lines to 33 — the two `console.debug` calls carried the `tokenParsed!` / `timeSkew!` non-null assertions, a `Date.now()` arithmetic and half the branch count, and nothing observed them.
- The faithful fake earned its keep immediately: made to settle on a `setTimeout`, it went red against the then-current adapter, whose `authenticate()` returned before the refresh had run. The eager first version of the same fake passed. This is the second time on this branch that an un-awaited authentication chain reached a green build.

### Negative

- The contract asserts only what every adapter shares, so it is as weak as the poorest implementation. Adapter-specific behavior escapes it and needs the `beyond the contract` describe, which is a discipline, not a barrier — nothing forces a new adapter's specific behavior to be tested at all.
- The Keycloak fake still crosses the compiler with `as unknown as Keycloak`, the very cast MR 37 removed from production code. It is test-only and never bundled, but it is not checked against keycloak-js's real surface: the fake can drift from the library and the suite stays green.
- The fake compresses a redirect. Real `keycloak.logout()` navigates away and clears the token on the return trip; the fake clears it synchronously, so the contract's "hands over nothing once the session is ended" is true of the system but not of the instant after the call. A stale token between `logout()` and the redirect is out of this suite's reach.
- One spec no longer sits next to its source, and `describe.each` costs a reader one indirection to see which adapter a failure came from.
- What would reopen this: a real Keycloak in CI. It makes the third option available for the SDK adapter, and this contract would then cover translation while the e2e covers integration.

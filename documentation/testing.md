# Testing

How we write tests here. Common commands live in `AGENTS.md`; `package.json` is the complete inventory.

## Write the test first, at the layer that matches the change

1. **Unit (Vitest)** — co-located `*.spec.ts` next to the source (`http-auth.interceptor.spec.ts` beside
   `http-auth.interceptor.ts`), plus the architecture test in `src/test/webapp/unit/`. Domain
   logic, services, interceptors, pipes — anything testable without a real DOM or router integration. A
   **port contract** is the one thing not co-located: it belongs to no single adapter, so it sits beside
   them all.
2. **Component (Cypress)** — `src/test/webapp/component/<front>/<context>/*.spec.ts`, against the real dev
   server. Rendering and browser behavior of one component, network intercepted.
3. **Application (Cypress)** — `src/test/webapp/application/<front>/<context>/*.spec.ts`, driving the whole
   front. User journeys, not component detail. **Not** end-to-end, which is why the folder does not say so:
   there is no back end behind these, the network is intercepted here too, and gestion is served with
   `auth.provider.cypress.ts` in place of Keycloak. They test the application, and stop at its edges.

   **The pupitre is the exception.** It has no `auth.provider.cypress.ts`: device enrolment has no redirect,
   so its application test drives the real adapter against intercepted authorization endpoints. Journeys
   needing an existing enrolment seed it through `PupitreStorageFixture`, preserving the real restoration
   and signing path without repeating enrolment.

Both Cypress layers share their helpers from `src/test/webapp/utils/`: `dataSelector` and `interceptForever`,
the latter controlling response timing. The folder carries its own `tsconfig.json` because those helpers are
Cypress-typed, where the Vitest specs next door are not.

Each front owns a Cypress config next to its specs, differing by `baseUrl` and `specPattern`; each is reached
by an npm script naming the front. Add a suite with its config and the `test:<layer>:headless:<front>` script;
the aggregate scripts pick it up by glob. `AGENTS.md` owns the one-server-at-a-time trap.

The pupitre currently has no component suite because its rendered components add no browser integration
beyond the application journeys. Add the suite when a component owns browser behavior worth isolating.

## Fixing a defect starts with a failing test

First a test at the layer where the defect is observable, then the smallest test that reproduces it. Both go
red before the fix and green after.

## Coverage is not negotiable

The 100 % per-file threshold outranks any "not worth testing" judgement below. If you genuinely cannot
cover a line, delete the line or restructure the code — never lower the threshold.

## Tests are in English, start with "should", and tell a business story

`it('should attach the bearer token to outgoing requests')`, not `it('testInterceptor')`. The reader grasps
the intent from the name alone. Data and helpers carry the word **fixture** — `keycloakFixture`, not
`SeededKeycloak`.

## Every spec follows given-when-then through named helpers

Every state to arrange is a `givenXxx()`, every action a `whenXxx()`, every assertion a `thenXxx()` — a local
const arrow or in `*.function.ts`. Setup, actions and assertions in blocks separated by blank lines.
Assertions live in a helper, which keeps the reading thread and centralizes the selectors.

Vitest specs are held to it as much as Cypress ones. What varies is where the seam falls: wiring the TestBed
stays in `beforeEach` — it is plumbing, not a business precondition — while rendering with the inputs under
test is the action (`pupitre/header/header.spec.ts`).

`local/given-when-then` enforces this shape on every `*.spec.ts`: scenario calls are named `givenXxx`,
`whenXxx` or `thenXxx`, technical APIs stay behind those helpers, and assertions stay in `thenXxx` helpers.
Data declarations and fixture construction remain readable in the scenario. `HexagonalArchTest.spec.ts` is
the sole exception: its `arch-unit-ts` fluent DSL is itself the architecture rule being stated, and wrapping
that DSL would only rename its vocabulary without hiding a test detail.

## Select on `data-selector`, never on CSS classes or text

Use the `dataSelector()` helper (`src/test/webapp/utils/DataSelector.ts`, reached from a co-located spec
through the `@test/*` alias); it also accepts
`data-cy`, `data-test` and `data-testid`. Classes are a styling concern and text is an i18n concern — both
change without the behavior changing. It returns a comma-separated list of four selectors, so it cannot be
concatenated into a descendant selector — chain `.find()` instead.

Each front's shell carries its marker as a host attribute (`host: { 'data-selector': 'pupitre-shell' }`),
and its **application** smoke test asserts nothing else. That is deliberate: `<glm-root>` sits in the static
`index.html` already, so the attribute appears only once Angular has bootstrapped — the one assertion a
title check cannot make, because a title reads green on a blank page.

## Mock at the boundary

Bind the port, never the library: a spec that needs authentication provides `AuthenticationPort` with
`InMemoryAuthentication` (see `gestion/app.spec.ts`, `gestion/header/header.spec.ts`) rather than reaching a real Keycloak
instance. That double is production code, so the compiler holds it to the port's signature and the contract
suite below holds it to the port's behavior. Mock ports and I/O, not the domain logic under test.

Hand-roll a double only where the architecture forbids the adapter: a spec inside a `primary` package may
not import a `secondary` one, and `HexagonalArchTest` scans specs.

## A secondary adapter is tested through its port, never through the library it wraps

One suite per port, declared once and run against every implementation with `describe.each`
(`secondary/AuthenticationPort.contract.spec.ts`). It asserts only what the port promises, so it reads the
same for the in-memory adapter and for the Keycloak one — and it is what makes "the double cannot drift"
true of behavior and not merely of types. Adapter-specific behavior goes in a `beyond the contract`
describe next to it, still phrased as behavior.

Where the adapter wraps a third-party SDK the double replaces **the external system, not the collaborator**:
an object holding a session that mints, rotates and drops a token, not one `vi.fn()` per method. That is
what buys the assertion. `expect(keycloak.updateToken).toHaveBeenCalledWith(70)` restates the adapter's own
literal and reddens when the margin changes; `expect(authentication.currentToken())` states what a caller
gets.

**A fake answers on a round trip** — `setTimeout`, never a promise already resolved. Measured here: the
eager first version of the Keycloak fake passed against an adapter whose refresh was never awaited; the same
fake made to settle asynchronously went red. Resolving before the call returns hides exactly the defect this
branch had already shipped once.

The reasoning and its price are in [ADR 0002](adr/0002-port-contract-for-secondary-adapters.md).

## We test observable business behavior, and the real runtime failure modes

An HTTP call that genuinely fails, with graceful degradation: a legitimate test. Two things fall below that
bar:

- pure refactoring — the existing tests are the net;
- the arithmetic helper extracted to support a display: it is the rendered result — visible, absent, its
  value — that we test in Cypress; the helper is an implementation detail.

Facing a mixed batch of refactoring + fix: zero tests for the refactoring, one behavior test for the fix of
a real failure mode, red before and green after.

**The rule above is a procedure, not an intention: every proposed assertion states, next to itself, what a
behavior-preserving refactoring would break.** Written down — in the plan, in the message proposing the
test, in the MR — not merely thought. Renaming the method under test, moving its file, changing a CSS
class: if any of these turns the assertion red while no user sees a difference, it tests the implementation
and it goes in the bin.

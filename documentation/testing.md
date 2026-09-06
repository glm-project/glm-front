# Testing

How we write tests here. Common commands live in `AGENTS.md`; `package.json` is the complete inventory.

## Write the test first, at the layer that matches the change

1. **Unit (Vitest)** — co-located `*.spec.ts` next to the source (`http-auth.interceptor.spec.ts` beside
   `http-auth.interceptor.ts`), plus the architecture test in `src/test/webapp/unit/`. Domain
   logic, services, interceptors, pipes — anything testable without a real DOM or router integration. A
   **port contract** is the one thing not co-located: it belongs to no single adapter. It normally sits
   beside the adapters; a contract spanning both applications lives in `src/test/webapp/unit/` so production
   code never imports an adapter from the other application.
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

4. **Production offline restart (Cypress + Chrome)** —
   `src/test/webapp/application/pupitre/production-offline/*.spec.ts`, against the normal optimized pupitre
   output and its generated Angular service worker. This deliberately expensive suite is separate from
   `test:application`: `npm run test:production-offline` builds the shipped artifact, disables Chrome's HTTP
   cache, clears the origin, waits for an activated and controlling worker, and cuts the browser network over
   CDP. An uncached request to a URL outside the worker manifest must fail before an offline restart counts as
   evidence. The companion run makes `ngsw-worker.js` unavailable and proves that the same restart cannot
   mount the shell.

   The static fixture server supplies deterministic API and RFC 8628 responses; it is not a backend or
   Keycloak substitute in the application graph. `/` always serves the unmodified production artifact. A
   separately compiled page at `/__fixture` shares its origin and prepares or reads durable state through
   `JournauxDuPupitrePort`; it does not know IndexedDB names, stores or document keys. The driver recreates the
   production app in child browsing contexts so Cypress remains alive while Chrome is offline. JUnit, server
   exchange and duration evidence is written below `artifacts/production-offline/` and uploaded by CI.

Both Cypress layers share their helpers from `src/test/webapp/utils/`: `dataSelector` and `interceptForever`,
the latter controlling response timing. The folder carries its own `tsconfig.json` because those helpers are
Cypress-typed, where the Vitest specs next door are not.

Reusable unit-test fixtures live in `src/test/webapp/unit/fixtures/`. Group a fixture under its owning
application and context when it carries their vocabulary; technical fixtures used across contexts stay at
the folder root. Extract one only when at least two test consumers need the same port behavior. Scenario
data and specialized doubles stay beside their spec so the test keeps its local vocabulary.

A shared fixture is a test adapter at a stable domain seam: it may depend on domain ports and types or on
other shared test fixtures, never on application or infrastructure code. Only specs and sources under
`src/test/` may import it. `HexagonalArchTest.spec.ts` enforces these dependency directions; use the
`@test/unit/fixtures/*` alias from co-located specs.

Each front owns a Cypress config next to its specs, differing by `baseUrl` and `specPattern`; each is reached
by an npm script naming the front. Add a suite with its config and the `test:<layer>:headless:<front>` script;
the aggregate scripts pick it up by glob. `AGENTS.md` owns the one-server-at-a-time trap.

The pupitre component suite uses the `component-cypress` build configuration with a test-only bootstrap.
It renders the real designation keypad and application services with local port fixtures, independently of
the enrolment and pointage composition. Its touchscreen tests inject native Chromium events through CDP;
the helper accounts for the Cypress runner iframe position and scale. Production and application-test
builds retain the regular pupitre bootstrap.

## Fixing a defect starts with a failing test

First a test at the layer where the defect is observable, then the smallest test that reproduces it. Both go
red before the fix and green after.

## Coverage is not negotiable

The 100 % per-file threshold outranks any "not worth testing" judgement below. If you genuinely cannot
cover a line, delete the line or restructure the code — never lower the threshold.
Reach that coverage through observable contracts. A new file does not by itself create a new behavior to
assert; its coverage can come from scenarios through its owner's public entry point.

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

One suite per port, declared once and run against every implementation with `describe.each`. The
authentication contract spans common, gestion and pupitre adapters, so it lives at
`src/test/webapp/unit/AuthenticationPort.contract.spec.ts`; placing it under any production shared kernel
would create imports toward application-specific adapters. It asserts only what the port promises, which
makes "the double cannot drift" true of behavior and not merely of types. Adapter-specific behavior goes in
a `beyond the contract` describe in that same cross-application suite.

Where the adapter wraps a third-party SDK the double replaces **the external system, not the collaborator**:
an object holding a session that mints, rotates and drops a token, not one `vi.fn()` per method. That is
what buys the assertion. `expect(keycloak.updateToken).toHaveBeenCalledWith(70)` restates the adapter's own
literal and reddens when the margin changes; `expect(authentication.currentToken())` states what a caller
gets.

**A fake answers on a round trip** — `setTimeout`, never a promise already resolved. Measured here: the
eager first version of the Keycloak fake passed against an adapter whose refresh was never awaited; the same
fake made to settle asynchronously went red. Resolving before the call returns hides exactly the defect this
branch had already shipped once.

Control delayed I/O with explicit fixture signals for request arrival and completion. Advancing the clock
by an arbitrary number of milliseconds does not prove that a read has started. Reserve elapsed-time
simulation for the temporal behavior being exercised.

The reasoning and its price are in [ADR 0002](adr/0002-port-contract-for-secondary-adapters.md).

## We test observable business behavior, and the real runtime failure modes

An HTTP call that genuinely fails, with graceful degradation: a legitimate test. Two things fall below that
bar:

- pure refactoring — the existing tests are the net;
- the arithmetic helper extracted to support a display: it is the rendered result — visible, absent, its
  value — that we test in Cypress; the helper is an implementation detail.

Facing a mixed batch of refactoring + fix: zero tests for the refactoring, one behavior test for the fix of
a real failure mode, red before and green after.

**Before adding or reviewing a scenario, state its functional rule, public entry point and observable
expected result.** Record the rationale in the plan, review or MR, not in source comments. Derive the
expected result from the specification; if an existing test contradicts it, correct the expectation with
the behavior rather than preserving the test as authority.

Exercise the same public interface as a caller and retain the real domain logic behind it. A domain test
can assert a returned decision or public state; a component test drives input and observes rendered output.
Being callable or exposed as a signal does not alone make a member the contract under test. When the DOM
already proves the result, an additional assertion on the controller's backing state adds coupling.

For each scenario, name a behavior-preserving implementation change that must leave its expected result
intact. Moving a file or renaming a public method may require updating imports or invocation; this alone is
not a testing defect. Changing private helpers, internal state representation or orchestration must leave
the expected business result intact. For example, assert that the last digits are visible and the operator
can scroll back, rather than fabricating a width and asserting the component's exact scroll assignment.

## Mutation checks the replay policy through Angular

`npm run test:mutation:replay` mutates only `GesteReplayPolicy.ts` and runs its business scenarios through
`ng test --watch=false --include`. Stryker's built-in command runner keeps the Angular builder's zoneless
TestBed and JIT setup; a direct Vitest runner does not establish that environment. One worker gives every
sandbox its own Angular cache and avoids the shared-cache race described in `AGENTS.md`.

The command runner has no per-test instrumentation, so `coverageAnalysis` is off. Its report cannot
distinguish a mutant that was not executed from one that executed and survived: a displayed zero
`NoCoverage` count is therefore not evidence of mutation coverage. Keep the regular Istanbul 100 %
per-file gate as separate source-coverage evidence. The TypeScript checker uses `tsconfig.stryker.json` to
classify invalid mutations as `CompileError`; Stryker separately reports killed valid mutants, survivors and
timeouts.

The initial measurement generated 58 mutants in 93.49 seconds: 56 were killed and two survived. Inspecting
the survivors found that the test helper copied the production default attempt, so no scenario called the
real default. After adding that observable concurrency scenario, the unchecked run killed 57 mutants and
left one type-invalid conditional survivor. With the TypeScript checker enabled, the final measured run
completed in 78.22 seconds with 34 killed valid mutants, 24 compile errors, no survivors and no timeouts. The score is
100 % over valid mutants; the conditional that looked equivalent for valid `GesteDAtelier` values cannot type
check once its narrowing guard is removed, so no equivalent mutant is suppressed. The blocking threshold is
therefore 100 %. A diagnostic run at a temporary 99 % threshold failed with exit code 1 when the unchecked
score was 98.28 %, proving that a score below the configured gate fails the command.

HTML and JSON reports are written under `reports/mutation/`. The `mutation-testing` workflow runs manually
and every Monday, records its duration beside those reports and uploads the directory as a CI artifact. It
does not run on pushes or pull requests. Extend mutation to projections or operator windows only after a
bounded report identifies the next useful decision surface. [ADR 0018](adr/0018-run-replay-mutation-through-angular.md)
records the runner choice and its costs.

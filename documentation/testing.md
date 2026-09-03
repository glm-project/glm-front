# Testing

How we write tests here. The commands themselves live in `CLAUDE.md`.

## Write the test first, at the layer that matches the change

1. **Unit (Vitest)** — co-located `*.spec.ts` next to the source (`KeycloakOidcAuthentication.spec.ts`
   beside `KeycloakOidcAuthentication.ts`), plus the architecture test in `src/test/webapp/unit/`. Domain
   logic, services, interceptors, pipes — anything testable without a real DOM or router integration.
2. **Component (Cypress)** — `src/test/webapp/component/<front>/<context>/*.spec.ts`, against the real dev
   server. Rendering and browser behavior, network intercepted (`component/utils/Interceptor.ts` provides
   `interceptForever` to control response timing).
3. **E2E (Cypress)** — `src/test/webapp/e2e/<front>/<context>/*.spec.ts`, black-box through the full app.
   User journeys, not component detail.

Each front owns a Cypress config next to its specs, differing by `baseUrl` and `specPattern`; each is
reached by an npm script naming the front. A suite is added by creating the config and the
`test:<layer>:headless:<front>` script that boots its server — the aggregates pick it up by glob. The
fronts run **one dev server at a time**: two servers of one Angular project share a vite cache directory
and break each other.

The pupitre has an e2e suite and **no component suite**: the component layer tests rendering with the
network intercepted, and an empty shell renders nothing and calls nothing — a spec there would restate
its e2e smoke against the same served app. `test:component:headless` therefore covers `gestion`
alone today. The pupitre's first screen brings its config and its script with it.

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

## Cypress specs follow given-when-then through named helpers

Every action is a `whenXxx()`, every assertion a `thenXxx()` — a local const arrow or in `*.function.ts`.
Setup, actions and assertions in blocks separated by blank lines. Assertions live in a helper, which keeps
the reading thread and centralizes the selectors.

## Select on `data-selector`, never on CSS classes or text

Use the `dataSelector()` helper (`src/test/webapp/{component,e2e}/utils/DataSelector.ts`); it also accepts
`data-cy`, `data-test` and `data-testid`. Classes are a styling concern and text is an i18n concern — both
change without the behavior changing. It returns a comma-separated list of four selectors, so it cannot be
concatenated into a descendant selector — chain `.find()` instead.

Each front's shell carries its marker as a host attribute (`host: { 'data-selector': 'pupitre-shell' }`),
and its **e2e** smoke test asserts nothing else. That is deliberate: `<glm-root>` sits in the static
`index.html` already, so the attribute appears only once Angular has bootstrapped — the one assertion a
title check cannot make, because a title reads green on a blank page.

## Mock at the boundary

Bind the port, never the library: a spec that needs authentication provides `AuthenticationPort` with
`InMemoryAuthentication` (see `gestion/app.spec.ts`, `login.spec.ts`) rather than reaching a real Keycloak
instance. That double is production code, type-checked against the same contract, so it cannot drift.
Mock ports and I/O, not the domain logic under test.

Hand-roll a double only where the architecture forbids the adapter: a spec inside a `primary` package may
not import a `secondary` one, and `HexagonalArchTest` scans specs.

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

---

New rules on this topic go here.

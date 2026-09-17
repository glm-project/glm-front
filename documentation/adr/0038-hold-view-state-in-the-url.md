# 0038 — Hold the view state of a parameterised read screen in its URL

## Status

`Accepted`

- `Complements 0033: adds where a read port's parameters come from when a screen is addressed by its URL.`
- `Refines 0025: a refused address reports nothing to ErrorHandlerPort, because refusing is not failing.`

## Context

`gestion` had no parameterised route. Its five screens are static paths, and the single piece of URL state
anywhere in the repository is read once, non-reactively, through `ActivatedRoute.snapshot.queryParamMap`
(`gestion/contexts/atelier/infrastructure/primary/atelier/Atelier.ts`), to pre-target a dialog.

The weekly hours report of an operator needs three parameters — which operator, which year, which week — and
two of them change while the screen stays mounted. A snapshot read cannot see those changes.

Two further constraints shaped the answer. `effect()` and `afterRenderEffect()` are rejected by lint policy
(`documentation/code-style.md`), so a screen cannot reconcile its own URL after the fact. And
`documentation/testing.md` reserves every "a URL mounts its view" assertion for the Cypress application
suite, forbidding simulated router navigation in unit specs.

Enabling `withComponentInputBinding()` was measured on this branch before being dropped: with it, three
different scenarios of the existing `Operateurs` and `PostesDeTravail` application suites failed across five
runs on "the request never occurred", against no failure in four runs without it.

**That measurement does not establish a cause, and later evidence weakened it further.** The runs were
sequential rather than interleaved; and the `pupitre` component suite, which no part of this work touches,
failed once and then passed on an immediate re-run. This repository's Cypress suites are flaky on this machine
independently of the router option, so part of what was attributed to it was ambient. What remained was an
unquantified risk to four existing screens in exchange for convenience in one new one — enough to decline the
option, not enough to convict it.

## Considered options

- Read path and query parameters reactively from `ActivatedRoute`, and let the URL be the view state — **kept**.
- `withComponentInputBinding()` plus `input()` bindings — rejected: a router-wide option whose measured effect
  on existing application suites could not be cleared, for a convenience local to one screen.
- A component-held week signal, navigating on each change — rejected: duplicates state the URL already is, and
  breaks the browser's back and forward.
- A resolver producing a validated week — rejected: moves a domain decision into router configuration, and a
  resolver cannot render the refusal it discovers.
- Rewriting an incomplete address to a canonical one — rejected: it needs an `effect()`, which lint refuses, and
  it would freeze a link that is more useful left alive.

## Decision

Hold the whole view state of a parameterised read-only screen in its URL. The component keeps no signal
mirroring a parameter: it reads `ActivatedRoute.paramMap` and `ActivatedRoute.queryParamMap` reactively —
`toSignal(..., { requireSync: true })` — and every navigation control is a control that navigates, either a
`routerLink` carrying `queryParams` or a `Router.navigate` from a handler.

Turn raw parameters into a domain value before anything else, and let the domain decide whether the address
designates something. An address the domain refuses puts the view in an explicit refusal state and **issues no
request**: the read port's parameters resolve to `undefined`, which keeps Angular's `resource` idle and its
loader uncalled. A refusal is not a failure, so nothing reaches `ErrorHandlerPort`.

Do not rewrite an incomplete address. An absent parameter is a meaning of its own — for the hours report, an
address without a week means "this operator, the week in progress" — and it is the meaning a link shared from
a list should carry.

## Consequences

### Positive

- A shared link reproduces what its sender saw, and browser back and forward work without any code.
- An invalid address costs zero HTTP requests, and that is directly assertable: the API fixture's interceptor
  is never hit.
- Unit specs drive the screen by pushing values through an `ActivatedRoute` double, and assert the navigation
  the component asks for, while the URL-to-view binding stays where `testing.md` puts it.
- No router-wide composition change, so the existing screens are untouched.

### Negative

- The component injects `ActivatedRoute` and `Router`, which is router plumbing in a primary adapter that
  `withComponentInputBinding()` would have removed.
- A parameter name lives as a string in two places, the route and the component, with no compiler link between
  them.
- A unit spec needs a double for both `paramMap` and `queryParamMap`, and a double for `Router` to observe a
  navigation — three seams where input binding would have needed none.
- `RouterLink` cannot compute an `href` against a `Router` double, so the target URL of a navigation anchor is
  only observable in the Cypress application suite.
- Because an incomplete address is not rewritten, the same link reread a week later shows a different week.
  That is wanted for a link from a list and wrong for an archived one; a screen needing a frozen link will have
  to reopen this.
- The measurement that discarded `withComponentInputBinding()` was not conclusive, and the ambient flakiness of
  the Cypress suites on this machine is unexplained and still there to be explained on its own terms. Anyone
  reopening this should measure interleaved, and should first establish the baseline failure rate with no change
  at all. The option may well be harmless.

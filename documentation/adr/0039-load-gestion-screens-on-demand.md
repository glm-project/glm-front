# 0039 — Load each gestion screen on demand

## Status

`Accepted`

- `Complements 0012: each context of gestion now ships in its own chunk, so the boundary that owns a screen is also the boundary that pays for it.`

## Context

`gestion` declares its seven routes with a static `component:` and a static import. Nothing made that a
decision — no record argued it, and no constraint required it. It is what the first route did, and every
route since copied it.

The consequence is that the whole back office is downloaded to show any one screen. Adding the coût de
revient screen, which weighs 18,38 kB raw on its own, pushed the initial bundle to 1000,58 kB and broke the
`initial` budget of `build-gestion` by 578 bytes. The screen is not the cause: `main` was already 18 kB below
the ceiling, so the next screen of any size was going to break it.

The warning budget had stopped working long before that. Set at 500 kB, it was exceeded by 482 kB on `main`
and printed on every build, which is the same as printing nothing.

Measured on this branch, `npm run build:gestion`:

|                                   | raw        | transfer  |
| --------------------------------- | ---------- | --------- |
| `main`, before the new screen     | 982,20 kB  | 201,04 kB |
| with the coût de revient screen   | 1000,58 kB | 204,03 kB |
| with every route loaded on demand | 566,99 kB  | 144,79 kB |

`pupitre` is a different problem and is not part of this record. It is offline-first, its shell is cached by
a generated service worker (`0004`), and `npm run test:production-offline` proves that an offline restart
mounts it. Splitting its routes would put that proof back in question for no measured benefit, and it carries
no `initial` budget today.

## Considered options

- Declare every gestion route with `loadComponent` — **kept**.
- Raise the error budget — rejected: it buys one screen's worth of silence and hides that a gestionnaire
  downloads the supervision, the referential, the workshop and the operators to open one of them.
- Trim what the bundle carries, starting with Angular Material — rejected: nothing measured points at a
  dominant single cost, and the design system is a decision of its own, not a size lever.
- Split only the screens added from now on — rejected: it leaves the ceiling one screen away and makes the
  rule depend on the date a screen was written.

## Decision

Declare every route of `gestion` with `loadComponent` and a dynamic `import()`. A screen belongs to the chunk
of the context that owns it, and reaches the browser when its URL is opened.

Keep the route-level `providers` array where it is. It names ports and adapters, it is what binds a context's
composition to its screen, and it is small — the weight is in the component and its template, which the
dynamic import already moves.

Set both budgets from the measured size rather than from a round number, so that the warning fires on a real
drift and not on the status quo.

Leave `pupitre` with static imports. Its routes are not covered by this record.

## Consequences

### Positive

- The initial bundle drops from 1000,58 kB to 566,99 kB raw, and from 204,03 kB to 144,79 kB transferred:
  43 % and 29 % less for the first paint.
- Each screen becomes a named chunk of 14 to 64 kB, so the cost of a screen is attributable to the context
  that owns it, and shows up in the build output of the commit that adds it.
- The warning budget carries a signal again instead of printing on every build.
- A new screen no longer moves the ceiling for every other screen, which is what made this an emergency
  rather than a choice.

### Negative

- Opening a screen for the first time now costs a network round trip for its chunk. On a workshop LAN with a
  warm cache this is invisible; on a cold cache over a poor link it is a delay where there was none.
- **A chunk fetch can fail, and nothing in this repository handles that today.** A static import could not
  fail after the app had booted; a dynamic one can, and the failure surfaces as a router navigation error that
  no screen explains. This is a real hole, left open deliberately rather than filled with an untested handler,
  and it is the first thing to reopen if a gestionnaire ever reports a blank screen after a deploy.
- The build now emits a dozen chunks instead of two, which makes the output harder to read at a glance and a
  size regression harder to attribute without comparing two builds.
- The budgets are now tied to a measurement. They will need moving again, and a future reader must not read
  them as a target.
- `gestion` and `pupitre` no longer declare their routes the same way. Anyone copying a route from one front
  to the other will copy the wrong shape, and only the build output will say so.
- The proof that a URL still mounts its view rests entirely on the Cypress application suite, which
  `documentation/testing.md` already makes the sole owner of that assertion. Those suites are flaky on this
  machine (`0038`), so the evidence that this change is behaviour-preserving is only as good as that suite.

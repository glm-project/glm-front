# 0004 — Cache the pupitre shell with ngsw, and nothing else

## Status

Accepted

## Context

The shop floor's network drops. A pupitre that answers a blank page when the wifi blinks is worse than one
that answers a stale screen, so the front has to survive a reload without the server — the shell at least,
which is HTML, JS, CSS and fonts that only change when we deploy.

What the pupitre must _not_ do is pretend it survived more than that. Clocking data is the point of the
application, and an operator who clocks against a cached screen and sees it accepted has been lied to unless
something actually queues that write and replays it. Nothing here does.

Gestion has the opposite shape: an office front, a supervised network, and nobody expecting it to work
offline.

## Considered options

- `@angular/service-worker` (ngsw), configured for the pupitre alone, `assetGroups` only — **kept**.
- ngsw with `dataGroups` too — rejected: it caches API responses, which turns a stale read into something the screen cannot tell from a fresh one.
- A hand-written service worker — rejected: we would own cache versioning and update activation, the two things ngsw exists to get right, for no capability we need today.
- Workbox — rejected: a second build pipeline beside Angular's, whose value is the background sync we are explicitly not doing.
- No offline story at all — rejected: a reload during a network blink loses the shift's screen.

## Decision

Add `@angular/service-worker`, pinned to the Angular version in use, and register it from
`pupitre/main.ts` with `provideServiceWorker('ngsw-worker.js', { enabled: environment.production, registrationStrategy: 'registerWhenStable:30000' })`.

`serviceWorker` points at `pupitre/ngsw-config.json` on **`build-pupitre` only**. `build-gestion` has no
such key and no manifest asset, so the gestion output carries no `ngsw*` file at all.

`ngsw-config.json` declares **`assetGroups` only** — the shell prefetched, the assets prefetched. No
`dataGroups`, ever: nothing that comes from the back end is cached.

**No service-worker code is written.** The generated `ngsw-worker.js` is the whole of it; there is no
`self.addEventListener` anywhere in this repository, and adding one is a decision that supersedes this
record.

`manifest.webmanifest` sits beside the config and is linked from `pupitre/index.html`.

## Consequences

### Positive

- A reload on a dropped network still renders the pupitre. The shell is on disk; only the data is missing, and the data being missing is visible.
- Gestion is untouched — no worker, no manifest, no cache to invalidate, no extra bytes.
- Cache versioning, update activation and the stale-worker trap are Angular's problem, and Angular ships an implementation we did not write and do not maintain.
- `assetGroups`-only draws the line where it can be checked: the built `ngsw.json` carries `"dataGroups": []`, so a future `dataGroups` entry shows up in the build output, not only in a config diff.

### Negative

- **This is not offline clocking, and it looks like it.** The pupitre renders when the network is down, so an operator can reach the clocking screen and press a button whose write fails. No outbox, no background sync, no replay: that capability is unbuilt, and the shell now makes it easier to believe it exists. Issue #11 owns what the screen shows when the write cannot leave.
- A service worker caches a deployment. Between the new bundle shipping and the worker activating it, a pupitre can serve the previous shell — correct behaviour, and still a support call the first time it happens.
- The worker only runs in production builds. Dev and Cypress never exercise it, so its configuration is verified by reading the built `ngsw.json`, not by a test.
- **The manifest ships without icons**, so the PWA is not installable: an icon is a design-system asset and issue #7 has not chosen one. The manifest is a link in the head and a name until then.

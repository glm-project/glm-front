# 0004 — Cache the pupitre shell with ngsw, and nothing else

## Status

Accepted, complemented by [ADR 0007](0007-durable-offline-pupitre.md). This record governs service-worker
caching; the durable application queue is a separate mechanism.

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
- **A pupitre can serve a stale shell indefinitely, and nothing here stops it.** ngsw downloads a new version in the background but activates it on the next navigation, and **nothing in this repository handles `SwUpdate`**: no `versionUpdates` subscription, no reload. On an office front that is a non-event, because someone reloads. A pupitre is a kiosk — powered on at the start of a shift and left alone for weeks — so "the next navigation" may never come, and a deployment can sit downloaded and unactivated for as long as the tab stays open. Handling `SwUpdate.versionUpdates` and reloading on `VERSION_READY` is the fix, and it needs a decision this record does not make: a pupitre cannot reload under an operator's hands mid-clocking, so the reload has to wait for an idle screen. Issue #11 owns the screen that would define idle.
- The worker only runs in production builds. Development and the regular Cypress suites do not exercise it.
  The dedicated production offline suite serves the normal optimized artifact in Chrome, waits for worker
  control and proves a restart with the browser network disconnected. This adds a slow browser job and three
  exclusive local ports to CI; the faster suites still verify application behavior without a worker.
- **The manifest ships without icons**, so the PWA is not installable: an icon is a design-system asset and issue #7 has not chosen one. The manifest is a link in the head and a name until then.
- **The pupitre has to be served at the root of its origin, and the worker is what makes that expensive.** `index.html` carries `<base href="/">`, the manifest declares `start_url` and `scope` at `/`, and the generated `ngsw.json` lists `/index.html` and the hashed bundles at the root. Served under a sub-path — `/pupitre/`, which `outputPath` invites — the base href already breaks a plain SPA into visible 404s; the worker breaks worse, because registration fails on scope and whatever a browser already cached stays served. The four move together or not at all, and that is a deployment prerequisite beside the `pupitre_device` client.

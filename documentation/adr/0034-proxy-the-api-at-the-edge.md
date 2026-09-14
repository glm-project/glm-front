# 0034 — Proxy the API at the edge and keep the front same-origin

## Status

Accepted. Complements [ADR 0006](0006-how-the-front-calls-the-back.md): the generated routes still serve as
URLs as they are, and no base URL is configured anywhere. What changes is who answers `/api/**` once the
front is deployed.

## Context

`deploy.yml` publishes the pupitre to Cloudflare Pages on every push to `main`. The published bundle could not
work. It carried `keycloak:{url:"http://localhost:9080"}`, because the `production` configuration of
`angular.json` declares no `fileReplacements` and `environment.ts` is shipped as written. And nothing served
`/api/**`: ADR 0006 has the front call its own origin, which the Vite proxy answers in development and the
Spring Boot instance answered when the two were one artefact.

The two runtimes are now apart. The back end and Keycloak run on Clever Cloud; the front is static files on
Cloudflare Pages. That split is provisional: Cloudflare is a free host for a demonstration, and the front is
expected to join the back on Clever Cloud. This record therefore has to be cheap to undo.

Three facts bounded the answer.

- **`_redirects` cannot reach the back end.** Cloudflare is explicit: "Proxying will only support relative URLs
  on your site. You cannot proxy external domains." A SPA fallback would not help either — the pupitre declares
  one route, `{ path: '', component: PupitrePage }`.
- **The whole repository assumes same-origin.** `proxy.conf.json` in development, every `cy.intercept` written
  against a relative path, and `scripts/serve-production-pupitre-fixture.mjs`, which serves the application and
  `/api/**` on one port. A deployed front calling an absolute origin would be the one topology nothing
  exercises.
- **Keycloak cannot move behind a proxy.** The token carries an `iss` bound to its hostname, which the back end
  validates through `issuer-uri`, and the verification URI printed on the enrolment QR code has to be the real
  one.

## Considered options

- A Cloudflare Pages Function relaying `/api/**` to the back end — **kept**.
- A generated `_redirects` proxying `/api/*` — rejected: Cloudflare does not proxy external domains, so the
  rule would never fire.
- An absolute base URL in `ApiClient` plus CORS on the back end — rejected: it amends ADR 0006, adds a
  configuration object and a preflight on every write, and leaves the deployed topology untested.
- Proxying Keycloak the same way — rejected: it breaks the `iss` claim the back end validates and the
  verification URI the operator reads off the screen.
- Serving the front from the back end — rejected: `glm-back` packages no front. `target/classes/static/pupitre`
  is a leftover of the seed4j monolith, and wiring it back would mean publishing front artefacts across two
  repositories.
- A script generating `environment.deployed.ts` from the deployment variables — rejected: it reimplemented, in
  a hundred lines with its own tests, what the CLI's `--define` already does from the shell.
- `@ngx-env/builder`, the Angular equivalent of Vite's `VITE_*` — rejected: it wraps every builder this
  repository uses and would delete more code than it adds, but its options carry no notion of a required
  variable, so a missing or mistyped name inlines `undefined` and deploys in silence. That is the defect this
  record exists to remove. It becomes the right choice the day several deployment variables exist.
- Reading configuration at runtime from `GET /config.json` — rejected: `enableProdMode()` and
  `provideServiceWorker` are read before bootstrap, and a fetch on boot adds a failure point to a shop-floor
  console whose shell is cached precisely so it starts without the network (ADR 0004).

## Decision

**Relay `/api/**` through `functions/api/_middleware.js`**, a Pages Function that rewrites the request onto the
back-end origin and forwards it untouched. `new Request(target, request)` carries the method, the body and the
headers, including the bearer `httpAuthInterceptor` attached. The browser only ever names its own origin, so
`ApiClient`, its ports and its adapters are unchanged and no preflight happens.

**Name the Function after the directory it guards, not after a route pattern.** Pages derives routes from
file names, so a catch-all would be `functions/api/[[path]].js` — framework syntax where a reader expects a
name. A `_middleware.js` reads as "everything under /api", and `wrangler pages dev` confirms it intercepts
`/api/operateurs` and `/api/atelier/suivis` alike with no route file beside it, while `/` still serves the
shell. No plugin was adopted: none of the official ones relays to a backend, and a plugin would mount in the
catch-all file this naming avoids.

**Keep the directory at the repository root.** `wrangler pages deploy <directory>` looks for `functions` in the
working directory, never inside the published one. Misplaced, it raises nothing: the site deploys without it
and `/api/**` answers the `index.html`. No `_routes.json` is written; Cloudflare derives the routes from the
directory, so only `/api/*` invokes the Function and a Function wins over a static asset of the same path.

**Write the Function in JavaScript.** `eslint.config.mjs` covers `**/*.{js,mjs,cjs}`, its TypeScript blocks
target `src/**` only, and none of the five `tsconfig` projects reaches the repository root. In TypeScript the
Function would escape every net the repository holds; in JavaScript it lives under the same lint, formatting
and `node:test` regime as `scripts/*.mjs`.

**Give each deployed front its own environment.** `environment.deployed.ts` is committed and names its
Keycloak through `NG_DEPLOYED_KEYCLOAK_URL`, a global the `--define` of `deployed:build:pupitre` and
`deployed:build:gestion` replaces from `DEPLOYED_KEYCLOAK_URL`; a `deployed` configuration of the front's build
target substitutes that file and writes to `target/deployed/<front>`. The declaration of that global lives once,
at `src/main/webapp/deployment.d.ts`, because one TypeScript program compiles both fronts. Each
`environment.deployed.ts` is listed in the `files` of `tsconfig.app.json` beside `auth.provider.cypress.ts`,
the other replacement target, so it is type-checked and linted like ordinary source. The default `production` build keeps local values,
because `serve-production-pupitre-fixture.mjs` needs them, and the separate output directory keeps a deployed
bundle from ever being served to that harness.

**Take each origin from the environment, at the moment it can be read.** The API origin is a runtime concern:
the Function reads `env.API_ORIGIN`, a variable of the Pages project, so moving the back end needs no rebuild.
The Keycloak origin is a build concern: it is compiled into the bundle, so a deployed build needs
`DEPLOYED_KEYCLOAK_URL` and the workflow supplies it from a repository variable. Angular carries no `.env`
support and `define` takes only literals written in `angular.json`, but the CLI exposes `--define`, so the shell
carries the value and no generator is needed. Neither is a secret — both
travel in the JavaScript every visitor downloads — so neither belongs in `secrets`, where GitHub would redact
the very message that explains a failure.

**Refuse rather than guess, on both sides.** A Function without `API_ORIGIN` answers 500 naming the missing
variable instead of proxying to nowhere. The build reads `${DEPLOYED_KEYCLOAK_URL:?…}`, the POSIX expansion that
fails with its own message when the variable is unset **or empty** — and empty is the case that matters, since
`${{ vars.X }}` on an undeclared variable yields the empty string rather than an absence.

## Consequences

### Positive

- The deployed topology is the one development and the tests already exercise: one origin, relative paths.
  `test:production-offline` now represents production instead of approximating it.
- No Angular code changed, no ADR amended, no CORS to hold in step on the back end, and no preflight round trip
  before every write from a shop floor whose network drops for seconds at a time.
- Moving the back end is a variable change on the Pages project, with no build and no merge request; moving
  Keycloak is a variable change and a rerun of the workflow.
- The Function is a pass-through with no branch, and `scripts/api-relay.spec.mjs` drives it through a fake
  `forward`, so path, query string, bearer, method, body and answer are all held by a test.

### Negative

- **This repository now deploys executable code, not only static files.** The Function sits on the path of
  every API call the pupitre makes.
- **A misplaced `functions` directory fails silently.** Nothing in the build or the deployment says the proxy is
  missing; only a request to `/api/**` answering HTML does. The check is a manual `curl` after deployment.
- The Workers free plan allows 100 000 requests a day and 10 ms of CPU per request. The CPU is irrelevant to a
  pass-through, the daily count is not if a pupitre becomes chatty.
- One more network hop between the operator and the back end.
- **The deployment is configured in two places, and neither is this repository**: `API_ORIGIN` on the Pages
  project and `DEPLOYED_KEYCLOAK_URL` in the repository variables. Nothing here can check either value, and a
  reader cannot tell from the code where a deployed pupitre points.
- **Only the presence of `DEPLOYED_KEYCLOAK_URL` is checked, never its shape.** A trailing slash or a path
  reaches the realm endpoints `DeviceGrantConfiguration` builds and doubles a separator, silently. Validating it
  would mean the generator this decision removed; the format is documented with the variable instead.
- `deployed:build:pupitre` relies on POSIX `${VAR:?message}`, so it runs under `sh`, not on Windows. The
  repository already assumes this in its Cypress scripts.
- **`gestion` now ships through the same shape, and pays the same price twice.** It has its own `deployed`
  configuration, its own Pages project and its own job in `deploy.yml`; both fronts read one
  `DEPLOYED_KEYCLOAK_URL`, so they cannot point at different Keycloak origins without a second variable. Its
  Keycloak client `web_app` needs `redirectUris` and web origins naming the deployed host, and that lives in
  Keycloak, where nothing here can check it: a localhost-only client answers with a refused redirect, not with
  a build failure.
- The Function runs on a platform the validation graph never starts: `npx wrangler pages dev` exercises it by
  hand, but no command in `validate:complete` does, so only its exported relay is under test.

### What would reopen this

The front leaving Cloudflare, which is expected. Nothing in the application knows it is behind a relay, so the
move deletes rather than rewrites: `functions/`, `scripts/api-relay.spec.mjs`, the `test:functions` script,
the wrangler step of `deploy.yml` and the `API_ORIGIN` variable. Around a hundred lines, no Angular change.
This is why the base URL was kept out of `ApiClient`: it would have settled a provisional topology into the
application and outlived it.

What survives any host: the `deployed` configuration, `environment.deployed.ts` and `DEPLOYED_KEYCLOAK_URL`.
Keycloak answers on its own origin wherever the front lives.

Two shapes are possible on Clever Cloud and only one keeps this record's invariant. Serving the pupitre from the
Spring Boot instance is same-origin — `target/classes/static/pupitre` already names the seed4j convention for
it — but it means publishing the front artefact into the back end's build across two repositories, and serving
it under a path would reopen `<base href="/">` and the service-worker scope. A separate static application is
easier to deploy and lands on a different origin, which brings back either CORS or a relay.

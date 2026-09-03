# Architecture

Read [`hexagonal-architecture.md`](hexagonal-architecture.md) for the _why_; what follows is what review
actually checks.

## One tree of contexts, two composition roots

```
src/main/webapp/
  app/          # the contexts, shared by both fronts — the root arch-unit scans
  gestion/      # composition root: index.html, main.ts, shell, app.route.ts, environments, providers
  pupitre/      # composition root: idem, on port 9001
```

A composition root wires: it names the shell, the routes, the environment, which adapter implements which
port, and what its front puts in the shared chrome. It holds no business rule. `angular.json` gives each
one a `build-<front>` and a `serve-<front>` target, differing only in `index`, `browser`, `outputPath`,
`assets`, `budgets` and `fileReplacements` — plus one exception worth its line:
`allowedCommonJsDependencies` lists `keycloak-js` and its transitive CommonJS deps on the `gestion` target
only. The pupitre does not inherit it, so the day `keycloak-js` reaches that bundle the build says so.

The two `index.html` differ on the same ground: gestion pulls Roboto and Material Icons from the Google
Fonts CDN, the pupitre pulls nothing. **The pupitre is offline-first** — it runs on the shop floor, where a
remote stylesheet is a render it cannot make. Anything that front needs at boot ships in its bundle.

**Dependencies point one way: a root imports from `app/`, never the reverse.** A file under `app/`
reaching into `gestion/` or `pupitre/` drags one front's concerns into the other's bundle — the
boundary the split exists to draw. Screens that belong to a single front live at
`app/<context>/infrastructure/primary/<front>/`, not in the root — what a root may hold is composition:
the shell, the routes, the providers, and how this front fills the chrome that `app/shared` provides.

There is one `test` target for the whole tree: the coverage bar is a property of the repository, not of
an application, and both roots are measured.

## A bounded context starts with its `package-info.ts`

Business code lives under `src/main/webapp/app/`, one top-level folder per bounded context — currently
`authentication` and `shared`, both shared kernels. `src/test/webapp/unit/HexagonalArchTest.spec.ts`
discovers contexts by scanning `**/package-info.ts` for a class extending `BusinessContext`
(`@/app/BusinessContext`) or `SharedKernel` (`@/app/SharedKernel`) — folder naming alone is invisible to
it.

Nothing under `app/` sits outside that scan today: `app/login/` was the last folder without a
`package-info.ts`, and the header composition absorbed its logout button. A folder that arrives without one
lands straight in the blind spot — the architecture test stays green over it because it checks nothing
there.

```
<context>/
  package-info.ts
  domain/                    # business logic, framework-agnostic
  application/               # orchestration only, no business rules
  infrastructure/
    primary/                 # adapters driving the context (components, routes)
    secondary/               # adapters implementing domain ports (HTTP clients)
```

Code genuinely shared across contexts belongs in a context extending `SharedKernel` (that is what `shared`
is), not copied into each context.

## The rules the architecture test enforces

- a context may not depend on another context's `domain`;
- cross-context calls go through a primary adapter named with a `TypeScript` prefix, and such an adapter may
  only be depended on from a `secondary` package — never called directly by UI code;
- `domain` depends only on `domain` and shared kernels — no Angular import;
- `application` may not depend on `infrastructure`, `secondary` may not depend on `application`, and
  `primary` and `secondary` never depend on each other;
- in the layered check, ordering is `domain models/services → application → primary/secondary adapters`, and
  `primary adapters` and `secondary adapters` may not be accessed by any layer.

A failure means the code deviates. A failing layered check is usually a DIP violation — the domain reaching
outward instead of an adapter reaching inward.

## Everything lives as close as possible to where it is used

Hoisting to a higher level — a global stylesheet, the `shared` kernel, a root-provided service — is only
justified when the need is genuinely shared; until then, the nearest common owner wins. Reuse an abstraction
that already exists in `shared`; do not create a new one preemptively. For a value shared by two sibling
components, a CSS custom property on their nearest common ancestor cascades on its own — that beats a
`:root` entry in `styles.css`.

**Two sibling components communicate through the parent page**: an output going up, a call coming back down
through a template reference. A `providedIn: 'root'` service with a `Subject` would make the dependency
graph invisible. Accepted cost: prop-drilling through the intermediaries.

`providedIn: 'root'` would stay legitimate for genuine cross-cutting infrastructure, but nothing uses it
today: an adapter behind a port is provided by the composition root that chooses it, so both
authentication adapters are a bare `@Injectable()`.

## Chrome shared by both fronts sits at an adapter address, and stays mute

The header is `app/shared/infrastructure/primary/header/` — a primary adapter of the `shared` kernel, and
the address matters. `app/shared/header/` would pass the architecture test just as well, and that is the
trap: `withOptionalLayers(true)` skips a class sitting outside every declared layer, so it reads green
because nothing bites. Measured at the adapter address, a header importing from
`shared/infrastructure/secondary/` reddens _Primary should not depend on secondary_; at the short address
it reddens nothing.

The component is mute: no routing, no logout, no connectivity state. It holds a `heading` input and one
projection slot, and it keeps the toolbar the gestion front already had — the chrome moves address here,
it does not change form. What varies is composed by each front in its own root, `gestion/header/` and
`pupitre/header/`, which put the nav and the logout button, or the connectivity sign, into that slot. A
shared component that knew one front would pull its concerns into the other's bundle, which is the
boundary the split exists to draw. One slot means one region: the gestion nav trigger sits with the
actions, on the right.

One address for the chrome is also what makes the open design-system question cheap: swapping what the bar
is made of is one component, for both fronts at once.

Each composition carries its own `data-selector` as a host attribute, the way the shells do.

The pupitre's connectivity sign has **no producer yet**. Its state reads on the outcome of the last push,
and the pupitre pushes nothing until it has a queue, so the composition root holds the only value that
rule can yield — `pupitre/app.ts`, a named constant, which is where the queue will plug in. The
disconnected rendering exists and is tested; nothing writes it in production yet.

## Ports are interfaces owned by the `domain`, implemented in `infrastructure/secondary`

Keep them narrow and specific to what the domain actually calls, never a catch-all repository interface; a
new integration means a new adapter, not an edit to domain logic. A `domain` class does one business thing —
HTTP and serialization concerns never leak into a domain model. `domain` and `application` depend on the
abstractions they own; `infrastructure` depends inward on them, never the reverse.

Use the `@/*` alias (`tsconfig.json:5-7`) instead of `../../../..` when crossing a context boundary. It is
the alias the architecture test itself uses.

## Authentication wiring

Authentication is a `SharedKernel` context, `app/authentication/`: the interceptor is global and there is
no business rule to make it a bounded context.

- **The port** (`domain/AuthenticationPort.ts`) says only what its callers need: `authenticate()`,
  `currentToken()`, `logout()`. It is an **abstract class, and it imports nothing** — both forced. An
  interface leaves no runtime token to inject, and an rxjs import in `domain/` fails the architecture
  test, which is why the contract is a `Promise` and not an `Observable`.
- **No token is a normal answer**, not a failure: offline the refresh fails and none is current. The
  `if (token)` in `httpAuthInterceptor` is the whole handling this needs.
- **`keycloak-oidc`** is the `gestion` adapter (`keycloak-js`, standard flow, `onLoad: 'login-required'`,
  silent refresh at `MIN_TOKEN_VALIDITY_SECONDS = 70`). **`in-memory`** is its Cypress sibling. Neither ever
  imports the other: two siblings, and the composition root chooses.
- **The composition root owns the wiring.** `gestion/auth.provider.ts` builds the Keycloak instance from
  `gestion/environments/environment*.ts` (`keycloak.url` / `realm` / `client_id`) and binds the port to its
  adapter. No Keycloak URL, realm or client id anywhere else, no secret in the repo. The provider cannot
  live in `app/` — it reads a front's `environments/`.
- **The swap is `fileReplacements`, never `if (environment.…)`.** A runtime flag would ship an
  authentication bypass in the production bundle: a security line, not a style one. Measured: the `cypress`
  build contains the in-memory adapter and none of keycloak-js. Cypress cannot substitute at the network
  layer instead: `onLoad: 'login-required'` redirects to Keycloak before the first request leaves the
  browser, so there is nothing to intercept.
- The pupitre binds nothing yet: no HTTP client, no provider, no Keycloak block in its environments. It
  authenticates through a device grant `keycloak-js` cannot perform, and gets its `auth.provider.ts` with
  that adapter.

---

New rules on this topic go here.

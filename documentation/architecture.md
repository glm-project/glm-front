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

The two `index.html` agree on one thing worth its line: **neither names a third party.** The pupitre is
offline-first — it runs on the shop floor, where a remote stylesheet is a render it cannot make — and gestion
holds the same rule for a second reason, that a CDN `<link>` is a supply chain no integrity attribute can pin
and a user's IP address handed to a stranger on every load. `ExternalRequestsTest`
(`src/test/webapp/unit/`) reads both documents and fails on any origin it finds, absolute or
protocol-relative. Anything a front needs at boot ships in its bundle.

**Dependencies point one way: a root imports from `app/`, never the reverse.** A file under `app/`
reaching into `gestion/` or `pupitre/` drags one front's concerns into the other's bundle — the
boundary the split exists to draw. Screens that belong to a single front live at
`app/<context>/infrastructure/primary/<front>/`, not in the root — what a root may hold is composition:
the shell, the routes, the providers, and how this front fills the chrome that the design system provides.

**Neither front imports the other, and `app/` imports neither** — `eslint.config.mjs` holds both
mechanically. It takes two native rules, not one: `no-restricted-imports` covers static imports and
re-exports, and `no-restricted-syntax` on `ImportExpression` covers the dynamic `import()` of a lazy route —
which the first rule never sees, since it only registers `ImportDeclaration` and the two export forms. A lazy
route is the likeliest leak, so the second rule is the one that matters. It matches the quoted and the
backtick form, because a `TemplateLiteral` is not a `Literal` and a selector naming only the latter would
miss half the vector. What both fronts need goes under `app/`.

Three zones, the same pair of rules, a different forbidden path each: `app/**` may not name either front in
any segment, `<front>/**` may not name the other, and `app/**/primary/<front>/**` may not name the other
front nor reach one along a path that never passes through an `app/` segment. That last is the design point —
a screen carries its own front's name in every path of its own zone, so the ban is narrowed by the `app/`
segment rather than lifted: `@/app/…/primary/pupitre/Screen` passes, `@/pupitre/app.route` does not, and nor
does any other spelling of it — a `../` climb, a leading `./`, or the `src/main/webapp/…` that `baseUrl`
resolves. Order matters, because ESLint replaces the options of a repeated rule instead of merging them —
which is why the zone restates the other-front ban it would otherwise lose.

`arch-unit-ts` cannot take this job, which is why it falls to lint: it reads static imports only
(`getImportDeclarations()`, ts-morph) and its root is `app/`, so `pupitre/app.route.ts` is invisible to it.

Three gaps are known and left open. A path built at runtime — ``import(`@/${front}/x`)`` — is undecidable
statically; laundering through a barrel, where a third file re-exports across the boundary, resolves to a
path neither rule matches; and a `..` climbing back out through the `app/` segment that granted the
exemption (`@/app/../pupitre/app.route`) buys back what the third zone forbids. All three want real path
resolution rather than string matching; `eslint-plugin-boundaries` is the purchase to make the day one of
them is observed, not before.

There is one `test` target for the whole tree: the coverage bar is a property of the repository, not of
an application, and both roots are measured.

## A bounded context starts with its `package-info.ts`

Business code lives under `src/main/webapp/app/`, one folder per bounded context — currently
`shared/authentication` and `shared/design-system`, both shared kernels.
`src/test/webapp/unit/HexagonalArchTest.spec.ts` discovers contexts by scanning every `package-info.ts` for a
class extending `BusinessContext` (`@/app/BusinessContext`) or `SharedKernel` (`@/app/SharedKernel`) — folder
naming alone is invisible to it.

**The address says the nature: `app/shared/<name>/` is a shared kernel, `app/<name>/` a business context.**
`app/shared/` is a namespace and holds no `package-info.ts` of its own — it is not a context, and nothing
lives directly under it outside a nested kernel. That last clause is not decoration: a file dropped at
`app/shared/x.ts` would belong to no declared context, which is the blind spot two paragraphs below.

**That scan walks the whole tree, and it has to be written that way.** `TypeScriptProject.filterClasses` looks
one level below the project root only — it maps over the root's direct sub-packages and keeps their own files,
never recursing — so a context nested any deeper than `app/<name>/` is discovered by nobody. The spec filters
`srcProject.allClasses()` on the file name instead, which is recursive. Measured on
`app/shared/design-system/`: through `filterClasses` the kernel vanishes from the suite, taking its three
per-context rules with it (11 tests down to 8), and `arch-unit-ts.json` carries `failOnEmptyShould: false`, so
nothing complains.

One folder under `app/` sits outside that scan on purpose — `app/api/`, below. Everywhere else the absence
is a defect: `app/login/` was the last folder to lack a `package-info.ts`, and the header composition
absorbed its logout button. A context that arrives without one lands straight in the blind spot — the
architecture test stays green over it because it checks nothing there.

```
<context>/
  package-info.ts
  domain/                    # business logic, framework-agnostic
  application/               # orchestration only, no business rules
  infrastructure/
    primary/                 # adapters driving the context (components, routes)
    secondary/               # adapters implementing domain ports (HTTP clients)
```

Code genuinely shared across contexts belongs in a context extending `SharedKernel` — `design-system` is one —
not copied into each context.

## The wire format lives at an address no `domain` can reach

`app/api/` holds two files and no `package-info.ts`: `openapi.json`, a snapshot of the specification
`glm-back` publishes at its own `documentation/openapi.json`, and `schema.d.ts`, generated from it by
`openapi-typescript`. **The missing `package-info.ts` is the rule, not an oversight.** The folder belongs to
no declared context, so `domain` — which may only depend on `domain` and shared kernels — cannot import it,
while `infrastructure/secondary` can. Both directions were measured: an `import` of `@/app/api/schema` from
`shared/authentication/domain/` reddens _Domain should not depend on outside_, the same import from
`shared/authentication/infrastructure/secondary/` leaves the suite green. A shared kernel of wire types would
be importable from every domain and the rule would be an intention.

**`app/api/` must stay under `app/`.** `TypeScriptProject` populates itself with
`addSourceFilesAtPaths('src/main/webapp/app/**/*.ts')`, and `isImportValid` drops any import ts-morph fails
to resolve on a bare `console.warn`. Moved out, an import from a `domain` would vanish from the dependency
graph and the check above would read green over it. The placement is the guard rail.

Only `infrastructure/secondary` reads these types; the adapter translates them into hand-written domain
classes. The generated file is a declaration file, so it emits no module: there is nothing to instrument and
the 100 % coverage bar never sees it (measured — it appears in no coverage report). It is in eslint's
`ignores` (`eslint.config.mjs`): measured at 319 errors without that entry, `local/no-comments` on every
operation description springdoc wrote into the spec, and `strictTypeChecked` on shapes no one here chose.

## The specification is pinned, not followed

```
back's code ──✓ back CI──▶ back's openapi.json ──npm run api:sync──▶ app/api/openapi.json ──✓ front CI──▶ schema.d.ts
```

`npm run api:sync` pulls the back's file through `gh api`, never `curl`: `gh` is authenticated, so the
command survives the day `glm-back` turns private, which `raw.githubusercontent.com` would not.
`npm run api:types` regenerates `schema.d.ts` and reformats it, so `prettier --check .` stays green without
an entry in `.prettierignore`. Both the specification and the generated types are committed, and CI runs
`npm run api:types && git diff --exit-code`: types that no longer match the committed specification fail the
build.

**The middle link stays manual, deliberately.** CI never reaches across repositories — a workflow reading
`main` of `glm-back` would need a PAT held as a secret here, an Action's `GITHUB_TOKEN` being confined to its
own repository. Refreshing the contract is a human gesture, and its diff is reviewed like any other.

## The rules the architecture test enforces

- a context may not depend on another context's `domain`;
- cross-context calls go through a primary adapter named with a `TypeScript` prefix, and such an adapter may
  only be depended on from a `secondary` package — never called directly by UI code;
- `domain` depends only on `domain` and shared kernels — no Angular import — **with `design-system` carved
  out of that allowance**, below;
- the `design-system` kernel depends on no business context, and only `primary` adapters depend on it;
- `application` may not depend on `infrastructure`, `secondary` may not depend on `application`, and
  `primary` and `secondary` never depend on each other;
- in the layered check, ordering is `domain models/services → application → primary/secondary adapters`, and
  `primary adapters` and `secondary adapters` may not be accessed by any layer.

A failure means the code deviates. A failing layered check is usually a DIP violation — the domain reaching
outward instead of an adapter reaching inward.

The `design-system` line is the one carve-out, and it exists because the line above it is too generous by
exactly one kernel: `domain` may depend on shared kernels, and the design system is a shared kernel, so a
`domain` importing a `glm-button` was legal. Measured before the rule landed — that import in place, the
whole suite green at 11 tests. Who may depend on the design system, and what the rules deliberately do not
reach, is in [the design system doc](design-system.md).

## Everything lives as close as possible to where it is used

Hoisting to a higher level — a global stylesheet, a shared kernel, a root-provided service — is only
justified when the need is genuinely shared; until then, the nearest common owner wins. Reuse an abstraction
that already exists under `app/shared/`; do not create a new one preemptively. For a value shared by two
sibling components, a CSS custom property on their nearest common ancestor cascades on its own — that beats a
`:root` entry in `styles.css`.

**Two sibling components communicate through the parent page**: an output going up, a call coming back down
through a template reference. A `providedIn: 'root'` service with a `Subject` would make the dependency
graph invisible. Accepted cost: prop-drilling through the intermediaries.

`providedIn: 'root'` would stay legitimate for genuine cross-cutting infrastructure, but nothing uses it
today: an adapter behind a port is provided by the composition root that chooses it, so both
authentication adapters are a bare `@Injectable()`.

## Chrome shared by both fronts sits at an adapter address, and stays mute

The header is `app/shared/design-system/infrastructure/primary/header/` — a primary adapter of the
`design-system` kernel, and both halves of the address matter. A mute bar carrying a title and a slot **is**
a design-system component, and the day a second one arrives — an icon, a button — a header kernel of its own
would have the chrome sitting in two contexts at once. It sits at the adapter address, not at the shorter
`app/shared/design-system/header/`, which the architecture test only half covers. Measured at the new depth
with a deliberate import from `design-system/infrastructure/secondary/`: the adapter address reddens
_Primary should not depend on secondary_ **and** the layered check; the short address reddens the layered
check alone, on its target side (_secondary adapters may not be accessed by any layer_). A class outside
every declared layer is skipped as an origin, so the rules keyed on where a dependency comes from never see
it, and `..primary..` does not match it either. Half the net, for a name one segment shorter.

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

Authentication is a `SharedKernel` context, `app/shared/authentication/`: the interceptor is global and there
is no business rule to make it a bounded context.

- **The port** (`domain/AuthenticationPort.ts`) says only what its callers need: `authenticate()`,
  `currentToken()`, `logout()`. It is an **abstract class, and it imports nothing** — both forced. An
  interface leaves no runtime token to inject, and an rxjs import in `domain/` fails the architecture
  test, which is why the contract is a `Promise` and not an `Observable`.
- **No token is a normal answer**, not a failure: enrolment can be refused, and a token that has expired
  with no renewal in hand leaves none current. The `if (token)` in `httpAuthInterceptor` is the whole
  handling this needs. A **failed renewal is not** one of those moments: both adapters keep handing over the
  token they hold until it truly expires, so a network blink costs nothing.
- **`keycloak-oidc`** is the `gestion` adapter (`keycloak-js`, standard flow, `onLoad: 'login-required'`,
  silent refresh at `MIN_TOKEN_VALIDITY_SECONDS = 70`). **`in-memory`** is its Cypress sibling. **`device`**
  is the pupitre's. None ever imports another: siblings, and the composition root chooses.
- **The composition root owns the wiring.** `gestion/auth.provider.ts` builds the Keycloak instance from
  `gestion/environments/environment*.ts` (`keycloak.url` / `realm` / `client_id`) and binds the port to its
  adapter. No Keycloak URL, realm or client id anywhere else, no secret in the repo. The provider cannot
  live in `app/` — it reads a front's `environments/`.
- **The swap is `fileReplacements`, never `if (environment.…)`.** A runtime flag would ship an
  authentication bypass in the production bundle: a security line, not a style one. Measured: the `cypress`
  build contains the in-memory adapter and none of keycloak-js. Cypress cannot substitute at the network
  layer instead: `onLoad: 'login-required'` redirects to Keycloak before the first request leaves the
  browser, so there is nothing to intercept.
- **The pupitre enrols through the `device` adapter**, hand-written: `keycloak-js` offers
  `standard | implicit | hybrid` and no `device_code`, so there is no library to wrap. It runs the RFC 8628
  device grant — `POST .../auth/device`, then poll `.../token` on the device code through
  `authorization_pending` and `slow_down` — asks for `offline_access`, and renews on a timer 30 s before
  expiry. A renewal refused with `invalid_grant` ends the session and starts a fresh enrolment; every other
  refusal is retried, because those come back on their own. `pupitre/auth.provider.ts` builds its
  `DeviceGrantConfiguration` from `pupitre/environments/environment*.ts`, same shape as gestion's.
- **The device adapter talks through `HttpBackend`, not `HttpClient`.** `HttpBackend` bypasses every
  interceptor by design, which is the point: the pupitre's own auth-protocol traffic must not carry the
  `Authorization: Bearer` header `httpAuthInterceptor` attaches to everything else.
- **`authenticate()` never rejects.** Every HTTP failure maps to "no token", the normal answer above. A
  rejection would surface as an uncaught exception and fail every Cypress spec that boots the pupitre
  without a Keycloak behind it.
- **Tokens live in memory only.** `offline_access` is requested so the session survives a shift, but nothing
  is written to disk: a reload re-enrols. A long-lived refresh token in `localStorage` is reachable by any
  XSS, and the shop floor's screens are shared.

---

New rules on this topic go here.

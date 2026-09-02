# Architecture

Read [`hexagonal-architecture.md`](hexagonal-architecture.md) for the _why_; what follows is what review
actually checks.

## A bounded context starts with its `package-info.ts`

Business code lives under `src/main/webapp/app/`, one top-level folder per bounded context (currently `home`
and `shared`). `src/test/webapp/unit/HexagonalArchTest.spec.ts` discovers contexts by scanning
`**/package-info.ts` for a class extending `BusinessContext` (`@/app/BusinessContext`) or `SharedKernel`
(`@/app/SharedKernel`) — folder naming alone is invisible to it.

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
graph invisible. Accepted cost: prop-drilling through the intermediaries. `providedIn: 'root'` stays for
genuine cross-cutting infrastructure — that is what `Oauth2AuthService` is.

## Ports are interfaces owned by the `domain`, implemented in `infrastructure/secondary`

Keep them narrow and specific to what the domain actually calls, never a catch-all repository interface; a
new integration means a new adapter, not an edit to domain logic. A `domain` class does one business thing —
HTTP and serialization concerns never leak into a domain model. `domain` and `application` depend on the
abstractions they own; `infrastructure` depends inward on them, never the reverse.

Use the `@/*` alias (`tsconfig.json:5-7`) instead of `../../../..` when crossing a context boundary. It is
the alias the architecture test itself uses.

## Authentication wiring

- `Oauth2AuthService` (`src/main/webapp/app/auth/oauth2-auth.service.ts`) is the only wrapper around
  `keycloak-js`: `token`, `isAuthenticated`, `initAuthentication()` (redirect login,
  `onLoad: 'login-required'`), `logout()`, and the silent refresh (`MIN_TOKEN_VALIDITY_SECONDS = 70`).
- Keycloak config comes from `environments/environment*.ts` (`keycloak.url` / `realm` / `client_id`) through
  the DI token provided in `main.ts`. No Keycloak URL, realm or client id hardcoded anywhere else. No secret
  in the repo.

---

New rules on this topic go here.

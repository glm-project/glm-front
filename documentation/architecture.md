# Architecture

Operational rules for changing the project structure. For onboarding or architectural rationale, read
[`hexagonal-architecture.md`](hexagonal-architecture.md).

## One context tree, two composition roots

```text
src/main/webapp/
  app/          # bounded contexts shared by both fronts; arch-unit scans this root
  gestion/      # composition root: bootstrap, shell, routes, environments, providers
  pupitre/      # composition root: the same responsibilities for the shop floor
```

A composition root chooses the shell, routes, environment and adapter bound to each port. Business rules
live in a context under `app/`.

Dependencies point from `gestion/` and `pupitre/` into `app/`. Neither front imports the other, and `app/`
imports neither front. A screen used by one front still belongs to its context at
`app/<context>/infrastructure/primary/<front>/`; the front root only composes it.

`eslint.config.mjs` enforces these boundaries for static imports, re-exports and literal dynamic imports.
It deliberately cannot resolve a runtime-built path or a dependency laundered through a barrel. Introduce a
resolver-based boundary tool only when such a case appears.

Both boot documents are self-contained: every asset needed at boot ships in the bundle.
`ExternalRequestsTest` rejects absolute and protocol-relative external origins.

## Every context declares its boundary first

Create `package-info.ts` before adding code to a context. It extends `BusinessContext` for
`app/<name>/` or `SharedKernel` for `app/shared/<name>/`. `app/shared/` is only a namespace; files belong in
a declared kernel below it.

`HexagonalArchTest.spec.ts` discovers contexts from those declarations. A folder without one is invisible to
the per-context checks, so a green suite would prove nothing about it. `app/generated/` is the single
intentional exception; [`api.md`](api.md) owns why.

Use this shape where the layers are needed:

```text
<context>/
  package-info.ts
  domain/                    # framework-free business rules and ports
  application/               # orchestration
  infrastructure/
    primary/                 # adapters driving the context
    secondary/               # adapters implementing domain ports
```

A small context may omit unused layers. Keep every class in the layer matching its responsibility rather
than creating empty folders for symmetry.

## Dependencies flow inward

The architecture suite enforces these rules:

- a context does not depend on another business context's domain;
- cross-context calls use a primary TypeScript adapter whose name starts with `TypeScript`, reached from a
  secondary adapter;
- domain code depends only on domain code and shared kernels, with the design system excluded;
- application code does not depend on infrastructure;
- primary and secondary adapters do not depend on one another;
- secondary adapters do not depend on application code;
- only primary adapters depend on the design system.

A failing architecture test means the dependency is at the wrong address. Move the responsibility or invert
the dependency through a port; keep the test intact.

## Ports belong to the domain

A port states only what its callers need. Keep it narrow and specific to one capability. A new integration
adds an adapter; it does not add transport concepts to the domain.

Ports used as Angular injection tokens are abstract classes so they exist at runtime. Their signatures stay
framework-free. Application and domain code depend on the port; the composition root binds it to an adapter
from `infrastructure/secondary`.

Use the `@/*` alias across context or root boundaries. Relative imports remain appropriate inside one local
folder.

## Put behavior at the nearest owner

The nearest common owner wins. Promote code to a shared kernel, global stylesheet or root provider only once
the responsibility is genuinely shared. Reuse an existing shared abstraction before creating another.

Sibling components communicate through their parent page: output upward, invocation downward through an
input or template reference. This keeps the dependency visible. A root service is reserved for genuinely
cross-cutting infrastructure.

Each front owns its header structure, styling and navigation, logout or connectivity behavior. Share visual
primitives through the design-system primary adapter only when their contract is common. See
[`design-system.md`](design-system.md).

## Load the branch that owns the change

- Authentication, device credentials and authorization interceptors → [`authentication.md`](authentication.md)
- Generated OpenAPI types, HTTP adapters, pagination and API refusals → [`api.md`](api.md)
- Durable pupitre capture, synchronization and replay → [`offline-pupitre.md`](offline-pupitre.md)
- Tokens and visual dependency rules → [`design-system.md`](design-system.md)

A structural choice that changes these rules needs an ADR before implementation.

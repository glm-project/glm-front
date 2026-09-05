# Architecture

Operational rules for changing the project structure. For onboarding or architectural rationale, read
[`hexagonal-architecture.md`](hexagonal-architecture.md).

## Two independent applications own their contexts

```text
src/main/webapp/
  app/shared/                # genuinely common technical contracts and adapters
  gestion/contexts/         # business contexts owned by the back office
  gestion/shared/           # technical code used only by gestion
  pupitre/contexts/         # business contexts owned by the shop-floor console
  pupitre/shared/           # technical code used only by pupitre
```

A composition root chooses the shell, routes, environment and adapter bound to each port. Business rules
live below the owning application's `contexts/` directory.

Neither application imports or communicates with the other. Both may import genuinely common technical
code from `app/shared/`, which imports neither application. Screens belong to their business context's
primary adapters; the front root composes them.

`eslint.config.mjs` enforces these boundaries for static imports, re-exports and literal dynamic imports.
It deliberately cannot resolve a runtime-built path or a dependency laundered through a barrel. Introduce a
resolver-based boundary tool only when such a case appears.

Both boot documents are self-contained: every asset needed at boot ships in the bundle.
`ExternalRequestsTest` rejects absolute and protocol-relative external origins.

## Every context declares its boundary first

Create `package-info.ts` before adding code to a context or shared kernel. It extends `BusinessContext` for
`<front>/contexts/<name>/` or `SharedKernel` for any technical `<root>/shared/<name>/`. Shared directories
are namespaces; files belong in a declared kernel below them.

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

## Give functional decisions a domain owner

Before implementing or reviewing a behavior, identify its rule, its domain owner and the observable result
that proves it. Domain models may describe user interactions: numeric entry, correction, explicit validation
and expiration belong there when the product defines them as rules of a business process. A keyboard or
screen origin does not make a rule presentation-only. Framework-free code alone does not make it domain
code either; ownership follows the functional responsibility.

The domain decides valid transitions and whether a business command is allowed. Application code supplies
data and coordinates asynchronous work. Primary adapters translate browser events and render results;
focus, scrolling, signals and timer scheduling remain technical concerns. Reuse an existing coordinator
when it already owns the orchestration; a service earns its place through a distinct responsibility.

An invariant must still hold when a caller bypasses the screen or its timer has not run. Supply time
explicitly to time-dependent domain decisions and enforce them at the business command boundary. Keep one
authoritative lifecycle state; the displayed state reflects it. When a command completes asynchronously,
specify whether validity is evaluated at the action or at completion, then preserve that choice through
expiration and closure. Consult [offline-pupitre.md](offline-pupitre.md) for the pupitre's lifecycle rules.

In a review, trace each changed functional rule to its domain decision and a behavioral test. Passing the
import-boundary checks proves allowed dependencies, not correct ownership of the decisions.

## Dependencies flow inward

The architecture suite enforces these rules:

- a context does not depend directly on another business context's domain;
- a shared kernel does not depend on a business context;
- gestion and pupitre never import one another;
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
[ADR 0011](adr/0011-give-each-front-its-own-header.md) and [`design-system.md`](design-system.md).

## Load the branch that owns the change

- Authentication, device credentials and authorization interceptors → [`authentication.md`](authentication.md)
- Generated OpenAPI types, HTTP adapters, pagination and API refusals → [`api.md`](api.md)
- Durable pupitre capture, synchronization and replay → [`offline-pupitre.md`](offline-pupitre.md)
- Tokens and visual dependency rules → [`design-system.md`](design-system.md)

A structural choice that changes these rules needs an ADR before implementation.

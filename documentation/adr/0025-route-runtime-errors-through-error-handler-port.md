# 0025 — Route runtime errors through ErrorHandlerPort

## Status

Accepted.

Amended by [glm-front#180](https://github.com/glm-project/glm-front/issues/180): each front binds the port
once, in its composition root, and Angular's `ErrorHandler` reports through it. Failures Angular intercepts
and failures raised outside Angular now reach the same adapter as every other report (decisions 5 to 7).

Complemented by [0033](0033-compose-view-data-in-secondary-adapters.md): for composed view reads, the
secondary adapter reports acquisition failures once and rejects; the primary resource displays the error.

## Context

Asynchronous background operations, device grant token renewals, OIDC logout calls, and workshop synchronization loops can experience unexpected technical or transport failures.

Directly calling `console.error` in production classes:

- Bypasses dependency injection and makes error reporting difficult to verify in unit tests without spying on global `console.error`.
- Leaves mutations on caught error handlers surviving.
- Couples production coordinators directly to standard browser output rather than allowing application-level error boundaries or telemetry adapters.

Conversely, Angular's `@angular/core` `ErrorHandler` is designed primarily as a global framework error hook for uncaught template and lifecycle exceptions, and injecting `@angular/core` symbols directly into domain or boundary classes creates tight coupling to Angular's framework module.

## Considered options

- Call `console.error` directly — rejected: hard to test cleanly, pollutes test logs, and leaves unhandled rejection mutations surviving.
- Inject Angular's `@angular/core` `ErrorHandler` everywhere — rejected: couples secondary authentication adapters and application coordinators directly to the framework's presentation error hook.
- Define a dedicated `ErrorHandlerPort` in a shared technical module (`app/shared/error-handler`) with a default `ConsoleErrorHandler` adapter — **kept**: provides a lightweight, injectable contract for logging unhandled runtime rejections that can be easily doubled in tests via `ErrorHandlerFixture`.

Where the port is bound, and what becomes of Angular's `ErrorHandler`:

- Bind the port in each provider that needs it — rejected: ten bindings across authentication, offline and
  route providers, where a forgotten screen would silently keep the console adapter.
- Keep Angular's default `ErrorHandler` beside the port — rejected: template and lifecycle failures, and the
  primary adapters that injected it, would bypass whatever adapter replaces `ConsoleErrorHandler`.
- One shared provider that names `ConsoleErrorHandler` itself — rejected: `HexagonalArchTest` lets nothing
  inside the kernel but its secondary layer depend on a secondary adapter, and this provider must also bind a
  primary one.
- One shared provider that receives the adapter from the composition root and routes Angular's `ErrorHandler`
  to the port — **kept**.

## Decision

Adopt `ErrorHandlerPort` as the shared technical error-handling abstraction:

1. `ErrorHandlerPort` lives under `src/main/webapp/app/shared/error-handler/domain/ErrorHandlerPort.ts` as an abstract class defining `abstract handleError(failure: unknown): void`.
2. A default secondary adapter `ConsoleErrorHandler` logs unhandled errors to `console.error`.
3. Application coordinators and secondary authentication adapters (`AtelierCoordinator`, `PupitreSynchronization`, `PupitreRuntime`, `DeviceAuthentication`, `KeycloakOidcAuthentication`) inject `ErrorHandlerPort` to observe background rejections. So do primary adapters that report a failure, such as both front shells, the pupitre page and the enrolment screen: no production class injects Angular's `ErrorHandler`.
4. Unit tests use `ErrorHandlerFixture` to verify that unexpected runtime failures are observed without spying on global console methods.
5. `provideErrorHandler(adapter)`, in `app/shared/error-handler/infrastructure/primary/`, holds the only binding of the port. Each front calls it once in its composition root (`gestion/main.ts`, `pupitre/main.ts`) with the adapter it chooses, today `ConsoleErrorHandler`; the composition root chooses the adapter of every port.
6. The same provider binds Angular's `ErrorHandler` to `AngularErrorHandler`, a primary adapter that hands every error to the port: template, lifecycle and template-event failures follow the path of all other reports. `@typescript-eslint/no-restricted-imports` rejects importing `ErrorHandler` from `@angular/core` outside the kernel's primary layer (`app/shared/error-handler/infrastructure/primary/`), in specs as in production code.
7. The provider also includes `provideBrowserGlobalErrorListeners()`. Angular listens to `unhandledrejection` and `error` on `window` and forwards them to its `ErrorHandler`, hence to the port: a promise nobody gave to `ErrorHandlerPort.observe()`, or an exception thrown in a timer or a library callback, is reported like any other failure. An adapter therefore contains its own failures: `handleError` never throws and never leaves a promise rejected unobserved, otherwise the failure comes back to it through these listeners and a report that keeps failing, such as a remote adapter while offline, feeds itself. The contract suite of the first adapter that can fail states it ([0002](0002-port-contract-for-secondary-adapters.md)).

## Consequences

### Positive

- Unhandled asynchronous rejections across background synchronizations, runtime intervals, and token renewals are consistently routed through dependency injection.
- Eliminates surviving mutants on error-handling catch blocks.
- Tests verify error dispatching deterministically without global console mocks.
- The default `ConsoleErrorHandler` can be replaced with a structured telemetry or crash reporting adapter in the future without changing call sites: one argument per composition root, and that adapter then sees every failure of the front — reported through the port, intercepted by Angular or raised on `window`.

### Negative

- Introduces a technical port under `app/shared/error-handler/domain/`, placing it within the domain mutation search path (`src/main/webapp/**/domain/**/*.ts`). Because `ErrorHandlerPort` is an abstract class with no executable lines, it generates no mutants.
- Angular calls `preventDefault()` on the `window` events it forwards. The browser's native `Uncaught (in promise)` message disappears; the console output now comes from `ConsoleErrorHandler`.
- The adapter is named in each composition root rather than once for both fronts.
- The import guard is a rule instance separate from the boundary rules: each boundary replaces the options of `no-restricted-imports`, and exempting the kernel there would mean restating every boundary for it.
- A failure raised before dependency injection exists, such as a rejected `bootstrapApplication`, still writes to `console.error` directly from `main.ts`.

# 0025 — Route runtime errors through ErrorHandlerPort

## Status

Accepted.

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

## Decision

Adopt `ErrorHandlerPort` as the shared technical error-handling abstraction:

1. `ErrorHandlerPort` lives under `src/main/webapp/app/shared/error-handler/domain/ErrorHandlerPort.ts` as an abstract class defining `abstract handleError(failure: unknown): void`.
2. A default secondary adapter `ConsoleErrorHandler` logs unhandled errors to `console.error`.
3. Application coordinators and secondary authentication adapters (`OfflinePupitre`, `PupitreSynchronization`, `PupitreRuntime`, `DeviceAuthentication`, `KeycloakOidcAuthentication`) inject `ErrorHandlerPort` to observe background rejections.
4. Unit tests use `ErrorHandlerFixture` to verify that unexpected runtime failures are observed without spying on global console methods.

## Consequences

### Positive

- Unhandled asynchronous rejections across background synchronizations, runtime intervals, and token renewals are consistently routed through dependency injection.
- Eliminates surviving mutants on error-handling catch blocks.
- Tests verify error dispatching deterministically without global console mocks.
- The default `ConsoleErrorHandler` can be replaced with a structured telemetry or crash reporting adapter in the future without changing call sites.

### Negative

- Introduces a technical port under `app/shared/error-handler/domain/`, placing it within the domain mutation search path (`src/main/webapp/**/domain/**/*.ts`). Because `ErrorHandlerPort` is an abstract class with no executable lines, it generates no mutants.

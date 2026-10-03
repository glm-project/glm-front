import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { DOCUMENT, ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { provideErrorHandler } from './error-handler.provider';

class BrowserFixture extends EventTarget {
  readonly navigator = { onLine: true };
  readonly location = { reload: vi.fn() };
  readonly sessionStorage = window.sessionStorage;
  readonly document = { defaultView: this };
}

describe('Angular error recovery with an injected reporter', () => {
  let browserFixture: BrowserFixture;
  let errors: ErrorHandler;

  beforeEach(() => {
    browserFixture = new BrowserFixture();
    browserFixture.sessionStorage.clear();
    errors = givenAFrontUsing(browserFixture);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    'Failed to fetch dynamically imported module: https://glm.example/chunk-old.js',
    'error loading dynamically imported module: https://glm.example/chunk-old.js',
    'Importing a module script failed.',
  ])('should reload the current page after a browser reports "%s"', message => {
    const failure = new TypeError(message);

    errors.handleError(failure);

    expect(browserFixture.location.reload).toHaveBeenCalledOnce();
    thenTheReporterReceived(failure);
  });

  it('should recover an unhandled module rejection through the browser error boundary', () => {
    const failure = missingModuleFixture();

    whenTheBrowserLeavesARejectionUnhandled(browserFixture, failure);

    expect(browserFixture.location.reload).toHaveBeenCalledOnce();
    thenTheReporterReceived(failure);
  });

  it('should only report an explicitly handled module failure', () => {
    const failure = missingModuleFixture();

    whenAFailureIsExplicitlyReported(failure);

    expect(browserFixture.location.reload).not.toHaveBeenCalled();
    thenTheReporterReceived(failure);
  });

  it('should avoid another automatic reload when the same version still cannot load a module after restarting', () => {
    const failure = missingModuleFixture();
    errors.handleError(failure);
    const restartedFront = givenAFrontUsing(browserFixture);

    restartedFront.handleError(failure);

    expect(browserFixture.location.reload).toHaveBeenCalledOnce();
  });

  it('should recover a version that has not already attempted a reload', () => {
    givenAnotherVersionAlreadyReloaded();

    errors.handleError(missingModuleFixture());

    expect(browserFixture.location.reload).toHaveBeenCalledOnce();
  });

  it('should avoid interrupting an offline front when a module cannot be fetched', () => {
    browserFixture.navigator.onLine = false;

    errors.handleError(missingModuleFixture());

    expect(browserFixture.location.reload).not.toHaveBeenCalled();
  });

  it.each([new Error('application failure'), new TypeError('Failed to fetch'), undefined, 'unhandled rejection'])(
    'should report an unrelated failure without reloading the page: %s',
    failure => {
      errors.handleError(failure);

      expect(browserFixture.location.reload).not.toHaveBeenCalled();
      thenTheReporterReceived(failure);
    },
  );

  it('should report a missing module without throwing when there is no browser window', () => {
    const failure = missingModuleFixture();
    errors = givenAFrontWithoutAWindow();

    errors.handleError(failure);

    thenTheReporterReceived(failure);
    expect(browserFixture.location.reload).not.toHaveBeenCalled();
  });

  it.each(['getItem', 'setItem'] as const)('should avoid a reload loop when session storage %s is unavailable', operation => {
    const storageFailure = givenStorageIsUnavailable(operation);

    errors.handleError(missingModuleFixture());

    expect(browserFixture.location.reload).not.toHaveBeenCalled();
    thenTheReporterReceived(storageFailure);
  });

  it('should report a rejected browser reload without propagating another failure', () => {
    const reloadFailure = givenReloadIsUnavailable();

    errors.handleError(missingModuleFixture());

    thenTheReporterReceived(reloadFailure);
  });

  const givenAnotherVersionAlreadyReloaded = (): void => {
    browserFixture.sessionStorage.setItem('glm:failed-module-reload', 'https://glm.example/main-previous.js');
  };

  const givenStorageIsUnavailable = (operation: 'getItem' | 'setItem'): Error => {
    const failure = new Error('storage unavailable');
    vi.spyOn(Storage.prototype, operation).mockImplementation(() => {
      throw failure;
    });
    return failure;
  };

  const givenReloadIsUnavailable = (): Error => {
    const failure = new Error('reload unavailable');
    browserFixture.location.reload.mockImplementation(() => {
      throw failure;
    });
    return failure;
  };
});

const givenAFrontUsing = (browserFixture: BrowserFixture): ErrorHandler => {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [provideErrorHandler(ErrorHandlerFixture), { provide: DOCUMENT, useValue: browserFixture.document }],
  });
  return TestBed.inject(ErrorHandler);
};

const givenAFrontWithoutAWindow = (): ErrorHandler => {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [provideErrorHandler(ErrorHandlerFixture), { provide: DOCUMENT, useValue: { defaultView: null } }],
  });
  return TestBed.inject(ErrorHandler);
};

const missingModuleFixture = (): TypeError =>
  new TypeError('Failed to fetch dynamically imported module: https://glm.example/chunk-old.js');

const thenTheReporterReceived = (failure: unknown): void => {
  expect((TestBed.inject(ErrorHandlerPort) as ErrorHandlerFixture).errors).toContain(failure);
};

const whenAFailureIsExplicitlyReported = (failure: unknown): void => {
  TestBed.inject(ErrorHandlerPort).handleError(failure);
};

const whenTheBrowserLeavesARejectionUnhandled = (browserFixture: BrowserFixture, failure: Error): void => {
  const promise = Promise.reject(failure);
  promise.catch(() => undefined);
  browserFixture.dispatchEvent(new PromiseRejectionEvent('unhandledrejection', { promise, reason: failure, cancelable: true }));
};

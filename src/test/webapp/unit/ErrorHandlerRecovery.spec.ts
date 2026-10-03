import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { provideErrorHandler } from '@/app/shared/error-handler/infrastructure/primary/error-handler.provider';
import { ReloadingErrorHandler } from '@/app/shared/error-handler/infrastructure/secondary/ReloadingErrorHandler';
import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';

class BrowserFixture extends EventTarget {
  readonly navigator = { onLine: true };
  readonly location = { reload: vi.fn() };
  readonly sessionStorage = window.sessionStorage;
  readonly document = { defaultView: this };
}

describe('Browser error recovery', () => {
  let browserFixture: BrowserFixture;
  let errors: ErrorHandlerPort;

  beforeEach(() => {
    browserFixture = new BrowserFixture();
    browserFixture.sessionStorage.clear();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
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
    expect(console.error).toHaveBeenCalledWith(failure);
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
      expect(console.error).toHaveBeenCalledWith(failure);
    },
  );

  it('should report a missing module without throwing when there is no browser window', () => {
    const failure = missingModuleFixture();
    errors = givenAFrontWithoutAWindow();

    errors.handleError(failure);

    expect(console.error).toHaveBeenCalledWith(failure);
    expect(browserFixture.location.reload).not.toHaveBeenCalled();
  });

  it.each(['getItem', 'setItem'] as const)('should avoid a reload loop when session storage %s is unavailable', operation => {
    const storageFailure = givenStorageIsUnavailable(operation);

    errors.handleError(missingModuleFixture());

    expect(browserFixture.location.reload).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(storageFailure);
  });

  it('should report a rejected browser reload without propagating another failure', () => {
    const reloadFailure = givenReloadIsUnavailable();

    errors.handleError(missingModuleFixture());

    expect(console.error).toHaveBeenCalledWith(reloadFailure);
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

const givenAFrontUsing = (browserFixture: BrowserFixture): ErrorHandlerPort => {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [provideErrorHandler(ReloadingErrorHandler), { provide: DOCUMENT, useValue: browserFixture.document }],
  });
  return TestBed.inject(ErrorHandlerPort);
};

const givenAFrontWithoutAWindow = (): ErrorHandlerPort => {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [provideErrorHandler(ReloadingErrorHandler), { provide: DOCUMENT, useValue: { defaultView: null } }],
  });
  return TestBed.inject(ErrorHandlerPort);
};

const missingModuleFixture = (): TypeError =>
  new TypeError('Failed to fetch dynamically imported module: https://glm.example/chunk-old.js');

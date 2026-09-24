import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { ApplicationRef, ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { provideErrorHandler } from './error-handler.provider';

describe('Error handler provider', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideErrorHandler(ErrorHandlerFixture)],
      // A running front reports an application error once; TestBed would throw it again afterwards.
      rethrowApplicationErrors: false,
    });
  });

  it("should report through the port a failure handed to Angular's ErrorHandler", () => {
    const failure = new Error('template failure');

    whenAngularHandsOverAFailure(failure);

    thenThePortReceived(failure);
  });

  it('should report through the port a promise rejection that nothing handled', () => {
    const failure = new Error('forgotten rejection');
    givenTheFrontHasBooted();

    whenARejectionGoesUnhandled(failure);

    thenThePortReceived(failure);
  });

  const givenTheFrontHasBooted = (): void => {
    TestBed.inject(ApplicationRef);
  };

  const whenAngularHandsOverAFailure = (failure: Error): void => {
    TestBed.inject(ErrorHandler).handleError(failure);
  };

  const whenARejectionGoesUnhandled = (failure: Error): void => {
    const promise = Promise.reject(failure);
    // The event below stands for the browser's report; Node must not report this rejection to Vitest as well.
    promise.catch(() => undefined);
    window.dispatchEvent(new PromiseRejectionEvent('unhandledrejection', { promise, reason: failure, cancelable: true }));
  };

  const thenThePortReceived = (failure: Error): void => {
    expect(TestBed.inject(ErrorHandlerPort)).toMatchObject({ errors: [failure] });
  };
});

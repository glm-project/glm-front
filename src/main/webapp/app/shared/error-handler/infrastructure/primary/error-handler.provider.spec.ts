import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { provideErrorHandler } from './error-handler.provider';

describe('Error handler provider', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideErrorHandler(ErrorHandlerFixture)] });
  });

  it("should report through the port a failure handed to Angular's ErrorHandler", () => {
    const failure = new Error('template failure');

    whenAngularHandsOverAFailure(failure);

    thenThePortReceived(failure);
  });

  const whenAngularHandsOverAFailure = (failure: Error): void => {
    TestBed.inject(ErrorHandler).handleError(failure);
  };

  const thenThePortReceived = (failure: Error): void => {
    expect(TestBed.inject(ErrorHandlerPort)).toMatchObject({ errors: [failure] });
  };
});

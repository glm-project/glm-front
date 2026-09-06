import { TestBed } from '@angular/core/testing';
import { MockInstance, vi } from 'vitest';
import { ConsoleErrorHandler } from './ConsoleErrorHandler';

describe('ConsoleErrorHandler', () => {
  let consoleError: MockInstance;
  let handler: ConsoleErrorHandler;

  beforeEach(() => {
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    TestBed.configureTestingModule({ providers: [ConsoleErrorHandler] });
    handler = TestBed.inject(ConsoleErrorHandler);
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('should log failure to console.error', () => {
    const failure = new Error('test failure');

    handler.handleError(failure);

    expect(consoleError).toHaveBeenCalledWith(failure);
  });
});

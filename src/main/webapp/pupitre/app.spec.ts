import { PupitreRuntime } from '@/pupitre/PupitreRuntime';
import { ErrorHandler, signal } from '@angular/core';
import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { App } from './app';
import { routes } from './app.route';

class PupitreRuntimeFixture {
  readonly connected = signal(true).asReadonly();
  started = false;
  failure: Error | undefined;

  start(): Promise<void> {
    if (this.failure !== undefined) {
      return Promise.reject(this.failure);
    }
    this.started = true;
    return Promise.resolve();
  }
}

describe('Pupitre shell', () => {
  let errorHandler: ErrorHandlerFixture;
  let fixture: ComponentFixture<App>;
  let runtime: PupitreRuntimeFixture;

  beforeEach(async () => {
    errorHandler = new ErrorHandlerFixture();
    runtime = new PupitreRuntimeFixture();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(routes),
        { provide: PupitreRuntime, useValue: runtime },
        { provide: ComponentFixtureAutoDetect, useValue: true },
        { provide: ErrorHandler, useValue: errorHandler },
      ],
    }).compileComponents();
  });

  it('should give the screens it will route a place to render', async () => {
    await whenBootingTheShell();

    thenItGivesTheRoutedScreensAPlaceToRender();
  });

  it('should start the pupitre runtime as it boots', async () => {
    await whenBootingTheShell();

    thenThePupitreRuntimeIsStarted();
  });

  it('should report a runtime startup refusal without starting the runtime', async () => {
    givenAuthenticationIsRefused();

    await whenBootingTheShell();

    thenTheAuthenticationFailureIsReported();
    thenTheRuntimeDidNotStart();
  });

  const givenAuthenticationIsRefused = (): void => {
    runtime.failure = new Error('enrolment refused');
  };

  const whenBootingTheShell = async (): Promise<void> => {
    fixture = TestBed.createComponent(App);
    await fixture.whenStable();
  };

  const thenItGivesTheRoutedScreensAPlaceToRender = (): void => {
    const shell = fixture.nativeElement as HTMLElement;

    expect(shell.querySelector('router-outlet')).not.toBeNull();
  };

  const thenTheAuthenticationFailureIsReported = (): void => {
    expect(errorHandler.failure).toEqual(new Error('enrolment refused'));
  };
  const thenTheRuntimeDidNotStart = (): void => {
    expect(runtime.started).toBe(false);
  };
  const thenThePupitreRuntimeIsStarted = (): void => {
    expect(runtime.started).toBe(true);
  };
});

class ErrorHandlerFixture extends ErrorHandler {
  failure: unknown;

  override handleError(failure: unknown): void {
    this.failure = failure;
  }
}

import { PupitreRuntime } from '@/pupitre/PupitreRuntime';
import { OfflinePupitre } from '@/pupitre/contexts/atelier/application/OfflinePupitre';
import { ErrorHandler, signal } from '@angular/core';
import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { dataSelector } from '@test/utils/DataSelector';

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

class OfflinePupitrePageFixture {
  readonly connected = signal(true);
  readonly operateur = signal(undefined);
  readonly messageAtelier = signal(undefined);
  readonly pointage = signal(undefined);
  readonly gestesDisponibles = signal(true);

  referentiel(): undefined {
    return undefined;
  }

  registerPress(): boolean {
    return true;
  }

  finish(): Promise<void> {
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
        { provide: OfflinePupitre, useClass: OfflinePupitrePageFixture },
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

  it('should route the common pupitre page at its root URL', async () => {
    await whenBootingTheShell();

    await whenNavigatingToTheRoot();

    thenTheCommonPupitrePageIsRendered();
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

  const whenNavigatingToTheRoot = async (): Promise<void> => {
    await TestBed.inject(Router).navigateByUrl('/');
    fixture.detectChanges();
  };

  const thenTheCommonPupitrePageIsRendered = (): void => {
    const shell = fixture.nativeElement as HTMLElement;
    expect(shell.querySelector(dataSelector('pupitre-page'))).not.toBeNull();
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

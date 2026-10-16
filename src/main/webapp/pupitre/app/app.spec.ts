import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { PupitreRuntime } from '@/pupitre/PupitreRuntime';
import { PupitreVersionUpdater } from '@/pupitre/PupitreVersionUpdater';
import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';

import { routes } from '../app.route';
import { App } from './app';

class PupitreRuntimeFixture {
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

class PupitreVersionUpdaterFixture {
  started = false;

  start(): void {
    this.started = true;
  }
}

describe('Pupitre shell', () => {
  let errorHandler: ErrorHandlerFixture;
  let fixture: ComponentFixture<App>;
  let runtime: PupitreRuntimeFixture;
  let versionUpdater: PupitreVersionUpdaterFixture;

  beforeEach(async () => {
    errorHandler = new ErrorHandlerFixture();
    runtime = new PupitreRuntimeFixture();
    versionUpdater = new PupitreVersionUpdaterFixture();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(routes),
        { provide: PupitreRuntime, useValue: runtime },
        { provide: PupitreVersionUpdater, useValue: versionUpdater },
        { provide: ComponentFixtureAutoDetect, useValue: true },
        { provide: ErrorHandlerPort, useValue: errorHandler },
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

  it('should start version checks as the pupitre shell boots', async () => {
    await whenBootingTheShell();

    thenTheVersionUpdaterIsStarted();
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
    expect(errorHandler.errors).toEqual([new Error('enrolment refused')]);
  };
  const thenTheRuntimeDidNotStart = (): void => {
    expect(runtime.started).toBe(false);
  };
  const thenThePupitreRuntimeIsStarted = (): void => {
    expect(runtime.started).toBe(true);
  };
  const thenTheVersionUpdaterIsStarted = (): void => {
    expect(versionUpdater.started).toBe(true);
  };
});

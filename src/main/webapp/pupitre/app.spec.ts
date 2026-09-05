import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { InMemoryAuthentication } from '@/app/shared/authentication/infrastructure/secondary/in-memory/InMemoryAuthentication';
import { PupitreSynchronizationTrigger } from '@/pupitre/contexts/atelier/infrastructure/primary/pupitre/PupitreSynchronizationTrigger';
import { ErrorHandler, signal } from '@angular/core';
import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { App } from './app';
import { routes } from './app.route';

describe('Pupitre shell', () => {
  let errorHandler: ErrorHandlerFixture;
  let fixture: ComponentFixture<App>;
  let synchronizationTrigger: PupitreSynchronizationTriggerFixture;

  beforeEach(async () => {
    errorHandler = new ErrorHandlerFixture();
    synchronizationTrigger = new PupitreSynchronizationTriggerFixture();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(routes),
        { provide: PupitreSynchronizationTrigger, useValue: synchronizationTrigger },
        { provide: ComponentFixtureAutoDetect, useValue: true },
        { provide: AuthenticationPort, useClass: InMemoryAuthentication },
        { provide: ErrorHandler, useValue: errorHandler },
      ],
    }).compileComponents();
  });

  it('should give the screens it will route a place to render', async () => {
    await whenBootingTheShell();

    thenItGivesTheRoutedScreensAPlaceToRender();
  });

  it('should enrol the pupitre as it boots', async () => {
    await whenBootingTheShell();

    thenItHoldsABearerToken();
  });

  it('should start its synchronizationTrigger after authentication', async () => {
    await whenBootingTheShell();

    thenTheRuntimeStarted();
  });

  it('should report an authentication refusal without starting its synchronizationTrigger', async () => {
    givenAuthenticationIsRefused();

    await whenBootingTheShell();

    thenTheAuthenticationFailureIsReported();
    thenTheRuntimeDidNotStart();
  });

  const givenAuthenticationIsRefused = (): void => {
    TestBed.overrideProvider(AuthenticationPort, { useValue: new RefusedAuthenticationFixture() });
  };

  const whenBootingTheShell = async (): Promise<void> => {
    fixture = TestBed.createComponent(App);
    await fixture.whenStable();
  };

  const thenItGivesTheRoutedScreensAPlaceToRender = (): void => {
    const shell = fixture.nativeElement as HTMLElement;

    expect(shell.querySelector('router-outlet')).not.toBeNull();
  };

  const thenItHoldsABearerToken = (): void => {
    expect(TestBed.inject(AuthenticationPort).currentToken()).toBeDefined();
  };
  const thenTheAuthenticationFailureIsReported = (): void => {
    expect(errorHandler.failure).toEqual(new Error('enrolment refused'));
  };
  const thenTheRuntimeDidNotStart = (): void => {
    expect(synchronizationTrigger.starts).toBe(0);
  };
  const thenTheRuntimeStarted = (): void => {
    expect(synchronizationTrigger.starts).toBe(1);
  };
});

class ErrorHandlerFixture extends ErrorHandler {
  failure: unknown;

  override handleError(failure: unknown): void {
    this.failure = failure;
  }
}

class PupitreSynchronizationTriggerFixture {
  readonly connected = signal(true);
  starts = 0;

  start(): void {
    this.starts++;
  }
}

class RefusedAuthenticationFixture extends AuthenticationPort {
  override authenticate(): Promise<void> {
    return Promise.reject(new Error('enrolment refused'));
  }

  override currentToken(): string | undefined {
    return undefined;
  }

  override logout(): void {
    throw new Error('No session can be closed');
  }
}

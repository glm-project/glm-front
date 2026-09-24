import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { InMemoryAuthentication } from '@/app/shared/authentication/infrastructure/secondary/in-memory/InMemoryAuthentication';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';

import { routes } from '../app.route';
import { App } from './app';

describe('Gestion shell', () => {
  let comp: App;
  let errorHandler: ErrorHandlerFixture;
  let fixture: ComponentFixture<App>;

  beforeEach(async () => {
    errorHandler = new ErrorHandlerFixture();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(routes),
        { provide: ComponentFixtureAutoDetect, useValue: true },
        { provide: AuthenticationPort, useClass: InMemoryAuthentication },
        { provide: ErrorHandlerPort, useValue: errorHandler },
      ],
    }).compileComponents();
  });

  it('should have appName', async () => {
    await whenBootingTheShell();

    thenItsNameIsGlm();
  });

  it('should hold a bearer token once it has booted', async () => {
    await whenBootingTheShell();

    thenItHoldsABearerToken();
  });

  it('should report an authentication refusal', async () => {
    givenAuthenticationIsRefused();

    await whenBootingTheShell();

    thenTheAuthenticationFailureIsReported();
  });

  const givenAuthenticationIsRefused = (): void => {
    TestBed.overrideProvider(AuthenticationPort, { useValue: new RefusedAuthenticationFixture() });
  };

  const whenBootingTheShell = async (): Promise<void> => {
    fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    comp = fixture.componentInstance;
  };

  const thenItsNameIsGlm = (): void => {
    expect(comp.appName()).toBe('GLM');
  };

  const thenItHoldsABearerToken = (): void => {
    expect(TestBed.inject(AuthenticationPort).currentToken()).toBeDefined();
  };
  const thenTheAuthenticationFailureIsReported = (): void => {
    expect(errorHandler.errors).toEqual([new Error('login refused')]);
  };
});

class RefusedAuthenticationFixture extends AuthenticationPort {
  override authenticate(): Promise<void> {
    return Promise.reject(new Error('login refused'));
  }

  override currentToken(): string | undefined {
    return undefined;
  }

  override logout(): void {
    throw new Error('No session can be closed');
  }
}

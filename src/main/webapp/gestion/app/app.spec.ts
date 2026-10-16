import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { InMemoryAuthentication } from '@/app/shared/authentication/infrastructure/secondary/in-memory/InMemoryAuthentication';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { RolesPort } from '@/gestion/shared/authentication/domain/RolesPort';
import { ROLE_GESTIONNAIRE } from '@/gestion/shared/authentication/infrastructure/primary/gestionnaire';
import { InMemoryGestionAuthentication } from '@/gestion/shared/authentication/infrastructure/secondary/in-memory/InMemoryGestionAuthentication';
import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, RouterOutlet } from '@angular/router';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { IconeDeLOngletFixture } from '@test/unit/fixtures/gestion/parametrage/IconeDeLOngletFixture';
import { ParametrageFixture } from '@test/unit/fixtures/gestion/parametrage/ParametrageFixture';
import { dataSelector } from '@test/utils/DataSelector';

import { routes } from '../app.route';
import { LogoAffiche } from '../contexts/parametrage/application/LogoAffiche';
import { IconeDeLOnglet } from '../contexts/parametrage/domain/IconeDeLOnglet';
import { ParametragePort } from '../contexts/parametrage/domain/ParametragePort';
import { App } from './app';

describe('Gestion shell', () => {
  let comp: App;
  let errorHandler: ErrorHandlerFixture;
  let fixture: ComponentFixture<App>;
  let realmRoles: readonly string[];

  beforeEach(async () => {
    errorHandler = new ErrorHandlerFixture();
    realmRoles = [ROLE_GESTIONNAIRE];
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(routes),
        { provide: ParametragePort, useValue: new ParametrageFixture() },
        LogoAffiche,
        { provide: IconeDeLOnglet, useValue: new IconeDeLOngletFixture() },
        { provide: ComponentFixtureAutoDetect, useValue: true },
        { provide: InMemoryGestionAuthentication, useFactory: () => new InMemoryGestionAuthentication(realmRoles) },
        { provide: AuthenticationPort, useExisting: InMemoryGestionAuthentication },
        { provide: RolesPort, useExisting: InMemoryGestionAuthentication },
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
    thenNoRoutedContentIsMounted();
    thenNoReservedAccessScreenIsShown();
  });

  it('should show the reserved access screen, and mount no routed content, to an account without the gestionnaire role', async () => {
    givenTheRealmRoles(['ROLE_USER']);

    await whenBootingTheShell();

    thenTheReservedAccessScreenIsShown();
    thenNoRoutedContentIsMounted();
  });

  it('should present the reserved access screen as a page named by its title', async () => {
    givenTheRealmRoles(['ROLE_USER']);

    await whenBootingTheShell();

    thenTheReservedAccessScreenIsAPageNamedByItsTitle();
  });

  it('should mount the routed content, and no reserved access screen, for a gestionnaire', async () => {
    await whenBootingTheShell();

    thenTheRoutedContentIsMounted();
    thenNoReservedAccessScreenIsShown();
  });

  it('should show neither the routed content nor the reserved access screen while authentication is in progress', async () => {
    givenAuthenticationIsInProgress();

    await whenBootingTheShell();

    thenNoRoutedContentIsMounted();
    thenNoReservedAccessScreenIsShown();
  });

  it('should show neither the routed content nor the reserved access screen once authenticated, while the realm roles are unknown', async () => {
    givenTheRealmRolesAreUnknown();

    await whenBootingTheShell();

    thenNoRoutedContentIsMounted();
    thenNoReservedAccessScreenIsShown();
  });

  it('should end the session from the reserved access screen', async () => {
    givenTheRealmRoles(['ROLE_USER']);
    await whenBootingTheShell();

    whenLeavingTheReservedAccessScreen();

    thenTheSessionIsOver();
  });

  const givenTheRealmRoles = (roles: readonly string[]): void => {
    realmRoles = roles;
  };

  const givenAuthenticationIsRefused = (): void => {
    const refused = new RefusedAuthenticationFixture();
    TestBed.overrideProvider(AuthenticationPort, { useValue: refused });
    TestBed.overrideProvider(RolesPort, { useValue: refused });
  };

  const givenAuthenticationIsInProgress = (): void => {
    TestBed.overrideProvider(AuthenticationPort, { useValue: new PendingAuthenticationFixture() });
    TestBed.overrideProvider(RolesPort, { useValue: new UnknownRolesFixture() });
  };

  const givenTheRealmRolesAreUnknown = (): void => {
    TestBed.overrideProvider(AuthenticationPort, { useValue: new InMemoryAuthentication() });
    TestBed.overrideProvider(RolesPort, { useValue: new UnknownRolesFixture() });
  };

  const whenBootingTheShell = async (): Promise<void> => {
    fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    await new Promise(resolve => setTimeout(resolve));
    await fixture.whenStable();
    comp = fixture.componentInstance;
  };

  const thenItsNameIsGlm = (): void => {
    expect(comp.appName()).toBe('GLM');
  };

  const thenItHoldsABearerToken = (): void => {
    expect(TestBed.inject(AuthenticationPort).currentToken()).toBeDefined();
  };
  const whenLeavingTheReservedAccessScreen = (): void => {
    const logout = fixture.debugElement.query(By.css(dataSelector('gestion-acces-reserve-deconnexion'))).nativeElement as HTMLElement;
    logout.click();
  };

  const thenTheRoutedContentIsMounted = (): void => {
    expect(fixture.debugElement.query(By.directive(RouterOutlet))).not.toBeNull();
  };

  const thenNoReservedAccessScreenIsShown = (): void => {
    expect(fixture.debugElement.query(By.css(dataSelector('gestion-acces-reserve')))).toBeNull();
  };

  const thenTheSessionIsOver = (): void => {
    expect(TestBed.inject(AuthenticationPort).currentToken()).toBeUndefined();
  };

  const thenTheReservedAccessScreenIsShown = (): void => {
    expect(fixture.debugElement.query(By.css(dataSelector('gestion-acces-reserve')))).not.toBeNull();
  };

  const thenTheReservedAccessScreenIsAPageNamedByItsTitle = (): void => {
    const screen = fixture.debugElement.query(By.css(dataSelector('gestion-acces-reserve'))).nativeElement as HTMLElement;
    const title = (fixture.nativeElement as HTMLElement).querySelector(`#${screen.getAttribute('aria-labelledby') ?? ''}`);

    expect(screen.tagName).toBe('MAIN');
    expect(title?.tagName).toBe('H1');
    expect(title?.textContent.trim()).toBe('Accès réservé aux gestionnaires');
  };

  const thenNoRoutedContentIsMounted = (): void => {
    expect(fixture.debugElement.query(By.directive(RouterOutlet))).toBeNull();
  };

  const thenTheAuthenticationFailureIsReported = (): void => {
    expect(errorHandler.errors).toEqual([new Error('login refused')]);
  };
});

class RefusedAuthenticationFixture extends AuthenticationPort implements RolesPort {
  realmRoles(): Promise<readonly string[]> {
    return new Promise(() => undefined);
  }

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

class PendingAuthenticationFixture extends AuthenticationPort {
  override authenticate(): Promise<void> {
    return new Promise(() => undefined);
  }

  override currentToken(): string | undefined {
    return undefined;
  }

  override logout(): void {
    throw new Error('No session can be closed');
  }
}

class UnknownRolesFixture extends RolesPort {
  realmRoles(): Promise<readonly string[]> {
    return new Promise(() => undefined);
  }
}

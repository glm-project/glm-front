import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { RolesPort } from '@/gestion/shared/authentication/domain/RolesPort';
import { ROLE_GESTIONNAIRE } from '@/gestion/shared/authentication/infrastructure/primary/gestionnaire';
import { InMemoryGestionAuthentication } from '@/gestion/shared/authentication/infrastructure/secondary/in-memory/InMemoryGestionAuthentication';
import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';

import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { dataSelector } from '@test/utils/DataSelector';
import { GestionHeader } from './header';

const configureHeaderOf = async (roles: readonly string[]): Promise<void> => {
  await TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: '**', children: [] }]),
      { provide: ComponentFixtureAutoDetect, useValue: true },
      { provide: InMemoryGestionAuthentication, useFactory: () => new InMemoryGestionAuthentication(roles) },
      { provide: AuthenticationPort, useExisting: InMemoryGestionAuthentication },
      { provide: RolesPort, useExisting: InMemoryGestionAuthentication },
    ],
  }).compileComponents();
};

const showTheHeader = async (): Promise<ComponentFixture<GestionHeader>> => {
  const shown = TestBed.createComponent(GestionHeader);
  shown.componentRef.setInput('heading', 'glmfront');
  await shown.whenStable();
  return shown;
};

const openTheSession = async (shown: ComponentFixture<GestionHeader>): Promise<void> => {
  await TestBed.inject(AuthenticationPort).authenticate();
  await shown.whenStable();
};

describe('Gestion header', () => {
  let fixture: ComponentFixture<GestionHeader>;
  let authentication: AuthenticationPort;

  beforeEach(async () => {
    await configureHeaderOf([ROLE_GESTIONNAIRE]);
    fixture = await showTheHeader();
    authentication = TestBed.inject(AuthenticationPort);
    await openTheSession(fixture);
  });

  it('should end the session on click on the logout button', () => {
    whenClickingLogout();

    thenTheSessionIsOver();
  });

  it('should show the heading supplied by gestion', () => {
    thenItShowsTheHeading('glmfront');
  });

  it('should identify anomalies of pointage as a regular workshop destination', () => {
    thenNavigationHasLabel('gestion-navigation-anomalies', 'Anomalies');
  });

  it('should link the anomalies destination to the anomalies route, and no longer offer the conflicts one', () => {
    thenNavigationLinksTo('gestion-navigation-anomalies', '/anomalies', 'Anomalies');
    thenNavigationOffers('gestion-navigation-conflits', false);
  });

  it.each([
    ['gestion-navigation-supervision', '/', 'Supervision'],
    ['gestion-navigation-atelier', '/atelier', 'Atelier'],
    ['gestion-navigation-elements', '/produits', 'Produits'],
    ['gestion-navigation-postes', '/postes-de-travail', 'Postes de travail'],
    ['gestion-navigation-operateurs', '/operateurs', 'Opérateurs'],
  ])('should offer the %s destination in the navigation', (selector, href, label) => {
    thenNavigationLinksTo(selector, href, label);
  });

  it('should unfold the navigation from its menu button', async () => {
    await whenTogglingMenu();

    thenMenuIsExpanded(true);
  });

  it('should fold the navigation again from its menu button', async () => {
    await whenTogglingMenu();

    await whenTogglingMenu();

    thenMenuIsExpanded(false);
  });

  it('should fold the navigation once a destination is chosen', async () => {
    await whenTogglingMenu();

    await whenChoosing('gestion-navigation-postes');

    thenMenuIsExpanded(false);
  });

  const whenTogglingMenu = async (): Promise<void> => {
    menuButton().click();
    await fixture.whenStable();
  };

  const whenChoosing = async (selector: string): Promise<void> => {
    const link = fixture.debugElement.query(By.css(dataSelector(selector))).nativeElement as HTMLAnchorElement;
    link.click();
    await fixture.whenStable();
  };

  const menuButton = (): HTMLButtonElement =>
    fixture.debugElement.query(By.css(dataSelector('gestion-menu'))).nativeElement as HTMLButtonElement;

  const thenMenuIsExpanded = (expanded: boolean): void => {
    expect(menuButton().getAttribute('aria-expanded')).toBe(String(expanded));
  };

  const thenNavigationLinksTo = (selector: string, href: string, label: string): void => {
    const link = document.querySelector(dataSelector(selector));
    expect(link?.getAttribute('href')).toBe(href);
    expect(link?.textContent).toContain(label);
  };

  const thenNavigationOffers = (selector: string, offered: boolean): void => {
    expect(document.querySelector(dataSelector(selector)) !== null).toBe(offered);
  };

  const thenNavigationHasLabel = (selector: string, label: string): void => {
    expect(document.querySelector(dataSelector(selector))?.textContent.trim()).toBe(label);
  };

  const thenItShowsTheHeading = (heading: string): void => {
    const header = fixture.nativeElement as HTMLElement;

    expect(header.querySelector(dataSelector('header-heading'))?.textContent.trim()).toBe(heading);
  };

  const whenClickingLogout = (): void => {
    const logoutButton = fixture.debugElement.query(By.css(dataSelector('gestion-logout'))).nativeElement as HTMLElement;
    logoutButton.click();
  };

  const thenTheSessionIsOver = (): void => {
    expect(authentication.currentToken()).toBeUndefined();
  };
});

describe('Gestion header, according to the realm roles', () => {
  it('should offer the anomalies destination to a gestionnaire', async () => {
    await configureHeaderOf([ROLE_GESTIONNAIRE]);
    const header = await showTheHeader();

    await openTheSession(header);

    thenAnomaliesAreOffered(true);
  });

  it('should hide the anomalies destination from a consultant', async () => {
    await configureHeaderOf(['ROLE_CONSULTANT']);
    const header = await showTheHeader();

    await openTheSession(header);

    thenAnomaliesAreOffered(false);
    thenTheOtherDestinationsAreOffered();
  });

  it('should hide the anomalies destination while the realm roles are unknown', async () => {
    await configureHeaderOf([ROLE_GESTIONNAIRE]);

    await showTheHeader();

    thenAnomaliesAreOffered(false);
    thenTheOtherDestinationsAreOffered();
  });

  const thenAnomaliesAreOffered = (offered: boolean): void => {
    expect(document.querySelector(dataSelector('gestion-navigation-anomalies')) !== null).toBe(offered);
  };

  const thenTheOtherDestinationsAreOffered = (): void => {
    expect(document.querySelector(dataSelector('gestion-navigation-supervision')) !== null).toBe(true);
    expect(document.querySelector(dataSelector('gestion-navigation-operateurs')) !== null).toBe(true);
  };
});

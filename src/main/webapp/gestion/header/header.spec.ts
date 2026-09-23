import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { InMemoryAuthentication } from '@/app/shared/authentication/infrastructure/secondary/in-memory/InMemoryAuthentication';
import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';

import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { dataSelector } from '@test/utils/DataSelector';
import { GestionHeader } from './header';

describe('Gestion header', () => {
  let fixture: ComponentFixture<GestionHeader>;
  let authentication: AuthenticationPort;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        { provide: ComponentFixtureAutoDetect, useValue: true },
        { provide: AuthenticationPort, useClass: InMemoryAuthentication },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GestionHeader);
    fixture.componentRef.setInput('heading', 'glmfront');
    await fixture.whenStable();
    authentication = TestBed.inject(AuthenticationPort);
  });

  it('should end the session on click on the logout button', async () => {
    await givenAnOpenSession();

    whenClickingLogout();

    thenTheSessionIsOver();
  });

  it('should show the heading supplied by gestion', () => {
    thenItShowsTheHeading('glmfront');
  });

  it.each([
    ['gestion-navigation-supervision', '/', 'Supervision'],
    ['gestion-navigation-atelier', '/atelier', 'Atelier'],
    ['gestion-navigation-elements', '/moules-et-of', 'Moules et OF'],
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

  const thenItShowsTheHeading = (heading: string): void => {
    const header = fixture.nativeElement as HTMLElement;

    expect(header.querySelector(dataSelector('header-heading'))?.textContent.trim()).toBe(heading);
  };

  const givenAnOpenSession = (): Promise<void> => authentication.authenticate();

  const whenClickingLogout = (): void => {
    const logoutButton = fixture.debugElement.query(By.css(dataSelector('gestion-logout'))).nativeElement as HTMLElement;
    logoutButton.click();
  };

  const thenTheSessionIsOver = (): void => {
    expect(authentication.currentToken()).toBeUndefined();
  };
});

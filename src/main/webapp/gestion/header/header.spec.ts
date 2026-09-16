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
        provideRouter([]),
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
    ['gestion-navigation-supervision', '/', 'Supervision atelier'],
    ['gestion-navigation-postes', '/postes-de-travail', 'Postes de travail'],
    ['gestion-navigation-operateurs', '/operateurs', 'Opérateurs'],
  ])('should offer the %s destination in the navigation menu', async (selector, href, label) => {
    await whenOpeningMenu();

    thenMenuLinksTo(selector, href, label);
  });

  const whenOpeningMenu = async (): Promise<void> => {
    const button = fixture.debugElement.query(By.css(dataSelector('gestion-menu'))).nativeElement as HTMLButtonElement;
    button.click();
    await fixture.whenStable();
  };

  const thenMenuLinksTo = (selector: string, href: string, label: string): void => {
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

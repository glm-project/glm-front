import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { InMemoryAuthentication } from '@/app/shared/authentication/infrastructure/secondary/in-memory/InMemoryAuthentication';
import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';

import { By } from '@angular/platform-browser';
import { dataSelector } from '@test/utils/DataSelector';
import { GestionHeader } from './header';

describe('Gestion header', () => {
  let fixture: ComponentFixture<GestionHeader>;
  let authentication: AuthenticationPort;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
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

  const givenAnOpenSession = (): Promise<void> => authentication.authenticate();

  const whenClickingLogout = (): void => {
    const logoutButton = fixture.debugElement.query(By.css(dataSelector('gestion-logout'))).nativeElement as HTMLElement;
    logoutButton.click();
  };

  const thenTheSessionIsOver = (): void => {
    expect(authentication.currentToken()).toBeUndefined();
  };
});

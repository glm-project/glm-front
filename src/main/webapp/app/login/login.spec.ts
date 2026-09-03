import { AuthenticationPort } from '@/app/authentication/domain/AuthenticationPort';
import { InMemoryAuthentication } from '@/app/authentication/infrastructure/secondary/in-memory/InMemoryAuthentication';
import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';

import { By } from '@angular/platform-browser';
import Login from './login';

describe('Login', () => {
  let fixture: ComponentFixture<Login>;
  let authentication: AuthenticationPort;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        { provide: ComponentFixtureAutoDetect, useValue: true },
        { provide: AuthenticationPort, useClass: InMemoryAuthentication },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    authentication = TestBed.inject(AuthenticationPort);
  });

  it('should end the session on click on the logout button', async () => {
    await authentication.authenticate();

    whenClickingLogout();

    expect(authentication.currentToken()).toBeUndefined();
  });

  const whenClickingLogout = (): void => {
    const logoutButton = fixture.debugElement.query(By.css('#btn-logout')).nativeElement as HTMLElement;
    logoutButton.click();
  };
});

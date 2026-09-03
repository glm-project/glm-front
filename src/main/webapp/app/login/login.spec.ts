import { AuthenticationPort } from '@/app/authentication/domain/AuthenticationPort';
import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';

import { By } from '@angular/platform-browser';
import Login from './login';

describe('Login', () => {
  let fixture: ComponentFixture<Login>;

  let authentication: AuthenticationPort;

  class AuthenticationFixture extends AuthenticationPort {
    override authenticate(): Promise<void> {
      return Promise.resolve();
    }

    override currentToken(): string | undefined {
      return 'fixture-token';
    }

    override logout(): void {
      // spied on by the test
    }
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        { provide: ComponentFixtureAutoDetect, useValue: true },
        { provide: AuthenticationPort, useClass: AuthenticationFixture },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(Login);

    authentication = TestBed.inject(AuthenticationPort);
  });

  it('should log out on click on logout button', () => {
    vi.spyOn(authentication, 'logout').mockImplementation(vi.fn());

    const logoutButton = fixture.debugElement.query(By.css('#btn-logout')).nativeElement as HTMLElement;
    logoutButton.click();

    expect(authentication.logout).toHaveBeenCalledWith();
  });
});

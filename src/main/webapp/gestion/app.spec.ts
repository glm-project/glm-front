import { AuthenticationPort } from '@/app/authentication/domain/AuthenticationPort';
import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { App } from './app';
import { routes } from './app.route';

describe('Gestion shell', () => {
  let comp: App;
  let fixture: ComponentFixture<App>;
  let sessionStarted: boolean;

  class AuthenticationFixture extends AuthenticationPort {
    override authenticate(): Promise<void> {
      sessionStarted = true;
      return Promise.resolve();
    }

    override currentToken(): string | undefined {
      return 'fixture-token';
    }

    override logout(): void {
      // nothing to end: the fixture holds a token, not a session
    }
  }

  beforeEach(async () => {
    sessionStarted = false;

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(routes),
        { provide: ComponentFixtureAutoDetect, useValue: true },
        { provide: AuthenticationPort, useClass: AuthenticationFixture },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    comp = fixture.componentInstance;
  });

  it('should have appName', () => {
    expect(comp.appName()).toBe('glmfront');
  });

  it('should start the authentication session when it boots', () => {
    expect(sessionStarted).toBe(true);
  });
});

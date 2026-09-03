import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable } from 'rxjs';

import { Oauth2AuthService } from '@/app/auth/oauth2-auth.service';
import { App } from './app';
import { routes } from './app.route';

describe('Gestion shell', () => {
  let comp: App;
  let fixture: ComponentFixture<App>;
  let sessionStarted: boolean;

  beforeEach(async () => {
    sessionStarted = false;
    const authenticationFixture = {
      initAuthentication: () =>
        new Observable<boolean>(subscriber => {
          sessionStarted = true;
          subscriber.next(true);
          subscriber.complete();
        }),
      token: 'fixture-token',
      logout: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(routes),
        { provide: ComponentFixtureAutoDetect, useValue: true },
        { provide: Oauth2AuthService, useValue: authenticationFixture },
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

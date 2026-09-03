import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { Oauth2AuthService } from '@/app/auth/oauth2-auth.service';
import { App } from './app';
import { routes } from './app.route';

const mockOauth2AuthService = {
  initAuthentication: vi.fn().mockReturnValue(of(true)),
  isAuthenticated: true,
  token: 'mock-token',
  logout: vi.fn(),
};

describe('Gestion shell', () => {
  let comp: App;
  let fixture: ComponentFixture<App>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(routes),
        { provide: ComponentFixtureAutoDetect, useValue: true },
        { provide: Oauth2AuthService, useValue: mockOauth2AuthService },
      ],
    }).compileComponents();
  });

  beforeEach(async () => {
    fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    comp = fixture.componentInstance;
  });

  describe('ngOnInit', () => {
    it('should have appName', () => {
      expect(comp.appName()).toBe('glmfront');
    });
  });
});

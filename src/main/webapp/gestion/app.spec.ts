import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { InMemoryAuthentication } from '@/app/shared/authentication/infrastructure/secondary/in-memory/InMemoryAuthentication';
import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { App } from './app';
import { routes } from './app.route';

describe('Gestion shell', () => {
  let comp: App;
  let fixture: ComponentFixture<App>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(routes),
        { provide: ComponentFixtureAutoDetect, useValue: true },
        { provide: AuthenticationPort, useClass: InMemoryAuthentication },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    comp = fixture.componentInstance;
  });

  it('should have appName', () => {
    thenItsNameIsGlmfront();
  });

  it('should hold a bearer token once it has booted', () => {
    thenItHoldsABearerToken();
  });

  const thenItsNameIsGlmfront = (): void => expect(comp.appName()).toBe('glmfront');

  const thenItHoldsABearerToken = (): void => expect(TestBed.inject(AuthenticationPort).currentToken()).toBeDefined();
});

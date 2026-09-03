import { AuthenticationPort } from '@/app/authentication/domain/AuthenticationPort';
import { InMemoryAuthentication } from '@/app/authentication/infrastructure/secondary/in-memory/InMemoryAuthentication';
import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { App } from './app';
import { routes } from './app.route';

describe('Pupitre shell', () => {
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
  });

  it('should give the screens it will route a place to render', () => {
    const shell = fixture.nativeElement as HTMLElement;

    expect(shell.querySelector('router-outlet')).not.toBeNull();
  });

  it('should hold a bearer token once it has enrolled', () => {
    expect(TestBed.inject(AuthenticationPort).currentToken()).toBeDefined();
  });
});

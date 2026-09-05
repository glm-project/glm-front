import { PupitreRuntime } from '@/app/atelier/infrastructure/primary/pupitre/PupitreRuntime';
import { AuthenticationPort } from '@/app/shared/authentication/domain/AuthenticationPort';
import { InMemoryAuthentication } from '@/app/shared/authentication/infrastructure/secondary/in-memory/InMemoryAuthentication';
import { signal } from '@angular/core';
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
        { provide: PupitreRuntime, useValue: { connected: signal(true), start: () => undefined } },
        { provide: ComponentFixtureAutoDetect, useValue: true },
        { provide: AuthenticationPort, useClass: InMemoryAuthentication },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(App);
  });

  it('should give the screens it will route a place to render', async () => {
    await whenBootingTheShell();

    thenItGivesTheRoutedScreensAPlaceToRender();
  });

  it('should enrol the pupitre as it boots', async () => {
    await whenBootingTheShell();

    thenItHoldsABearerToken();
  });

  const whenBootingTheShell = (): Promise<void> => fixture.whenStable();

  const thenItGivesTheRoutedScreensAPlaceToRender = (): void => {
    const shell = fixture.nativeElement as HTMLElement;

    expect(shell.querySelector('router-outlet')).not.toBeNull();
  };

  const thenItHoldsABearerToken = (): void => expect(TestBed.inject(AuthenticationPort).currentToken()).toBeDefined();
});

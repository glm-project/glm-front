import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { App } from './app';
import { routes } from './app.route';

describe('Pupitre shell', () => {
  let fixture: ComponentFixture<App>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes), { provide: ComponentFixtureAutoDetect, useValue: true }],
    }).compileComponents();

    fixture = TestBed.createComponent(App);
    await fixture.whenStable();
  });

  it('should mount the outlet its screens are routed into', () => {
    const shell = fixture.nativeElement as HTMLElement;

    expect(shell.querySelector('router-outlet')).not.toBeNull();
  });
});

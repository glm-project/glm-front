import { ComponentFixture, ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';

import { dataSelector } from '@test/utils/DataSelector';
import { PupitreHeader } from './header';

describe('Pupitre header', () => {
  let fixture: ComponentFixture<PupitreHeader>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [{ provide: ComponentFixtureAutoDetect, useValue: true }],
    }).compileComponents();

    fixture = TestBed.createComponent(PupitreHeader);
    fixture.componentRef.setInput('heading', 'glmfront');
  });

  it('should sign that the pupitre is connected', async () => {
    givenAConnectedPupitre();

    await whenRenderingTheHeader();

    thenItSignsThePupitreIsOnline();
    thenItShowsTheHeading('glmfront');
  });

  it('should sign that the pupitre is disconnected', async () => {
    givenADisconnectedPupitre();

    await whenRenderingTheHeader();

    thenItSignsThePupitreIsOffline();
  });

  const givenAConnectedPupitre = (): void => {
    fixture.componentRef.setInput('connected', true);
  };

  const givenADisconnectedPupitre = (): void => {
    fixture.componentRef.setInput('connected', false);
  };

  const whenRenderingTheHeader = (): Promise<void> => fixture.whenStable();

  const thenItSignsThePupitreIsOnline = (): void => {
    expect(showsSign('pupitre-connected')).toBe(true);
    expect(showsSign('pupitre-disconnected')).toBe(false);
    thenItDescribesConnectivity('pupitre-connected', 'En ligne');
  };

  const thenItSignsThePupitreIsOffline = (): void => {
    expect(showsSign('pupitre-disconnected')).toBe(true);
    expect(showsSign('pupitre-connected')).toBe(false);
    thenItDescribesConnectivity('pupitre-disconnected', 'Hors ligne');
  };

  const thenItShowsTheHeading = (heading: string): void => {
    const header = fixture.nativeElement as HTMLElement;

    expect(header.querySelector(dataSelector('header-heading'))?.textContent.trim()).toBe(heading);
  };

  const thenItDescribesConnectivity = (sign: string, description: string): void => {
    const header = fixture.nativeElement as HTMLElement;
    const connectivity = header.querySelector(dataSelector(sign));

    expect(connectivity?.textContent.trim()).toBe(description);
    expect(connectivity?.querySelector(dataSelector('connectivity-indicator'))?.getAttribute('aria-hidden')).toBe('true');
    expect(header.querySelector('[aria-live], [role="status"], [role="alert"]')).toBeNull();
  };

  const showsSign = (sign: string): boolean => {
    const header = fixture.nativeElement as HTMLElement;

    return header.querySelector(dataSelector(sign)) !== null;
  };
});

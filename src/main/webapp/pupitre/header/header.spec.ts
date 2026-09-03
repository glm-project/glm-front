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
  });

  it('should sign that the pupitre is disconnected', async () => {
    givenADisconnectedPupitre();

    await whenRenderingTheHeader();

    thenItSignsThePupitreIsOffline();
  });

  const givenAConnectedPupitre = (): void => fixture.componentRef.setInput('connected', true);

  const givenADisconnectedPupitre = (): void => fixture.componentRef.setInput('connected', false);

  const whenRenderingTheHeader = (): Promise<void> => fixture.whenStable();

  const thenItSignsThePupitreIsOnline = (): void => {
    expect(showsSign('pupitre-connected')).toBe(true);
    expect(showsSign('pupitre-disconnected')).toBe(false);
  };

  const thenItSignsThePupitreIsOffline = (): void => {
    expect(showsSign('pupitre-disconnected')).toBe(true);
    expect(showsSign('pupitre-connected')).toBe(false);
  };

  const showsSign = (sign: string): boolean => {
    const header = fixture.nativeElement as HTMLElement;

    return header.querySelector(dataSelector(sign)) !== null;
  };
});

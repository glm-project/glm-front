import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { dossierDeFinAutomatiqueFixture } from '@test/unit/fixtures/gestion/anomalies-de-pointage/DossierAnomalie.fixture';
import { ResizeObserverFixture } from '@test/unit/fixtures/gestion/anomalies-de-pointage/ResizeObserverFixture';
import { dataSelector } from '@test/utils/DataSelector';
import { PlacementDeLInstant } from '../frise-dossier/PoigneeDeFrise';
import { SectionDeFrise } from './SectionDeFrise';

const PLACEMENT: PlacementDeLInstant = {
  activiteVisee: 'travail-8',
  bornes: { min: new Date(2026, 8, 14, 8, 0).toISOString(), max: new Date(2026, 8, 14, 20, 0).toISOString() },
  desactivee: false,
};

describe('Section of the frise', () => {
  let fixture: ComponentFixture<SectionDeFrise>;
  let resizeObserver: ResizeObserverFixture;

  beforeEach(() => {
    resizeObserver = new ResizeObserverFixture();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  afterEach(() => {
    resizeObserver.restore();
  });

  it.each([
    { lectureSeule: false, aide: 'Tirez le bout de la barre ou cliquez dessus pour placer l’heure du fait, ou saisissez-la.' },
    { lectureSeule: true, aide: 'Tirez le bout de la barre ou cliquez dessus pour placer la fin réelle.' },
  ])('should tell how to place the hour when the frise is read only: $lectureSeule', async ({ lectureSeule, aide }) => {
    await whenRendering({ placement: PLACEMENT, lectureSeule });

    expect(text('anomalie-frise-aide')).toBe(aide);
  });

  it('should tell nothing about the placement while no hour is to be placed', async () => {
    await whenRendering({});

    expect(present('anomalie-frise-aide')).toBe(false);
  });

  it('should name the operator in the link to the day', async () => {
    await whenRendering({ operateur: 'Camille Martin' });

    expect(text('anomalie-frise-journee')).toBe('Voir la journée de Camille Martin');
  });

  it('should say the operator in the link to the day when no name is resolved', async () => {
    await whenRendering({});

    expect(text('anomalie-frise-journee')).toBe('Voir la journée de l’opérateur');
  });

  const whenRendering = async (inputs: {
    readonly operateur?: string;
    readonly placement?: PlacementDeLInstant;
    readonly lectureSeule?: boolean;
  }): Promise<void> => {
    fixture = TestBed.createComponent(SectionDeFrise);
    fixture.componentRef.setInput('dossier', dossierDeFinAutomatiqueFixture());
    fixture.componentRef.setInput('now', new Date(2026, 9, 5, 10, 0));
    fixture.componentRef.setInput('operateur', inputs.operateur);
    fixture.componentRef.setInput('placement', inputs.placement);
    fixture.componentRef.setInput('lectureSeule', inputs.lectureSeule ?? false);
    await fixture.whenStable();
  };

  const present = (selector: string): boolean => (fixture.nativeElement as HTMLElement).querySelector(dataSelector(selector)) !== null;

  const text = (selector: string): string => {
    const found = (fixture.nativeElement as HTMLElement).querySelector(dataSelector(selector));
    if (found === null) throw new Error(`Missing element ${selector}`);
    return found.textContent.replace(/\s+/g, ' ').trim();
  };
});

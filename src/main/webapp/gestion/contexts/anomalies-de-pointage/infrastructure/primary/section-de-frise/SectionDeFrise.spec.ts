import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { dossierDeFinAutomatiqueFixture } from '@test/unit/fixtures/gestion/anomalies-de-pointage/DossierAnomalie.fixture';
import { ResizeObserverFixture } from '@test/unit/fixtures/gestion/anomalies-de-pointage/ResizeObserverFixture';
import { dataSelector } from '@test/utils/DataSelector';
import { DossierAnomalie } from '../../../domain/dossier/DossierAnomalie';
import { PlacementDeLInstant } from '../frise-dossier/PoigneeDeFrise';
import { SectionDeFrise } from './SectionDeFrise';

const PLACEMENT: PlacementDeLInstant = {
  activiteVisee: 'travail-8',
  bornes: { min: new Date(2026, 8, 14, 8, 0).toISOString(), max: new Date(2026, 8, 14, 20, 0).toISOString() },
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

  it('should tell how to place the real end while an instant waits to be placed', async () => {
    await whenRendering({ placement: PLACEMENT });

    expect(text('anomalie-frise-aide')).toBe('Tirez le bout de la barre ou cliquez dessus pour placer la fin réelle.');
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
    readonly dossier?: DossierAnomalie;
    readonly operateur?: string;
    readonly placement?: PlacementDeLInstant;
  }): Promise<void> => {
    fixture = TestBed.createComponent(SectionDeFrise);
    fixture.componentRef.setInput('dossier', inputs.dossier ?? dossierDeFinAutomatiqueFixture());
    fixture.componentRef.setInput('now', new Date(2026, 9, 5, 10, 0));
    fixture.componentRef.setInput('operateur', inputs.operateur);
    fixture.componentRef.setInput('placement', inputs.placement);
    await fixture.whenStable();
  };

  const present = (selector: string): boolean => (fixture.nativeElement as HTMLElement).querySelector(dataSelector(selector)) !== null;

  const text = (selector: string): string => {
    const found = (fixture.nativeElement as HTMLElement).querySelector(dataSelector(selector));
    if (found === null) throw new Error(`Missing element ${selector}`);
    return found.textContent.replace(/\s+/g, ' ').trim();
  };
});

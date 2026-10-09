import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, ParamMap } from '@angular/router';
import { ResizeObserverFixture } from '@test/unit/fixtures/gestion/anomalies-de-pointage/ResizeObserverFixture';
import { dataSelector } from '@test/utils/DataSelector';
import { instantLocalFixture } from '@test/utils/gestion/anomalies-de-pointage/InstantLocal.fixture';
import { BehaviorSubject } from 'rxjs';
import { ActiviteAnomalieId } from '../../../domain/dossier/ActiviteAnomalieId';
import { AnomaliesReadPort } from '../../../domain/dossier/AnomaliesReadPort';
import { AdresseDossier, DossierAnomalie, LectureDossier, PageAnomalies } from '../../../domain/dossier/DossierAnomalie';
import { ElementAnomalie } from '../../../domain/dossier/ElementAnomalie';
import { OperateurAnomalie } from '../../../domain/dossier/OperateurAnomalie';
import { OperateurAnomalieId } from '../../../domain/dossier/OperateurAnomalieId';
import { PointageAnomalieId } from '../../../domain/dossier/PointageAnomalieId';
import { DossierAnomaliePage } from './DossierAnomaliePage';

const INSTANT_DEBUT = instantLocalFixture(new Date(2026, 8, 14, 8, 0));
const INSTANT_ECHEANCE = instantLocalFixture(new Date(2026, 8, 14, 21, 0));

const realSetTimeout = setTimeout;

const roundTripFixture = async <T>(result: () => T): Promise<T> => {
  await new Promise<void>(resolve => realSetTimeout(resolve));
  return result();
};

const operateursFixture = (): readonly OperateurAnomalie[] => [
  { id: new OperateurAnomalieId('op-camille'), nom: 'Camille Martin', code: '007' },
  { id: new OperateurAnomalieId('op-alex'), nom: 'Alex Durand' },
];

class DossierReadFixture extends AnomaliesReadPort {
  failure: Error | undefined;
  result: LectureDossier = { kind: 'DOSSIER', dossier: dossierFinAutomatiqueFixture() };
  readonly demandes: AdresseDossier[] = [];
  operateursFailure: Error | undefined;
  operateursResult = operateursFixture();

  elements(): Promise<readonly ElementAnomalie[]> {
    return Promise.resolve([]);
  }

  operateurs(): Promise<readonly OperateurAnomalie[]> {
    const failure = this.operateursFailure;
    const result = this.operateursResult;
    return roundTripFixture(() => {
      if (failure !== undefined) throw failure;
      return result;
    });
  }

  read(adresse: AdresseDossier): Promise<LectureDossier> {
    this.demandes.push(adresse);
    const failure = this.failure;
    const result = this.result;
    return roundTripFixture(() => {
      if (failure !== undefined) throw failure;
      return result;
    });
  }

  list(): Promise<PageAnomalies> {
    return Promise.resolve({ lignes: [], total: 0 });
  }
}

class RouteFixture {
  readonly paramMap = new BehaviorSubject<ParamMap>(convertToParamMap({ suivi: 'suivi-camille' }));
  readonly queryParamMap = new BehaviorSubject<ParamMap>(convertToParamMap({ pointage: 'fin-17' }));
}

const dossierFinAutomatiqueFixture = ({ sansPoste = false } = {}): DossierAnomalie => ({
  operateur: new OperateurAnomalieId('op-camille'),
  operateurNom: 'Camille Martin',
  posteLibelle: sansPoste ? '' : 'DMU 50',
  ...(sansPoste ? {} : { posteId: 'poste-1' }),
  echue: new ActiviteAnomalieId('travail-8'),
  debut: INSTANT_DEBUT,
  journal: [
    {
      id: new PointageAnomalieId('debut-8'),
      fait: { type: 'DEBUT', operateur: 'op-camille', instant: INSTANT_DEBUT },
      operateurNom: 'Camille Martin',
      regularisation: false,
    },
  ],
  activites: [
    {
      id: new ActiviteAnomalieId('travail-8'),
      libelle: '',
      etat: 'ECHUE',
      ouvrant: new PointageAnomalieId('debut-8'),
      periode: { categorie: 'TRAVAIL', debut: INSTANT_DEBUT, fin: INSTANT_ECHEANCE },
    },
  ],
});

describe('Anomaly dossier page', () => {
  let fixture: ComponentFixture<DossierAnomaliePage>;
  let read: DossierReadFixture;
  let route: RouteFixture;
  let resizeObserver: ResizeObserverFixture;

  beforeEach(() => {
    resizeObserver = new ResizeObserverFixture();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 5, 10, 0));
    read = new DossierReadFixture();
    route = new RouteFixture();
    TestBed.configureTestingModule({
      providers: [
        { provide: ActivatedRoute, useValue: route },
        { provide: AnomaliesReadPort, useValue: read },
        { provide: ErrorHandlerPort, useValue: { handleError: () => undefined } },
      ],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    resizeObserver.restore();
  });

  it('should offer a retry when reading fails without showing a misleading dossier', async () => {
    read.failure = new Error('Dossier indisponible');

    await whenRendering();

    thenTextContains('anomalie-retry', 'Réessayer');
    thenAbsent('anomalie-resolution');
  });

  it('should reacquire the dossier after the manager explicitly retries an unavailable reading', async () => {
    read.failure = new Error('Dossier indisponible');
    await whenRendering();
    read.failure = undefined;

    await whenClicking('anomalie-retry');

    thenTheResolutionViewIsShown();
    thenAbsent('anomalie-retry');
    expect(read.demandes).toHaveLength(2);
  });

  it('should open the resolution view although the operators cannot be read', async () => {
    read.operateursFailure = new Error('Opérateurs indisponibles');

    await whenRendering();

    thenTheResolutionViewIsShown();
  });

  it('should say the operator in the link to the day when no name is resolved', async () => {
    read.operateursResult = [];
    const dossier = dossierFinAutomatiqueFixture();
    read.result = {
      kind: 'DOSSIER',
      dossier: { ...dossier, operateurNom: '', journal: dossier.journal.map(pointage => ({ ...pointage, operateurNom: '' })) },
    };

    await whenRendering();

    thenTextContains('anomalie-frise-journee', 'Voir la journée de l’opérateur');
  });

  it('should name the operator among the operators when the dossier carries no name', async () => {
    const dossier = dossierFinAutomatiqueFixture();
    read.result = {
      kind: 'DOSSIER',
      dossier: { ...dossier, operateurNom: '', journal: dossier.journal.map(pointage => ({ ...pointage, operateurNom: '' })) },
    };

    await whenRendering();

    thenTextContains('anomalie-frise-journee', 'Voir la journée de Camille Martin');
  });

  it('should show the operator, the workstation and the start of the activity in the header as a long day and local time', async () => {
    await whenRendering();

    thenHeadingContains('Camille Martin · DMU 50 · lundi 14 septembre à 08:00');
  });

  it('should present unresolved references in the header without any identity', async () => {
    read.result = {
      kind: 'DOSSIER',
      dossier: { ...dossierFinAutomatiqueFixture(), operateurNom: '', posteLibelle: '', posteId: 'poste-absent' },
    };

    await whenRendering();

    thenHeadingContains('Opérateur non résolu · Poste non résolu');
    thenHeadingDoesNotContain('poste-absent');
  });

  it('should distinguish a missing workstation from an unresolved workstation in the header', async () => {
    givenADossierWithoutWorkstation();

    await whenRendering();

    thenHeadingContains('Camille Martin · Sans poste · lundi 14 septembre à 08:00');
  });

  it('should reject an address missing its suivi without requesting a dossier', async () => {
    route.paramMap.next(convertToParamMap({}));

    await whenRendering();

    thenTextContains('anomalie-adresse-invalide', 'L’adresse doit préciser');
    thenAbsent('anomalie-resolution');
    expect(read.demandes).toHaveLength(0);
  });

  it('should say that the addressed pointage no longer opens an automatic end to regularise', async () => {
    read.result = { kind: 'INTROUVABLE' };

    await whenRendering();

    thenTextContains('anomalie-adresse-obsolete', 'introuvable ou ne relève plus d’une fin automatique à régulariser');
    thenAbsent('anomalie-resolution');
  });

  it('should present an automatic end as an anomaly of pointage and never as a conflict', async () => {
    await whenRendering();

    thenHeadingOfThePageIs('Dossier d’anomalie de pointage');
    thenTextContains('anomalie-retour', 'Retour aux anomalies');
    thenTheProblemReads('Le travail démarré à 08:00 n’a jamais été arrêté : fin automatique à 21:00.');
    thenPageDoesNotMention('conflit');
  });

  it('should explain the loading of a dossier without calling it a conflict', () => {
    whenRenderingWithoutWaiting();

    thenTextContains('anomalie-chargement', 'Chargement du dossier…');
  });

  describe('resolution view of an automatic end', () => {
    beforeEach(() => {
      HTMLElement.prototype.setPointerCapture = () => undefined;
      vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
      vi.setSystemTime(new Date(2026, 9, 5, 10, 0));
    });

    it('should draw the frise read only, with the markers and the bars as images', async () => {
      await whenRendering();

      thenTheMarkersAndTheBarsAreImages();
    });

    it('should leave the handle without hour, and tell how to place the end', async () => {
      await whenRendering();

      thenTheHandleHoldsNoHour();
      thenTextContains('anomalie-frise-aide', 'Tirez le bout de la barre ou cliquez dessus pour placer la fin réelle.');
    });

    it('should offer no field for the hour and no validation, the handle being the way to place the end', async () => {
      await whenRendering();

      thenNoFieldIsOffered();
      thenAbsent('anomalie-resolution-valider');
    });

    it('should place the end at the automatic end with the first key pressed on the handle', async () => {
      await whenRendering();

      await whenPressingOnTheHandle('ArrowLeft');

      thenTheHandleHoldsAt(new Date(2026, 8, 14, 21, 0));
    });

    it('should place the end at the start of the activity when Home is pressed on the hourless handle', async () => {
      await whenRendering();

      await whenPressingOnTheHandle('Home');

      thenTheHandleHoldsAt(new Date(2026, 8, 14, 8, 0));
    });

    it('should place the end at the whole minute of the clock read at the key when End is pressed on the hourless handle', async () => {
      whenTheClockIs(new Date(2026, 8, 14, 22, 10, 30));
      await whenRendering();
      whenTheClockIs(new Date(2026, 8, 14, 22, 12, 10));

      await whenPressingOnTheHandle('End');

      thenTheHandleHoldsAt(new Date(2026, 8, 14, 22, 12));
    });

    it('should move the placed handle by the minute with the arrow keys', async () => {
      await whenRendering();
      await whenPressingOnTheHandle('ArrowLeft');

      await whenPressingOnTheHandle('ArrowLeft');

      thenTheHandleHoldsAt(new Date(2026, 8, 14, 20, 59));
    });
  });

  const givenADossierWithoutWorkstation = (): void => {
    read.result = { kind: 'DOSSIER', dossier: dossierFinAutomatiqueFixture({ sansPoste: true }) };
  };

  const whenTheClockIs = (instant: Date): void => {
    vi.setSystemTime(instant);
  };

  const thenTheMarkersAndTheBarsAreImages = (): void => {
    expect(friseElements('anomalie-activite').map(barre => barre.getAttribute('role'))).toEqual(['img']);
    expect(friseElements('anomalie-pointage').map(repere => repere.getAttribute('role'))).toEqual(['img']);
  };

  const thenTheHandleHoldsNoHour = (): void => {
    expect(element('anomalie-poignee').hasAttribute('data-sans-heure')).toBe(true);
    expect(element('anomalie-poignee').hasAttribute('aria-valuenow')).toBe(false);
  };

  const thenNoFieldIsOffered = (): void => {
    expect(element('anomalie-resolution').querySelector('input')).toBeNull();
  };

  const thenTheResolutionViewIsShown = (): void => {
    expect(present('anomalie-resolution')).toBe(true);
  };

  const whenRenderingWithoutWaiting = (): void => {
    fixture = TestBed.createComponent(DossierAnomaliePage);
    fixture.detectChanges();
  };

  const whenPressingOnTheHandle = async (key: string): Promise<void> => {
    element('anomalie-poignee').dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    await fixture.whenStable();
  };

  const friseElements = (selector: string): HTMLElement[] => [
    ...element('anomalie-frise').querySelectorAll<HTMLElement>(dataSelector(selector)),
  ];

  const whenClicking = async (selector: string): Promise<void> => {
    element(selector).click();
    await fixture.whenStable();
  };

  const whenRendering = async (): Promise<void> => {
    fixture = TestBed.createComponent(DossierAnomaliePage);
    await fixture.whenStable();
  };

  const element = (selector: string): HTMLElement => {
    const found = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(dataSelector(selector));
    if (found === null) throw new Error(`Missing element ${selector}`);
    return found;
  };

  const present = (selector: string): boolean => (fixture.nativeElement as HTMLElement).querySelector(dataSelector(selector)) !== null;

  const thenTheHandleHoldsAt = (expected: Date): void => {
    expect(Number(element('anomalie-poignee').getAttribute('aria-valuenow'))).toBe(expected.getTime());
  };

  const thenTheProblemReads = (expected: string): void => {
    expect(element('anomalie-probleme').textContent.replace(/\s+/g, ' ').trim()).toBe(expected);
  };

  const thenTextContains = (selector: string, expected: string): void => {
    expect(element(selector).textContent).toContain(expected);
  };

  const thenHeadingOfThePageIs = (expected: string): void => {
    expect((fixture.nativeElement as HTMLElement).querySelector('h1')?.textContent).toBe(expected);
  };

  const thenPageDoesNotMention = (word: string): void => {
    expect((fixture.nativeElement as HTMLElement).textContent.toLowerCase()).not.toContain(word);
  };

  const thenHeadingContains = (expected: string): void => {
    expect((fixture.nativeElement as HTMLElement).querySelector('header')?.textContent.replace(/\s+/g, ' ')).toContain(expected);
  };

  const thenHeadingDoesNotContain = (expected: string): void => {
    expect((fixture.nativeElement as HTMLElement).querySelector('header')?.textContent).not.toContain(expected);
  };

  const thenAbsent = (selector: string): void => {
    expect(present(selector)).toBe(false);
  };
});

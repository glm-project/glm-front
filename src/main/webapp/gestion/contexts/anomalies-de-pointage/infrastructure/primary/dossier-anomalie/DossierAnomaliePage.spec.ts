import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, ParamMap, provideRouter, Router } from '@angular/router';
import { ResizeObserverFixture } from '@test/unit/fixtures/gestion/anomalies-de-pointage/ResizeObserverFixture';
import { dataSelector } from '@test/utils/DataSelector';
import { instantLocalFixture } from '@test/utils/gestion/anomalies-de-pointage/InstantLocal.fixture';
import { BehaviorSubject } from 'rxjs';
import { ActiviteAnomalieId } from '../../../domain/dossier/ActiviteAnomalieId';
import { AnomaliesReadPort } from '../../../domain/dossier/AnomaliesReadPort';
import {
  AdresseDossier,
  DossierAnomalie,
  FiltreAnomalies,
  LectureDossier,
  LigneFinAutomatique,
  PageAnomalies,
} from '../../../domain/dossier/DossierAnomalie';
import { ElementAnomalie } from '../../../domain/dossier/ElementAnomalie';
import { ElementAnomalieId } from '../../../domain/dossier/ElementAnomalieId';
import { OperateurAnomalie } from '../../../domain/dossier/OperateurAnomalie';
import { OperateurAnomalieId } from '../../../domain/dossier/OperateurAnomalieId';
import { PointageAnomalieId } from '../../../domain/dossier/PointageAnomalieId';
import { SuiviAnomalieId } from '../../../domain/dossier/SuiviAnomalieId';
import { CommandeDeRegularisation, RegularisationPort, ResultatDeRegularisation } from '../../../domain/regularisation/RegularisationPort';
import { DossierAnomaliePage } from './DossierAnomaliePage';

@Component({ template: '' })
class DestinationFixture {}

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

  pages: Record<number, PageAnomalies> = {};
  listFailure: Error | undefined;
  readonly listees: FiltreAnomalies[] = [];

  list(filtre: FiltreAnomalies): Promise<PageAnomalies> {
    this.listees.push(filtre);
    const failure = this.listFailure;
    const page = this.pages[filtre.page] ?? { lignes: [], total: 0 };
    return roundTripFixture(() => {
      if (failure !== undefined) throw failure;
      return page;
    });
  }
}

class RegularisationFixture extends RegularisationPort {
  readonly commandes: CommandeDeRegularisation[] = [];
  reponses: (ResultatDeRegularisation | Error)[] = [];

  regulariser(commande: CommandeDeRegularisation): Promise<ResultatDeRegularisation> {
    this.commandes.push(commande);
    const reponse = this.reponses.shift() ?? { kind: 'REGULARISEE' };
    return roundTripFixture(() => {
      if (reponse instanceof Error) throw reponse;
      return reponse;
    });
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
  journal: [
    {
      id: new PointageAnomalieId('debut-8'),
      fait: { type: 'DEBUT', operateur: 'op-camille', instant: INSTANT_DEBUT },
      operateurNom: 'Camille Martin',
    },
  ],
  activite: {
    id: new ActiviteAnomalieId('travail-8'),
    ouvrant: new PointageAnomalieId('debut-8'),
    categorie: 'TRAVAIL',
    debut: INSTANT_DEBUT,
    echeance: INSTANT_ECHEANCE,
  },
});

describe('Anomaly dossier page', () => {
  let fixture: ComponentFixture<DossierAnomaliePage>;
  let read: DossierReadFixture;
  let route: RouteFixture;
  let regularisation: RegularisationFixture;
  let resizeObserver: ResizeObserverFixture;

  beforeEach(() => {
    resizeObserver = new ResizeObserverFixture();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 5, 10, 0));
    read = new DossierReadFixture();
    route = new RouteFixture();
    regularisation = new RegularisationFixture();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'anomalies', component: DestinationFixture },
          { path: 'anomalies/:suivi', component: DestinationFixture },
        ]),
        { provide: ActivatedRoute, useValue: route },
        { provide: AnomaliesReadPort, useValue: read },
        { provide: RegularisationPort, useValue: regularisation },
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
      thenTextContains('anomalie-frise-aide', 'Tirez le bout de la barre ou cliquez dessus pour placer la fin réelle, puis validez.');
    });

    it('should offer no field for the hour, the handle being the way to place the end', async () => {
      await whenRendering();

      thenNoFieldIsOffered();
    });

    it('should not offer to validate an end while the handle holds no hour', async () => {
      await whenRendering();

      thenTheValidationIsUnavailableAs('Valider la fin');
    });

    it('should offer to validate the end at the hour of the handle once it holds one', async () => {
      await whenRendering();

      await whenPressingOnTheHandle('ArrowLeft');

      thenTheValidationIsAvailableAs('Valider la fin à 21:00');
    });

    it('should regularise the activity at the hour of the handle when the end is validated', async () => {
      await whenRendering();
      await whenPressingOnTheHandle('ArrowLeft');

      await whenValidating();

      expect(regularisation.commandes).toMatchObject([
        { suivi: { suivi: 'suivi-camille' }, activite: { activite: 'travail-8' }, dateDeSurvenue: '2026-09-14T21:00:00-03:00' },
      ]);
    });

    it('should say at which hour the end was regularised and leave nothing to validate or to place', async () => {
      await whenRendering();
      await whenPressingOnTheHandle('ArrowLeft');

      await whenValidating();

      thenTextContains('anomalie-resolution-regularisee', 'Fin régularisée à 21:00');
      thenAbsent('anomalie-resolution-valider');
      thenAbsent('anomalie-poignee');
    });

    it.each([
      { code: 'activite-visee-introuvable', message: 'Cette activité est introuvable dans ce suivi.' },
      { code: 'activite-deja-regularisee', message: 'Cette fin automatique est déjà régularisée.' },
      {
        code: 'activite-non-echue',
        message:
          'Cette activité n’est pas une fin automatique : son échéance n’est pas atteinte, ou un pointage ou la clôture l’a déjà terminée.',
      },
      { code: 'date-de-survenue-future', message: 'La fin ne peut pas être placée dans le futur.' },
      { code: 'fin-avant-debut', message: 'La fin doit être postérieure au début de l’activité.' },
      { code: 'fin-apres-borne', message: 'La fin ne peut pas dépasser le démarrage suivant ni la clôture.' },
    ] as const)('should say the refusal $code to the manager and let him validate again', async ({ code, message }) => {
      givenTheRegularisationAnswers({ kind: 'REFUS', code });
      await whenRendering();
      await whenPressingOnTheHandle('ArrowLeft');

      await whenValidating();

      thenTextContains('anomalie-resolution-refus', message);
      thenTheValidationIsAvailableAs('Valider la fin à 21:00');
    });

    it('should read the dossier again and say it changed when another entry was concurrent', async () => {
      givenTheRegularisationAnswers({ kind: 'CONCURRENCE' });
      await whenRendering();
      await whenPressingOnTheHandle('ArrowLeft');

      await whenValidatingAndWaitingForTheDossierToBeReadAgain();

      thenTheDossierWasReadTwice();
      thenTextContains('anomalie-dossier-relu', 'Le dossier a changé pendant la saisie : il a été relu. Placez de nouveau la fin.');
      thenTheHandleHoldsNoHour();
    });

    it('should offer the next anomaly once the end is regularised', async () => {
      await whenRendering();

      await whenRegularisingTheEnd();

      thenTextContains('anomalie-resolution-suivante', 'Anomalie suivante');
    });

    it('should not offer the next anomaly while the end is not regularised', async () => {
      await whenRendering();

      thenAbsent('anomalie-resolution-suivante');
    });

    it('should lead to the first other row of the page of the list the manager came from', async () => {
      givenTheManagerCameFromTheListFiltered({ operateur: 'op-camille', page: '2' });
      givenTheList(2, [uneLigne('suivi-camille', 'fin-17'), uneLigne('suivi-alex', 'debut-alex')]);
      await whenRendering();
      await whenRegularisingTheEnd();

      await whenAskingForTheNextAnomaly();

      thenTheManagerIsLedTo('/anomalies/suivi-alex?operateur=op-camille&page=2&pointage=debut-alex');
    });

    it('should lead back to the list saying that no anomaly is left when the list holds no other row', async () => {
      givenTheManagerCameFromTheListFiltered({ operateur: 'op-camille', page: '1' });
      givenTheList(1, [uneLigne('suivi-camille', 'fin-17')]);
      await whenRendering();
      await whenRegularisingTheEnd();

      await whenAskingForTheNextAnomaly();

      thenTheManagerIsLedTo('/anomalies?operateur=op-camille&plusAucune=1');
    });

    it('should lead back to the list the manager came from when the list cannot be read', async () => {
      givenTheManagerCameFromTheListFiltered({ operateur: 'op-camille', page: '2' });
      read.listFailure = new Error('Liste indisponible');
      await whenRendering();
      await whenRegularisingTheEnd();

      await whenAskingForTheNextAnomaly();

      thenTheManagerIsLedTo('/anomalies?operateur=op-camille&page=2');
    });

    it('should say the failure when the regularisation could not be sent', async () => {
      givenTheRegularisationAnswers(new Error('Réseau coupé'));
      await whenRendering();
      await whenPressingOnTheHandle('ArrowLeft');

      await whenValidating();

      thenTextContains('anomalie-resolution-refus', 'La fin n’a pas pu être enregistrée. Votre saisie est conservée : réessayez.');
    });

    it('should send the same entry again when the manager validates again after a failure', async () => {
      givenTheRegularisationAnswers(new Error('Réseau coupé'));
      await whenRendering();
      await whenPressingOnTheHandle('ArrowLeft');
      await whenValidating();

      await whenValidating();

      thenTheSameEntryWasSentTwice();
    });

    it('should place the end at the automatic end with the first key pressed on the handle', async () => {
      await whenRendering();

      await whenPressingOnTheHandle('ArrowLeft');

      thenTheHandleHoldsAt(new Date(2026, 8, 14, 21, 0));
    });

    it('should place the end one minute after the start of the activity when Home is pressed on the hourless handle', async () => {
      await whenRendering();

      await whenPressingOnTheHandle('Home');

      thenTheHandleHoldsAt(new Date(2026, 8, 14, 8, 1));
    });

    it('should place the end at the whole minute of the clock read at the key when End is pressed on the hourless handle', async () => {
      whenTheClockIs(new Date(2026, 8, 14, 22, 10, 30));
      await whenRendering();
      whenTheClockIs(new Date(2026, 8, 14, 22, 12, 10));

      await whenPressingOnTheHandle('End');

      thenTheHandleHoldsAt(new Date(2026, 8, 14, 22, 12));
    });

    it('should hold the end at the bound of the end of the dossier when End is pressed long after it', async () => {
      read.result = {
        kind: 'DOSSIER',
        dossier: { ...dossierFinAutomatiqueFixture(), borneDeFin: instantLocalFixture(new Date(2026, 8, 14, 22, 30)) },
      };
      whenTheClockIs(new Date(2026, 8, 16, 10, 0));
      await whenRendering();

      await whenPressingOnTheHandle('End');

      thenTheHandleHoldsAt(new Date(2026, 8, 14, 22, 30));
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

  const givenTheManagerCameFromTheListFiltered = (filtre: Record<string, string>): void => {
    route.queryParamMap.next(convertToParamMap({ pointage: 'fin-17', ...filtre }));
  };

  const givenTheList = (page: number, lignes: readonly LigneFinAutomatique[]): void => {
    read.pages[page] = { lignes, total: lignes.length };
  };

  const uneLigne = (suivi: string, pointage: string): LigneFinAutomatique => ({
    adresse: { suivi: new SuiviAnomalieId(suivi), pointage: new PointageAnomalieId(pointage) },
    element: new ElementAnomalieId('element-1'),
    designation: 'M24-0655',
    operateur: 'Camille Martin',
    poste: 'DMU 50',
    debut: INSTANT_DEBUT,
    echeance: INSTANT_ECHEANCE,
  });

  const whenRegularisingTheEnd = async (): Promise<void> => {
    await whenPressingOnTheHandle('ArrowLeft');
    await whenValidating();
  };

  const whenAskingForTheNextAnomaly = async (): Promise<void> => {
    element('anomalie-resolution-suivante').click();
    await fixture.whenStable();
    await roundTripFixture(() => undefined);
    await fixture.whenStable();
  };

  const thenTheManagerIsLedTo = (url: string): void => {
    expect(TestBed.inject(Router).url).toBe(url);
  };

  const givenTheRegularisationAnswers = (...reponses: (ResultatDeRegularisation | Error)[]): void => {
    regularisation.reponses = reponses;
  };

  const whenValidatingAndWaitingForTheDossierToBeReadAgain = async (): Promise<void> => {
    await whenValidating();
    await fixture.whenStable();
  };

  const thenTheDossierWasReadTwice = (): void => {
    expect(read.demandes).toHaveLength(2);
  };

  const thenTheSameEntryWasSentTwice = (): void => {
    const identifiants = regularisation.commandes.map(commande => commande.id);
    expect(identifiants).toHaveLength(2);
    expect(identifiants[0]).toBe(identifiants[1]);
  };

  const whenValidating = async (): Promise<void> => {
    element('anomalie-resolution-valider').click();
    await fixture.whenStable();
    await roundTripFixture(() => undefined);
    await fixture.whenStable();
  };

  const thenTheValidationIsAvailableAs = (label: string): void => {
    const bouton = element('anomalie-resolution-valider') as HTMLButtonElement;
    expect([bouton.disabled, bouton.textContent.trim()]).toEqual([false, label]);
  };

  const thenTheValidationIsUnavailableAs = (label: string): void => {
    const bouton = element('anomalie-resolution-valider') as HTMLButtonElement;
    expect([bouton.disabled, bouton.textContent.trim()]).toEqual([true, label]);
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

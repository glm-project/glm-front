import { ActeResolution, FaitPropose } from '@/gestion/contexts/anomalies-de-pointage/domain/acte/ActeResolution';
import { SaisieActe } from '@/gestion/contexts/anomalies-de-pointage/domain/acte/SaisieActe';
import { ActiviteAnomalieId } from '@/gestion/contexts/anomalies-de-pointage/domain/dossier/ActiviteAnomalieId';
import { DossierAnomalie } from '@/gestion/contexts/anomalies-de-pointage/domain/dossier/DossierAnomalie';
import { ElementAnomalie } from '@/gestion/contexts/anomalies-de-pointage/domain/dossier/ElementAnomalie';
import { ElementAnomalieId } from '@/gestion/contexts/anomalies-de-pointage/domain/dossier/ElementAnomalieId';
import { OperateurAnomalie } from '@/gestion/contexts/anomalies-de-pointage/domain/dossier/OperateurAnomalie';
import { OperateurAnomalieId } from '@/gestion/contexts/anomalies-de-pointage/domain/dossier/OperateurAnomalieId';
import { PerimetreDuDossier } from '@/gestion/contexts/anomalies-de-pointage/domain/dossier/PerimetreDuDossier';
import { PointageAnomalieId } from '@/gestion/contexts/anomalies-de-pointage/domain/dossier/PointageAnomalieId';
import { SuiviAnomalieId } from '@/gestion/contexts/anomalies-de-pointage/domain/dossier/SuiviAnomalieId';

import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, ParamMap, Router } from '@angular/router';
import { ResizeObserverFixture } from '@test/unit/fixtures/gestion/anomalies-de-pointage/ResizeObserverFixture';
import { dataSelector } from '@test/utils/DataSelector';
import { instantLocalFixture } from '@test/utils/gestion/anomalies-de-pointage/InstantLocal.fixture';
import { requiredFixture } from '@test/utils/RequiredFixture';
import { BehaviorSubject, EMPTY } from 'rxjs';
import {
  ApplicationActePort,
  PrevisualisationAnomaliePort,
  ResultatApercu,
  ResultatApplication,
  ResultatVerification,
} from '../../../domain/acte/AnomaliesActesPorts';
import { AnomaliesReadPort } from '../../../domain/dossier/AnomaliesReadPort';
import {
  ActiviteAnomalie,
  AdresseDossier,
  FiltreAnomalies,
  LectureDossier,
  LigneFinAutomatique,
  PageAnomalies,
  PointageAnomalie,
} from '../../../domain/dossier/DossierAnomalie';
import { DossierAnomaliePage } from './DossierAnomaliePage';

const INSTANT_FIN = instantLocalFixture(new Date(2026, 8, 14, 17, 0), '123456789');
const INSTANT_DEBUT = instantLocalFixture(new Date(2026, 8, 14, 8, 0));
const INSTANT_ECHEANCE = instantLocalFixture(new Date(2026, 8, 14, 21, 0));
const INSTANT_FIN_DE_TRAVAIL = instantLocalFixture(new Date(2026, 8, 14, 17, 0));
const INSTANT_ENREGISTREMENT = instantLocalFixture(new Date(2026, 8, 15, 8, 0));
const INSTANT_ENGAGEMENT = instantLocalFixture(new Date(2026, 8, 1, 7, 30));

const realSetTimeout = setTimeout;

const roundTripFixture = async <T>(result: () => T): Promise<T> => {
  await new Promise<void>(resolve => realSetTimeout(resolve));
  return result();
};

class PendingResponseFixture<T> {
  private announce: (() => void) | undefined;
  private complete: ((result: T) => void) | undefined;
  private reject: ((failure: unknown) => void) | undefined;
  readonly arrival = new Promise<void>(resolve => {
    this.announce = resolve;
  });
  readonly completion = new Promise<T>((resolve, reject) => {
    this.complete = resolve;
    this.reject = reject;
  });

  arrive(): Promise<T> {
    requiredFixture(this.announce, 'request arrival')();
    return this.completion;
  }

  release(result: T): void {
    requiredFixture(this.complete, 'request completion')(result);
  }
  fail(failure: unknown): void {
    requiredFixture(this.reject, 'request failure')(failure);
  }
}

const operateursFixture = (): readonly OperateurAnomalie[] => [
  { id: new OperateurAnomalieId('op-camille'), nom: 'Camille Martin', code: '007' },
  { id: new OperateurAnomalieId('op-alex'), nom: 'Alex Durand' },
  { id: new OperateurAnomalieId('op-zoe'), nom: 'Zoé Évrard', code: '012' },
];

const JOURNAL_ENTIER_EN_PERIMETRE = new PerimetreDuDossier([]);

const avecLePerimetreDuJournal = (dossier: DossierAnomalie): DossierAnomalie =>
  dossier.perimetre === JOURNAL_ENTIER_EN_PERIMETRE
    ? { ...dossier, perimetre: new PerimetreDuDossier(dossier.journal.map(pointage => pointage.id)) }
    : dossier;

const lectureAvecLePerimetreDuJournal = (lecture: LectureDossier): LectureDossier =>
  lecture.kind === 'DOSSIER' ? { kind: 'DOSSIER', dossier: avecLePerimetreDuJournal(lecture.dossier) } : lecture;

const apercuAvecLePerimetreDuJournal = (resultat: ResultatApercu): ResultatApercu =>
  resultat.kind === 'APERCU'
    ? {
        kind: 'APERCU',
        apercu: {
          ...resultat.apercu,
          avant: avecLePerimetreDuJournal(resultat.apercu.avant),
          apres: avecLePerimetreDuJournal(resultat.apercu.apres),
        },
      }
    : resultat;

const applicationAvecLePerimetreDuJournal = (resultat: ResultatApplication): ResultatApplication =>
  resultat.kind === 'APPLIQUE' ? { kind: 'APPLIQUE', dossier: avecLePerimetreDuJournal(resultat.dossier) } : resultat;

const verificationAvecLePerimetreDuJournal = (resultat: ResultatVerification): ResultatVerification =>
  resultat.kind === 'ATTESTE' ? { kind: 'ATTESTE', dossier: avecLePerimetreDuJournal(resultat.dossier) } : resultat;

class DossierReadFixture extends AnomaliesReadPort {
  failure: Error | undefined;
  result: LectureDossier = { kind: 'DOSSIER', dossier: dossierAnomalieFixture() };
  pending: PendingResponseFixture<LectureDossier> | undefined;
  readonly demandes: AdresseDossier[] = [];
  readonly followingResults: LectureDossier[] = [];
  operateursFailure: Error | undefined;
  operateursResult = operateursFixture();
  elementsDemandes = 0;

  elements(): Promise<readonly ElementAnomalie[]> {
    this.elementsDemandes += 1;
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
    const pending = this.pending;
    this.pending = undefined;
    if (pending !== undefined) return pending.arrive();
    const failure = this.failure;
    const result = lectureAvecLePerimetreDuJournal(this.followingResults.shift() ?? this.result);
    return roundTripFixture(() => {
      if (failure !== undefined) throw failure;
      return result;
    });
  }

  readonly listesDemandees: FiltreAnomalies[] = [];
  listFailure: Error | undefined;
  lignesDeLaListe: readonly LigneFinAutomatique[] = [];

  list(filtre: FiltreAnomalies): Promise<PageAnomalies> {
    this.listesDemandees.push(filtre);
    const failure = this.listFailure;
    const lignes = this.lignesDeLaListe;
    return roundTripFixture(() => {
      if (failure !== undefined) throw failure;
      return { nature: 'FIN_AUTOMATIQUE', lignes, total: lignes.length, complete: true };
    });
  }
}

class RepliesFixture<T> {
  readonly automaticResponses: Promise<T>[] = [];
  pending: PendingResponseFixture<T> | undefined;

  answer(result: T): Promise<T> {
    const pending = this.pending;
    this.pending = undefined;
    if (pending !== undefined) return pending.arrive();
    const response = roundTripFixture(() => result);
    this.automaticResponses.push(response);
    return response;
  }
}

class DossierPreviewFixture extends PrevisualisationAnomaliePort {
  readonly replies = new RepliesFixture<ResultatApercu>();
  readonly actes: ActeResolution[] = [];
  readonly followingResults: ResultatApercu[] = [];
  result: ResultatApercu = { kind: 'REFUS', code: 'evenement-deja-annule' };
  failure: Error | undefined;

  preview(_adresse: AdresseDossier, _version: number, acte: ActeResolution): Promise<ResultatApercu> {
    this.actes.push(acte);
    const failure = this.failure;
    if (failure !== undefined) {
      return roundTripFixture(() => {
        throw failure;
      });
    }
    return this.replies.answer(apercuAvecLePerimetreDuJournal(this.followingResults.shift() ?? this.result));
  }
}

class DossierApplicationFixture extends ApplicationActePort {
  readonly replies = new RepliesFixture<ResultatApplication>();
  readonly receiptReplies = new RepliesFixture<ResultatVerification>();
  result: ResultatApplication = { kind: 'REFUS', code: 'evenement-deja-annule' };
  verification: ResultatVerification = { kind: 'NON_ATTESTE' };

  apply(): Promise<ResultatApplication> {
    return this.replies.answer(applicationAvecLePerimetreDuJournal(this.result));
  }

  verify(): Promise<ResultatVerification> {
    return this.receiptReplies.answer(verificationAvecLePerimetreDuJournal(this.verification));
  }
}

class RouteFixture {
  readonly paramMap = new BehaviorSubject<ParamMap>(convertToParamMap({ suivi: 'suivi-camille' }));
  readonly queryParamMap = new BehaviorSubject<ParamMap>(convertToParamMap({ pointage: 'fin-17' }));
}

interface NavigationFixture {
  readonly commands: readonly unknown[];
  readonly queryParams: Record<string, string | null | undefined>;
}

class RouterFixture {
  readonly events = EMPTY;
  readonly navigations: NavigationFixture[] = [];
  navigate(commands: readonly unknown[], extras?: { queryParams?: Record<string, string | null | undefined> }): Promise<boolean> {
    this.navigations.push({ commands, queryParams: extras?.queryParams ?? {} });
    return Promise.resolve(true);
  }
  createUrlTree(commands: unknown[], extras?: { queryParams?: Record<string, string | null | undefined>; fragment?: string | null }) {
    const queryParams = Object.entries(extras?.queryParams ?? {}).filter(([, value]) => value !== null && value !== undefined);
    return { commands, queryParams: Object.fromEntries(queryParams), fragment: extras?.fragment ?? null };
  }
  serializeUrl(tree: { commands: unknown[]; queryParams: Record<string, string>; fragment: string | null }): string {
    const fragment = tree.fragment === null ? '' : `#${tree.fragment}`;
    return `${tree.commands.join('/')}?${new URLSearchParams(tree.queryParams).toString()}${fragment}`;
  }
}

const faitConflitFixture = (): FaitPropose => ({
  type: 'FIN',
  intention: 'FIN',
  activiteVisee: 'travail-8',
  operateur: 'op-camille',
  poste: 'poste-1',
  instant: INSTANT_FIN,
});

const dossierAnomalieFixture = (): DossierAnomalie => ({
  etat: 'EN_CONFLIT',
  ligne: {
    adresse: { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('fin-17') },
    element: new ElementAnomalieId('moule-42'),
    designation: 'M-042',
    operateur: 'Camille Martin',
    poste: 'DMU 50',
    date: INSTANT_FIN,
    explication: 'La fin vise le travail remplacé.',
    nombrePointages: 1,
  },
  version: 1,
  cloture: false,
  engagement: INSTANT_ENGAGEMENT,
  operateur: new OperateurAnomalieId('op-camille'),
  journal: [
    {
      id: new PointageAnomalieId('fin-17'),
      fait: faitConflitFixture(),
      operateurNom: 'Camille Martin',
      posteLibelle: 'DMU 50',
      auteur: 'camille',
      enregistre: INSTANT_ENREGISTREMENT,
      regularisation: false,
    },
  ],
  perimetre: JOURNAL_ENTIER_EN_PERIMETRE,
  activites: [
    {
      id: new ActiviteAnomalieId('travail-8'),
      libelle: 'Travail ouvert à 8 h',
      etat: 'A_RESOUDRE',
      temps: 'À résoudre',
      ouvrant: new PointageAnomalieId('debut-8'),
    },
  ],
  choix: [
    {
      id: 'rattacher',
      libelle: 'Rattacher la fin',
      explication: 'L’activité correcte est la NC.',
      saisie: SaisieActe.correct('fin-17', { ...faitConflitFixture(), activiteVisee: 'nc-12' }),
    },
  ],
  enConflit: true,
  finAutomatique: false,
  consequences: [],
});

const acteCorrectionFixture: ActeResolution = {
  kind: 'CORRECTION',
  pointage: 'fin-17',
  motif: 'Cible confirmée',
  fait: { ...faitConflitFixture(), activiteVisee: 'nc-12' },
};

const acteFinRegulariseeFixture = (poste: string, instant: string): ActeResolution => ({
  kind: 'REGULARISATION',
  fait: { type: 'FIN', intention: 'FIN', activiteVisee: 'travail-8', operateur: 'op-camille', poste, instant },
});

const finARegulariserFixture = (poste = 'poste-1', operateur = 'op-camille'): SaisieActe =>
  SaisieActe.regularise({
    type: 'FIN',
    intention: 'FIN',
    activiteVisee: 'travail-8',
    operateur,
    poste,
    instant: '',
  });

const dossierFinAutomatiqueFixture = (): DossierAnomalie => {
  const dossier = dossierAnomalieFixture();
  return {
    ...dossier,
    etat: 'FIN_AUTOMATIQUE',
    enConflit: false,
    finAutomatique: true,
    ligne: { ...dossier.ligne, explication: '', nombrePointages: 1 },
    journal: [
      {
        id: new PointageAnomalieId('debut-8'),
        fait: {
          ...faitConflitFixture(),
          type: 'DEBUT',
          intention: 'OUVERTURE',
          activiteVisee: '',
          instant: INSTANT_DEBUT,
        },
        operateurNom: 'Camille Martin',
        posteLibelle: 'DMU 50',
        activiteCreee: new ActiviteAnomalieId('travail-8'),
        auteur: 'camille',
        enregistre: INSTANT_DEBUT,
        regularisation: false,
      },
    ],
    activites: [
      {
        id: new ActiviteAnomalieId('travail-8'),
        libelle: '',
        etat: 'ECHUE',
        temps: '',
        ouvrant: new PointageAnomalieId('debut-8'),
        periode: { categorie: 'TRAVAIL', debut: INSTANT_DEBUT, fin: INSTANT_ECHEANCE, duree: 'PT13H' },
      },
    ],
    choix: [{ id: 'REGULARISER_FIN:debut-8', code: 'REGULARISER_FIN', libelle: '', explication: '', saisie: finARegulariserFixture() }],
  };
};

const INSTANT_FIN_TARDIVE = instantLocalFixture(new Date(2026, 8, 14, 23, 0));
const faitFinTardiveFixture = (instant = INSTANT_FIN_TARDIVE): FaitPropose => ({ ...faitConflitFixture(), instant });

const dossierFinTardiveFixture = (instant = INSTANT_FIN_TARDIVE): DossierAnomalie => {
  const dossier = dossierFinAutomatiqueFixture();
  return {
    ...dossier,
    journal: [
      ...dossier.journal,
      {
        id: new PointageAnomalieId('fin-23'),
        fait: faitFinTardiveFixture(instant),
        operateurNom: 'Camille Martin',
        posteLibelle: 'DMU 50',
        auteur: 'camille',
        enregistre: instant,
        regularisation: false,
      },
    ],
    choix: [
      {
        id: 'CORRIGER_FIN_TARDIVE:fin-23',
        code: 'CORRIGER_FIN_TARDIVE',
        libelle: '',
        explication: '',
        saisie: SaisieActe.correct('fin-23', faitFinTardiveFixture(instant)),
      },
    ],
  };
};

describe('Anomaly dossier page', () => {
  let fixture: ComponentFixture<DossierAnomaliePage>;
  let read: DossierReadFixture;
  let route: RouteFixture;
  let router: RouterFixture;
  let preview: DossierPreviewFixture;
  let application: DossierApplicationFixture;
  let resizeObserver: ResizeObserverFixture;

  beforeEach(() => {
    resizeObserver = new ResizeObserverFixture();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 5, 10, 0));
    read = new DossierReadFixture();
    route = new RouteFixture();
    router = new RouterFixture();
    preview = new DossierPreviewFixture();
    application = new DossierApplicationFixture();
    TestBed.configureTestingModule({
      providers: [
        { provide: ActivatedRoute, useValue: route },
        { provide: Router, useFactory: () => router },
        { provide: AnomaliesReadPort, useValue: read },
        { provide: PrevisualisationAnomaliePort, useValue: preview },
        { provide: ApplicationActePort, useValue: application },
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
    givenAnAutomaticEndWithAResolutionView();
    read.failure = new Error('Dossier indisponible');
    await whenRendering();
    read.failure = undefined;

    await whenClicking('anomalie-retry');

    thenTheResolutionViewIsShown();
    thenAbsent('anomalie-retry');
    expect(read.demandes).toHaveLength(2);
  });

  it('should show no resolution view for a conflict dossier and leave the way back to the list', async () => {
    await whenRendering();

    thenNoResolutionViewIsShown();
    thenAbsent('anomalie-retry');
    thenAbsent('anomalie-adresse-obsolete');
  });

  it('should open the resolution view although the operators cannot be read', async () => {
    givenAnAutomaticEndWithAResolutionView();
    read.operateursFailure = new Error('Opérateurs indisponibles');

    await whenRendering();

    thenTheResolutionViewIsShown();
  });

  it('should say the operator in the link to the day when no name is resolved', async () => {
    const dossier = dossierDeResolutionFixture();
    read.operateursResult = [];
    read.result = {
      kind: 'DOSSIER',
      dossier: {
        ...dossier,
        ligne: { ...dossier.ligne, operateur: '' },
        journal: dossier.journal.map(pointage => ({ ...pointage, operateurNom: '' })),
      },
    };

    await whenRendering();

    thenTextContains('anomalie-frise-journee', 'Voir la journée de l’opérateur');
  });

  it('should show the engagement of the workshop in the header as a long day and local time', async () => {
    givenAnAutomaticEndWithAResolutionView();

    await whenRendering();

    thenTextContains('anomalie-cloture', 'mardi 1 septembre à 07:30');
  });

  it('should show the date of the first pointage in the header as a long day and local time', async () => {
    givenAnAutomaticEndWithAResolutionView();

    await whenRendering();

    thenHeadingContains('lundi 14 septembre à 17:00');
  });

  it('should reject an address missing its suivi without requesting a dossier', async () => {
    givenAnIncompletePath();

    await whenRendering();

    thenTextContains('anomalie-adresse-invalide', 'L’adresse doit préciser');
    thenAbsent('anomalie-resolution');
    expect(read.demandes).toHaveLength(0);
  });

  it('should say that the addressed pointage was cancelled or replaced', async () => {
    read.result = { kind: 'ANCRE_ANNULEE', journal: dossierAnomalieFixture().journal };

    await whenRendering();

    thenTextContains('anomalie-adresse-obsolete', 'annulé ou remplacé');
    thenAbsent('anomalie-resolution');
  });

  it('should explain that the addressed pointage no longer carries an anomaly', async () => {
    read.result = { kind: 'SANS_ANOMALIE', journal: dossierAnomalieFixture().journal };

    await whenRendering();

    thenTextContains('anomalie-adresse-obsolete', 'ne relève plus d’une anomalie');
    thenAbsent('anomalie-resolution');
  });

  it('should say that the workshop is open on a dossier whose follow-up is not closed', async () => {
    givenAnAutomaticEndWithAResolutionView();

    await whenRendering();

    thenTextContains('anomalie-cloture', 'Ouvert');
  });

  it('should present unresolved references in the dossier heading without any identity', async () => {
    const dossier = dossierDeResolutionFixture();
    read.result = {
      kind: 'DOSSIER',
      dossier: { ...dossier, ligne: { ...dossier.ligne, operateur: '', poste: '', posteId: 'poste-absent' } },
    };

    await whenRendering();

    thenHeadingContains('Opérateur non résolu · Poste non résolu');
    thenHeadingDoesNotContain('poste-absent');
  });

  it('should distinguish a missing workstation from an unresolved workstation in the heading', async () => {
    const dossier = dossierDeResolutionFixture();
    read.result = { kind: 'DOSSIER', dossier: { ...dossier, ligne: { ...dossier.ligne, poste: '' } } };

    await whenRendering();

    thenHeadingContains('Camille Martin · Sans poste · lundi 14 septembre à 17:00');
  });

  it('should present an automatic end as an anomaly of pointage and never as a conflict', async () => {
    givenAnAutomaticEndWithAResolutionView();

    await whenRendering();

    thenHeadingOfThePageIs('Dossier d’anomalie de pointage');
    thenTextContains('anomalie-retour', 'Retour aux anomalies');
    thenTheProblemReads('Le travail démarré à 08:00 n’a jamais été arrêté : fin automatique à 21:00.');
    thenPageDoesNotMention('conflit');
  });

  it('should keep the closure of the workshop visible on an automatic end', async () => {
    const dossier = dossierDeResolutionFixture();
    read.result = {
      kind: 'DOSSIER',
      dossier: { ...dossier, cloture: true, finCloture: instantLocalFixture(new Date(2026, 8, 14, 23, 0)) },
    };

    await whenRendering();

    thenTextContains('anomalie-cloture', 'lundi 14 septembre à 23:00');
  });

  describe('resolution view of an automatic end', () => {
    beforeEach(() => {
      HTMLElement.prototype.setPointerCapture = () => undefined;
      vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
      vi.setSystemTime(new Date(2026, 9, 5, 10, 0));
    });

    it('should open a resolution view when the dossier carries one regularisation of the end of the activity its address opens', async () => {
      givenAnAutomaticEndWithAResolutionView();

      await whenRendering();

      thenTheResolutionViewIsShown();
    });

    it('should say the problem and keep the link to the day of the operator', async () => {
      givenAnAutomaticEndWithAResolutionView();

      await whenRendering();

      thenTheProblemReads('Le travail démarré à 08:00 n’a jamais été arrêté : fin automatique à 21:00.');
      thenTextContains('anomalie-frise-journee', 'Voir la journée de Camille Martin');
    });

    it('should draw the frise read only, with the markers and the bars as images', async () => {
      givenAnAutomaticEndWithAResolutionView();

      await whenRendering();

      thenTheFriseIsReadOnly();
    });

    it('should leave the handle without hour, and tell how to place the end', async () => {
      givenAnAutomaticEndWithAResolutionView();

      await whenRendering();

      thenTheHandleHoldsNoHour();
      thenTextContains('anomalie-frise-aide', 'Tirez le bout de la barre ou cliquez dessus pour placer la fin réelle.');
    });

    it('should offer no field for the hour, the handle being the way to place the end', async () => {
      givenAnAutomaticEndWithAResolutionView();

      await whenRendering();

      thenTheResolutionViewOffersNoField();
    });

    it('should place the end at the automatic end with the first key pressed on the handle, then preview it', async () => {
      givenTheRegularisationOfTheEndWillBeAccepted();
      await whenRendering();

      await whenPressingOnTheHandle('ArrowLeft');
      await whenTheTypingPauses();

      thenTheHandleHoldsTheEndAt('21:00');
      thenThePreviewsWereAskedForTheHours(['21:00']);
    });

    it('should place the end at the start of the activity when Home is pressed on the hourless handle', async () => {
      givenTheRegularisationOfTheEndWillBeAccepted();
      await whenRendering();

      await whenPressingOnTheHandle('Home');

      thenTheHandleHoldsTheEndAt('08:00');
    });

    it('should place the end at the whole minute of the clock read at the key when End is pressed on the hourless handle', async () => {
      givenTheRegularisationOfTheEndWillBeAccepted();
      whenTheClockIs(new Date(2026, 8, 14, 22, 10, 30));
      await whenRendering();
      whenTheClockIs(new Date(2026, 8, 14, 22, 12, 10));

      await whenPressingOnTheHandle('End');

      thenTheHandleHoldsAt(new Date(2026, 8, 14, 22, 12));
    });

    it('should offer a validation that waits for the end', async () => {
      givenAnAutomaticEndWithAResolutionView();

      await whenRendering();

      thenDisabled('anomalie-resolution-valider');
      thenTextContains('anomalie-resolution-valider', 'Valider la fin');
    });

    it.each([
      'anomalie-selection',
      'anomalie-choix',
      'anomalie-action-directe',
      'anomalie-detail',
      'anomalie-regulariser',
      'anomalie-motif',
      'anomalie-instant-moins-5',
      'anomalie-instant-plus-5',
      'anomalie-previsualiser',
      'anomalie-champs-detail',
    ])('should not show %s of the full view', async selector => {
      givenAnAutomaticEndWithAResolutionView();

      await whenRendering();

      thenAbsent(selector);
    });

    it('should ask for no preview while the manager is still moving the handle', async () => {
      givenTheRegularisationOfTheEndWillBeAccepted();
      await whenRendering();

      await whenTakingTheHandleTo('17:00');

      thenNoPreviewWasAsked();
    });

    it('should preview the end once the keys paused, and say the outcome in one line', async () => {
      givenTheRegularisationOfTheEndWillBeAccepted();
      await whenRendering();

      await whenPlacingTheEndAt('17:00');

      thenTheOutcomeReads('Travail 13 h → 9 h · anomalie traitée');
      thenTextContains('anomalie-resolution-valider', 'Valider la fin à 17:00');
      thenEnabled('anomalie-resolution-valider');
      expect(preview.actes).toEqual([acteFinRegulariseeFixture('poste-1', '2026-09-14T17:00:00-03:00')]);
    });

    it('should preview again once the keys moving to another hour paused', async () => {
      givenTheRegularisationOfTheEndWillBeAccepted();
      await whenRendering();
      await whenPlacingTheEndAt('17:00');

      await whenPlacingTheEndAt('16:30');

      thenThePreviewsWereAskedForTheHours(['17:00', '16:30']);
    });

    it('should withdraw the outcome and the validation as soon as the hour changes', async () => {
      givenTheRegularisationOfTheEndWillBeAccepted();
      await whenRendering();
      await whenPlacingTheEndAt('17:00');

      await whenTakingTheHandleTo('16:30');

      thenAbsent('anomalie-resolution-apercu');
      thenDisabled('anomalie-resolution-valider');
    });

    it('should preview the hour a key moved the handle to once the key pressing paused', async () => {
      givenTheRegularisationOfTheEndWillBeAccepted();
      await whenRendering();
      await whenPlacingTheEndAt('17:00');

      await whenPressingOnTheHandle('ArrowRight');
      await whenTheTypingPauses();

      thenThePreviewsWereAskedForTheHours(['17:00', '17:01']);
    });

    it('should preview the hour a click on the bar placed once the clicking paused', async () => {
      givenTheRegularisationOfTheEndWillBeAccepted();
      await whenRendering();

      await whenClickingThePointagesRowAt(504);
      await whenTheTypingPauses();

      thenThePreviewsWereAskedForTheHours(['15:35']);
    });

    it('should not preview while the handle is dragged, however long the gesture lasts', async () => {
      givenTheRegularisationOfTheEndWillBeAccepted();
      await whenRendering();
      await whenPlacingTheEndAt('17:00');

      await whenDraggingTheHandleForAWhile({ from: 500, to: 400 });

      thenThePreviewsWereAskedForTheHours(['17:00']);
    });

    it('should preview as soon as the handle is released', async () => {
      givenTheRegularisationOfTheEndWillBeAccepted();
      await whenRendering();
      await whenPlacingTheEndAt('17:00');
      await whenDraggingTheHandle({ from: 500, to: 400 });

      await whenReleasingTheHandle();

      thenThePreviewsWereAskedForTheHours(['17:00', '15:20']);
    });

    it('should say nothing of the missing hour before the manager gives one', async () => {
      givenTheRegularisationOfTheEndWillBeAccepted();

      await whenRendering();

      thenTheEndValidationReads([]);
    });

    it('should show the refusal of the server under the frise and keep the hour', async () => {
      givenAnAutomaticEndWithAResolutionView();
      preview.result = { kind: 'REFUS', code: 'date-de-survenue-future' };
      await whenRendering();

      await whenPlacingTheEndAt('17:00');

      thenTextContains('anomalie-refus', 'La date et l’heure du fait ne peuvent pas être dans le futur.');
      thenTheRefusalComesAfterTheFrise();
      thenTheHandleHoldsTheEndAt('17:00');
      thenDisabled('anomalie-resolution-valider');
    });

    it('should offer to retry the preview after a network failure and preview again at once when asked', async () => {
      givenTheRegularisationOfTheEndWillBeAccepted();
      preview.failure = new Error('Réseau indisponible');
      await whenRendering();
      await whenPlacingTheEndAt('17:00');
      preview.failure = undefined;

      await whenClicking('anomalie-resolution-reessayer');

      thenTheOutcomeReads('Travail 13 h → 9 h · anomalie traitée');
      thenAbsent('anomalie-resolution-reessayer');
    });

    it('should offer no retry while the preview has not failed', async () => {
      givenTheRegularisationOfTheEndWillBeAccepted();
      await whenRendering();
      await whenPlacingTheEndAt('17:00');

      thenAbsent('anomalie-resolution-reessayer');
    });

    it('should reread the dossier after a concurrent preview and preview again by itself', async () => {
      givenTheRegularisationOfTheEndWillBeAcceptedOnceTheDossierIsReread();
      await whenRendering();
      givenTheDossierWillBeRereadWithAnotherVersion();

      await whenPlacingTheEndAt('17:00');

      expect(read.demandes).toHaveLength(2);
      thenThePreviewsWereAskedForTheHours(['17:00', '17:00']);
      thenTheOutcomeReads('Travail 13 h → 9 h · anomalie traitée');
      thenEnabled('anomalie-resolution-valider');
    });

    it('should keep the handle usable while the preview is on its way', async () => {
      givenTheRegularisationOfTheEndWillBeAccepted();
      const attente = new PendingResponseFixture<ResultatApercu>();
      preview.replies.pending = attente;
      await whenRendering();
      await whenTakingTheHandleTo('17:00');

      await whenThePreviewIsOnItsWay(attente);

      thenTextContains('anomalie-resolution-verification', 'Vérification des conséquences…');
      thenTheHandleStaysUsable();
    });

    it('should keep the focus where it is while the preview comes back', async () => {
      givenTheRegularisationOfTheEndWillBeAccepted();
      const attente = new PendingResponseFixture<ResultatApercu>();
      preview.replies.pending = attente;
      await whenRendering();
      await whenTakingTheHandleTo('17:00');
      whenFocusingTheHandle();
      await whenThePreviewIsOnItsWay(attente);

      await whenResponseArrives(attente, preview.result);

      thenTheFocusStaysOnTheHandle();
    });

    it('should keep the validation disabled while the preview is on its way', async () => {
      givenTheRegularisationOfTheEndWillBeAccepted();
      const attente = new PendingResponseFixture<ResultatApercu>();
      preview.replies.pending = attente;
      await whenRendering();
      await whenTakingTheHandleTo('17:00');

      await whenThePreviewIsOnItsWay(attente);

      thenDisabled('anomalie-resolution-valider');
    });

    it('should enable the validation once the preview has come back', async () => {
      givenTheRegularisationOfTheEndWillBeAccepted();
      const attente = new PendingResponseFixture<ResultatApercu>();
      preview.replies.pending = attente;
      await whenRendering();
      await whenTakingTheHandleTo('17:00');
      await whenThePreviewIsOnItsWay(attente);

      await whenResponseArrives(attente, preview.result);

      thenEnabled('anomalie-resolution-valider');
      thenAbsent('anomalie-resolution-verification');
    });

    it('should neither preview nor keep a pending preview when the address changes before the keys paused', async () => {
      givenTheRegularisationOfTheEndWillBeAccepted();
      await whenRendering();
      await whenTakingTheHandleTo('17:00');
      read.result = { kind: 'DOSSIER', dossier: dossierAnomalieFixture() };

      await whenAddressChanges('fin-18');
      await whenTheTypingPauses();

      thenNoPreviewWasAsked();
    });

    it('should fold the detail of the preview, and unfold the consequences and the journals without any reason', async () => {
      givenTheRegularisationOfTheEndWillBeAcceptedWithConsequences();
      await whenRendering();
      await whenPlacingTheEndAt('17:00');

      thenTheDetailIsFolded();
      thenTheDetailReads('Durée du travail recalculée', 'Pointage annulé');
      thenTheDetailGivesNoReason('Erreur de saisie');
    });

    it('should record the end from the resolution view and keep the link to the day of the operator beside the receipt', async () => {
      givenTheRegularisationOfTheEndWillBeAccepted();
      await whenRendering();
      await whenPlacingTheEndAt('17:00');

      await whenValidatingTheEnd();

      thenAbsent('anomalie-resolution-valider');
      thenTextContains('anomalie-frise-journee', 'Voir la journée de Camille Martin');
    });

    it('should draw no handle on the frise once the end is recorded', async () => {
      givenTheRegularisationOfTheEndWillBeAccepted();
      await whenRendering();
      await whenPlacingTheEndAt('17:00');

      await whenValidatingTheEnd();

      thenAbsent('anomalie-poignee');
    });

    it('should reread the dossier after an obsolete confirmation and preview the same hour again by itself', async () => {
      givenTheRegularisationOfTheEndWillBeAccepted();
      application.result = { kind: 'CONCURRENCE' };
      await whenRendering();
      await whenPlacingTheEndAt('17:00');
      givenTheDossierWillBeRereadWithAnotherVersion();
      preview.result = apercuDeLaRegularisationFixture(dossierRelu(), dossierRegulariseFixture());

      await whenValidatingTheEnd();

      expect(read.demandes).toHaveLength(2);
      thenThePreviewsWereAskedForTheHours(['17:00', '17:00']);
      thenTheHandleHoldsTheEndAt('17:00');
      thenEnabled('anomalie-resolution-valider');
    });

    it('should show the refusal of the confirmation and keep the hour', async () => {
      givenTheRegularisationOfTheEndWillBeAccepted();
      application.result = { kind: 'REFUS', code: 'suivi-d-atelier-cloture' };
      await whenRendering();
      await whenPlacingTheEndAt('17:00');

      await whenValidatingTheEnd();

      thenTextContains('anomalie-refus', 'Ce suivi d’atelier est clôturé : il n’accepte plus de décision.');
      thenTheHandleHoldsTheEndAt('17:00');
    });

    it('should block the end while the outcome of the confirmation is unknown, and offer to check or resume', async () => {
      givenTheRegularisationOfTheEndWillBeAccepted();
      application.result = { kind: 'ISSUE_INCONNUE' };
      await whenRendering();
      await whenPlacingTheEndAt('17:00');

      await whenValidatingTheEnd();

      thenTheHandleIsLocked();
      thenDisabled('anomalie-resolution-valider');
      expect(present('anomalie-verifier') && present('anomalie-reprendre-confirmation')).toBe(true);
    });

    it('should show the receipt once the verification attests the end', async () => {
      givenTheRegularisationOfTheEndWillBeAccepted();
      application.result = { kind: 'ISSUE_INCONNUE' };
      application.verification = { kind: 'ATTESTE', dossier: dossierRegulariseFixture() };
      await whenRendering();
      await whenPlacingTheEndAt('17:00');
      await whenValidatingTheEnd();

      await whenClicking('anomalie-verifier');

      thenTheResolutionViewShowsTheReceipt();
    });

    it('should show the receipt once the same confirmation is resumed', async () => {
      givenTheRegularisationOfTheEndWillBeAccepted();
      application.result = { kind: 'ISSUE_INCONNUE' };
      await whenRendering();
      await whenPlacingTheEndAt('17:00');
      await whenValidatingTheEnd();
      application.result = { kind: 'APPLIQUE', dossier: dossierRegulariseFixture() };

      await whenClicking('anomalie-reprendre-confirmation');

      thenTheResolutionViewShowsTheReceipt();
    });

    it('should link the other automatic end of the element to its own address', async () => {
      givenAResolutionViewBesideExpiredActivities(['debut-14']);

      await whenRendering();

      thenTextContains('anomalie-resolution-autre-fin', '1 autre fin automatique sur cet élément');
      thenTheLinkTargets('anomalie-resolution-autre-fin', '/anomalies/suivi-camille', { pointage: 'debut-14' });
    });

    it('should say the number of the other automatic ends and lead to the first of them', async () => {
      givenAResolutionViewBesideExpiredActivities(['debut-14', 'debut-15']);

      await whenRendering();

      thenTextContains('anomalie-resolution-autre-fin', '2 autres fins automatiques sur cet élément');
      thenTheLinkTargets('anomalie-resolution-autre-fin', '/anomalies/suivi-camille', { pointage: 'debut-14' });
    });

    it('should draw the other automatic ends on the frise without offering to regularise them', async () => {
      givenAResolutionViewBesideExpiredActivities(['debut-14']);

      await whenRendering();

      expect(friseElements('anomalie-activite').map(barre => barre.dataset['activite'])).toEqual(['travail-8', 'travail-debut-14']);
    });

    it('should say nothing of other automatic ends when the dossier holds none', async () => {
      givenAnAutomaticEndWithAResolutionView();

      await whenRendering();

      thenAbsent('anomalie-resolution-autre-fin');
    });

    it('should show that the pointage no longer is an anomaly when the dossier reread after a concurrent preview says so, and preview no more', async () => {
      givenTheRegularisationOfTheEndWillBeAcceptedOnceTheDossierIsReread();
      await whenRendering();
      read.followingResults.push({ kind: 'SANS_ANOMALIE', journal: [] });

      await whenPlacingTheEndAt('17:00');

      thenTextContains('anomalie-adresse-obsolete', 'Ce pointage ne relève plus d’une anomalie.');
      thenThePreviewsWereAskedForTheHours(['17:00']);
    });

    it('should offer to read the dossier again when it cannot be reread after a concurrent preview', async () => {
      givenTheRegularisationOfTheEndWillBeAcceptedOnceTheDossierIsReread();
      await whenRendering();
      givenTheDossierCannotBeReread();

      await whenPlacingTheEndAt('17:00');

      thenTextContains('anomalie-retry', 'Réessayer');
      thenAbsent('anomalie-resolution');
    });

    it('should come back to a fresh resolution view once the dossier is read again', async () => {
      givenTheRegularisationOfTheEndWillBeAcceptedOnceTheDossierIsReread();
      await whenRendering();
      givenTheDossierCannotBeReread();
      await whenPlacingTheEndAt('17:00');
      givenTheDossierCanBeReadAgain();

      await whenClicking('anomalie-retry');

      thenTheResolutionViewIsShown();
      thenTheHandleHoldsNoHour();
    });

    it('should show the resolution view of a regularisation whose journal holds a pointage that stands on no bar', async () => {
      read.result = { kind: 'DOSSIER', dossier: dossierAuPointageAnnuleFixture() };

      await whenRendering();

      thenTheResolutionViewIsShown();
      thenTheHandleHoldsNoHour();
    });

    it('should show no resolution view for a choice that carries no code', async () => {
      const dossier = dossierDeResolutionFixture();
      read.result = {
        kind: 'DOSSIER',
        dossier: { ...dossier, choix: [{ id: 'sans-code', libelle: 'Régulariser', explication: '', saisie: finARegulariserFixture() }] },
      };

      await whenRendering();

      thenNoResolutionViewIsShown();
    });

    it('should not preview again when the handle is pressed and released without moving', async () => {
      givenTheRegularisationOfTheEndWillBeAccepted();
      await whenRendering();
      await whenPlacingTheEndAt('17:00');

      await whenPressingAndReleasingTheHandleWithoutMoving();

      thenThePreviewsWereAskedForTheHours(['17:00']);
    });

    it('should offer to read the dossier again when it cannot be reread after an obsolete confirmation', async () => {
      givenTheRegularisationOfTheEndWillBeAccepted();
      application.result = { kind: 'CONCURRENCE' };
      await whenRendering();
      await whenPlacingTheEndAt('17:00');
      read.failure = new Error('Dossier courant indisponible');

      await whenValidatingTheEnd();

      thenTextContains('anomalie-retry', 'Réessayer');
      thenThePreviewsWereAskedForTheHours(['17:00']);
    });

    it('should show no resolution view when a conflict choice comes beside the regularisation of the end', async () => {
      givenAnAutomaticEndWithAResolutionView();
      const dossier = dossierDeResolutionFixture();
      read.result = {
        kind: 'DOSSIER',
        dossier: {
          ...dossier,
          choix: [
            ...dossier.choix,
            {
              id: 'ANNULER_TRANSITION:nc-12',
              code: 'ANNULER_TRANSITION',
              libelle: '',
              explication: '',
              saisie: SaisieActe.cancel('nc-12'),
            },
          ],
        },
      };

      await whenRendering();

      thenNoResolutionViewIsShown();
    });

    it('should show no resolution view when none exists for the code of the choice', async () => {
      read.result = {
        kind: 'DOSSIER',
        dossier: {
          ...dossierDeResolutionFixture(),
          choix: [
            {
              id: 'RATTACHER_FIN_A_ACTIVITE_REMPLACANTE:fin-23',
              code: 'RATTACHER_FIN_A_ACTIVITE_REMPLACANTE',
              libelle: '',
              explication: '',
              saisie: SaisieActe.correct('fin-23', faitFinTardiveFixture()),
            },
          ],
        },
      };

      await whenRendering();

      thenNoResolutionViewIsShown();
    });

    it('should keep the resolution view when the receipt replaces the dossier by one that carries no choice', async () => {
      givenTheRegularisationOfTheEndWillBeAccepted();
      await whenRendering();
      await whenPlacingTheEndAt('17:00');

      await whenValidatingTheEnd();

      thenTheResolutionViewShowsTheReceipt();
    });

    it('should link no automatic end in the receipt of an automatic end that is still the one the manager is on', async () => {
      givenAnAutomaticEndStillExpiredAfterItsRegularisation();
      await whenRendering();
      await whenPlacingTheEndAt('17:00');

      await whenValidatingTheEnd();

      thenTextContains('anomalie-resultat', 'Acte enregistré, anomalie restante');
      thenAbsent('anomalie-fin-automatique-restante');
    });

    it('should link the automatic end still remaining in the receipt, keeping the way back to the list', async () => {
      givenAnotherAutomaticEndRemainingAfterTheRegularisation();
      givenTheAddressComesFromTheList();
      await whenRendering();
      await whenPlacingTheEndAt('17:00');

      await whenValidatingTheEnd();

      thenTextContains('anomalie-fin-automatique-restante', 'Traiter la fin automatique restante');
      thenTheLinkTargets('anomalie-fin-automatique-restante', '/anomalies/suivi-camille', { ...QUERY_DE_LA_LISTE, pointage: 'debut-10' });
    });

    it('should number the links when several automatic ends remain in the receipt', async () => {
      givenAnotherAutomaticEndRemainingAfterTheRegularisation(['debut-10', 'debut-11']);
      await whenRendering();
      await whenPlacingTheEndAt('17:00');

      await whenValidatingTheEnd();

      expect(texts('anomalie-fin-automatique-restante')).toEqual([
        'Traiter la fin automatique restante (1 sur 2)',
        'Traiter la fin automatique restante (2 sur 2)',
      ]);
    });

    it('should offer no next anomaly before the end is validated', async () => {
      givenTheRegularisationOfTheEndWillBeAccepted();
      await whenRendering();

      await whenPlacingTheEndAt('17:00');

      thenAbsent('anomalie-resolution-suivante');
    });

    it('should offer the next anomaly with the receipt', async () => {
      givenTheRegularisationOfTheEndWillBeAccepted();
      await whenRendering();
      await whenPlacingTheEndAt('17:00');

      await whenValidatingTheEnd();

      thenTextContains('anomalie-resolution-suivante', 'Anomalie suivante');
    });

    it('should lead to the automatic end still remaining on the dossier, keeping the way back to the list', async () => {
      givenAnotherAutomaticEndRemainingAfterTheRegularisation();
      givenTheAddressComesFromTheList();
      await whenRendering();
      await whenPlacingTheEndAt('17:00');
      await whenValidatingTheEnd();

      await whenAskingForTheNextAnomaly();

      thenTheManagerIsLedTo(['/anomalies', 'suivi-camille'], { ...QUERY_DE_LA_LISTE, pointage: 'debut-10' });
      expect(read.listesDemandees).toEqual([]);
    });

    it('should lead to another row of the list read with the filters of the address when no automatic end remains', async () => {
      givenTheRegularisationOfTheEndWillBeAccepted();
      givenTheAddressComesFromTheList();
      read.lignesDeLaListe = [uneLigneDeLaListe('suivi-autre', 'debut-12')];
      await whenRendering();
      await whenPlacingTheEndAt('17:00');
      await whenValidatingTheEnd();

      await whenAskingForTheNextAnomaly();

      thenTheListWasReadFor({ nature: 'FIN_AUTOMATIQUE', operateur: 'op-1', element: 'el-1', page: 2 });
      thenTheManagerIsLedTo(['/anomalies', 'suivi-autre'], { ...QUERY_DE_LA_LISTE, pointage: 'debut-12' });
    });

    it('should lead back to the list saying that no anomaly is left when the list holds no other row', async () => {
      givenTheRegularisationOfTheEndWillBeAccepted();
      givenTheAddressComesFromTheList();
      await whenRendering();
      await whenPlacingTheEndAt('17:00');
      await whenValidatingTheEnd();

      await whenAskingForTheNextAnomaly();

      thenTheManagerIsLedTo(['/anomalies'], { ...QUERY_DE_LA_LISTE, page: null, plusAucune: '1' });
    });

    it('should lead back to the list, without that message, when the list cannot be read', async () => {
      givenTheRegularisationOfTheEndWillBeAccepted();
      givenTheAddressComesFromTheList();
      read.listFailure = new Error('lecture impossible');
      await whenRendering();
      await whenPlacingTheEndAt('17:00');
      await whenValidatingTheEnd();

      await whenAskingForTheNextAnomaly();

      thenTheManagerIsLedTo(['/anomalies'], QUERY_DE_LA_LISTE);
    });

    it('should choose the view again when the address changes', async () => {
      givenAnAutomaticEndWithAResolutionView();
      await whenRendering();
      read.result = { kind: 'DOSSIER', dossier: dossierAnomalieFixture() };

      await whenAddressChanges('fin-18');

      thenNoResolutionViewIsShown();
    });
  });

  describe('resolution view of a pointage pointed after the deadline', () => {
    const MOTIF_FIN_TARDIVE = 'Arrêt pointé après l’échéance : heure vérifiée en gestion';
    const MOTIF_PASSAGE_TARDIF = 'Passage pointé après l’échéance : heure vérifiée en gestion';

    interface CorrectionTardiveFixture {
      readonly code: 'CORRIGER_FIN_TARDIVE' | 'CORRIGER_TRANSITION_TARDIVE';
      readonly type: FaitPropose['type'];
      readonly intention: FaitPropose['intention'];
      readonly motif: string;
      readonly bouton: string;
      readonly ligne?: string;
    }

    const FIN_TARDIVE: CorrectionTardiveFixture = {
      code: 'CORRIGER_FIN_TARDIVE',
      type: 'FIN',
      intention: 'FIN',
      motif: MOTIF_FIN_TARDIVE,
      bouton: 'Valider la fin à',
    };
    const PASSAGE_EN_NC_TARDIF: CorrectionTardiveFixture = {
      code: 'CORRIGER_TRANSITION_TARDIVE',
      type: 'NON_CONFORMITE',
      intention: 'TRANSITION',
      motif: MOTIF_PASSAGE_TARDIF,
      bouton: 'Valider le passage à',
      ligne: 'La non-conformité commencera à cette heure.',
    };
    const RETOUR_EN_BON_TARDIF: CorrectionTardiveFixture = {
      code: 'CORRIGER_TRANSITION_TARDIVE',
      type: 'DEBUT',
      intention: 'TRANSITION',
      motif: MOTIF_PASSAGE_TARDIF,
      bouton: 'Valider le passage à',
      ligne: 'Le travail reprendra à cette heure.',
    };

    beforeEach(() => {
      HTMLElement.prototype.setPointerCapture = () => undefined;
      vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
      vi.setSystemTime(new Date(2026, 9, 5, 10, 0));
    });

    const faitTardifFixture = (cas: CorrectionTardiveFixture, instant = INSTANT_FIN_TARDIVE): FaitPropose => ({
      ...faitFinTardiveFixture(instant),
      type: cas.type,
      intention: cas.intention,
    });

    const actePourLaCorrectionTardiveFixture = (cas: CorrectionTardiveFixture, instant = INSTANT_FIN_TARDIVE): ActeResolution => ({
      kind: 'CORRECTION',
      pointage: 'fin-23',
      motif: cas.motif,
      fait: faitTardifFixture(cas, instant),
    });

    const dossierAvecUneCorrectionTardiveFixture = (cas: CorrectionTardiveFixture): DossierAnomalie => {
      const dossier = dossierFinTardiveFixture();
      const adresse = { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('debut-8') };
      return {
        ...dossier,
        ligne: { ...dossier.ligne, adresse },
        journal: dossier.journal.map(pointage =>
          pointage.id.pointage === 'fin-23' ? { ...pointage, fait: faitTardifFixture(cas) } : pointage,
        ),
        choix: [
          {
            id: `${cas.code}:fin-23`,
            code: cas.code,
            libelle: '',
            explication: '',
            saisie: SaisieActe.correct('fin-23', faitTardifFixture(cas)),
          },
        ],
      };
    };

    const dossierApresLaCorrectionTardiveFixture = (cas: CorrectionTardiveFixture): DossierAnomalie => {
      const avant = dossierAvecUneCorrectionTardiveFixture(cas);
      const activite = requiredFixture(avant.activites[0], 'automatic end activity');
      const periode = requiredFixture(activite.periode, 'automatic end period');
      return {
        ...avant,
        etat: 'SANS_ANOMALIE',
        finAutomatique: false,
        version: 2,
        choix: [],
        activites: [{ ...activite, etat: 'TERMINEE', periode: { ...periode, fin: INSTANT_FIN_TARDIVE, duree: 'PT15H' } }],
      };
    };

    const givenALateCorrectionWillBeAccepted = (cas: CorrectionTardiveFixture): void => {
      const avant = dossierAvecUneCorrectionTardiveFixture(cas);
      const apres = dossierApresLaCorrectionTardiveFixture(cas);
      read.result = { kind: 'DOSSIER', dossier: avant };
      givenASuccessfulPreview(apres, actePourLaCorrectionTardiveFixture(cas), avant);
      application.result = { kind: 'APPLIQUE', dossier: apres };
    };

    it('should open the resolution view of a late end with its received hour on the handle and on the button', async () => {
      givenALateCorrectionWillBeAccepted(FIN_TARDIVE);

      await whenRendering();

      thenTheResolutionViewIsShown();
      thenTheHandleHoldsTheEndAt('23:00');
      thenTextContains('anomalie-resolution-valider', 'Valider la fin à 23:00');
    });

    it.each([FIN_TARDIVE, PASSAGE_EN_NC_TARDIF, RETOUR_EN_BON_TARDIF])(
      'should preview the correction by itself at the opening, with the fixed reason, and enable the validation ($code $type)',
      async cas => {
        givenALateCorrectionWillBeAccepted(cas);

        await whenRendering();
        await whenThePreviewOfTheOpeningArrives();

        expect(preview.actes).toEqual([actePourLaCorrectionTardiveFixture(cas)]);
        thenTheOutcomeReads('Travail 13 h → 15 h · anomalie traitée');
        thenEnabled('anomalie-resolution-valider');
      },
    );

    it.each([FIN_TARDIVE, PASSAGE_EN_NC_TARDIF, RETOUR_EN_BON_TARDIF])(
      'should label the button "$bouton 23:00" ($code $type)',
      async cas => {
        givenALateCorrectionWillBeAccepted(cas);

        await whenRendering();

        thenTextContains('anomalie-resolution-valider', `${cas.bouton} 23:00`);
      },
    );

    it.each([PASSAGE_EN_NC_TARDIF, RETOUR_EN_BON_TARDIF])('should say what the hour of the passage starts ($type)', async cas => {
      givenALateCorrectionWillBeAccepted(cas);

      await whenRendering();

      thenTextContains('anomalie-resolution-activite-ouverte', cas.ligne ?? '');
    });

    it('should say nothing of an open activity for the end of an activity', async () => {
      givenALateCorrectionWillBeAccepted(FIN_TARDIVE);

      await whenRendering();

      thenAbsent('anomalie-resolution-activite-ouverte');
    });

    it.each([FIN_TARDIVE, PASSAGE_EN_NC_TARDIF])('should show no reason anywhere, though the preview carries one ($code)', async cas => {
      givenALateCorrectionWillBeAccepted(cas);
      await whenRendering();
      await whenThePreviewOfTheOpeningArrives();

      thenAbsent('anomalie-motif');
      thenNoTextOfTheViewContains(cas.motif);
      thenNoTextOfTheViewContains('Erreur de saisie');
    });

    it('should hide the reason of the cancelled pointage in the detail of the preview', async () => {
      givenALateCorrectionWillBeAcceptedWithACancelledPointage(FIN_TARDIVE);
      await whenRendering();
      await whenThePreviewOfTheOpeningArrives();

      thenTheDetailReads('Pointage annulé');
      thenTheDetailGivesNoReason('Erreur de saisie');
    });

    it('should preview the new hour with the same fixed reason once the manager moved it', async () => {
      givenALateCorrectionWillBeAccepted(FIN_TARDIVE);
      await whenRendering();
      await whenThePreviewOfTheOpeningArrives();

      await whenPlacingTheEndAt('22:30');

      expect(preview.actes).toEqual([
        actePourLaCorrectionTardiveFixture(FIN_TARDIVE),
        expect.objectContaining({ kind: 'CORRECTION', motif: MOTIF_FIN_TARDIVE }),
      ]);
      thenThePreviewsWereAskedForTheHours(['23:00', '22:30']);
      thenTextContains('anomalie-resolution-valider', 'Valider la fin à 22:30');
    });

    it('should say why and preview nothing when the received hour lies after the clock', async () => {
      givenALateCorrectionWillBeAccepted(FIN_TARDIVE);
      whenTheClockIs(new Date(2026, 8, 14, 22, 0));

      await whenRendering();
      await whenThePreviewOfTheOpeningArrives();

      thenTheEndValidationReads(['La date et l’heure du fait ne peuvent pas être dans le futur.']);
      thenNoPreviewWasAsked();
      thenDisabled('anomalie-resolution-valider');
    });

    it('should keep the validation disabled until the preview of the opening comes back', async () => {
      givenALateCorrectionWillBeAccepted(FIN_TARDIVE);
      const attente = new PendingResponseFixture<ResultatApercu>();
      preview.replies.pending = attente;

      await whenRendering();
      await attente.arrival;

      thenDisabled('anomalie-resolution-valider');
      thenTheHandleStaysUsable();
    });

    it('should offer to retry the preview of the opening after a network failure', async () => {
      givenALateCorrectionWillBeAccepted(FIN_TARDIVE);
      preview.failure = new Error('Réseau indisponible');
      await whenRendering();
      await whenThePreviewOfTheOpeningArrives();
      preview.failure = undefined;

      await whenClicking('anomalie-resolution-reessayer');

      thenTheOutcomeReads('Travail 13 h → 15 h · anomalie traitée');
    });

    it('should record the correction with the fixed reason and show the receipt', async () => {
      givenALateCorrectionWillBeAccepted(PASSAGE_EN_NC_TARDIF);
      await whenRendering();
      await whenThePreviewOfTheOpeningArrives();

      await whenValidatingTheEnd();

      thenTheResolutionViewShowsTheReceipt();
    });

    it('should show no resolution view when the address does not open the activity the correction ends', async () => {
      read.result = { kind: 'DOSSIER', dossier: dossierFinTardiveFixture() };

      await whenRendering();

      thenNoResolutionViewIsShown();
    });

    const whenThePreviewOfTheOpeningArrives = async (): Promise<void> => {
      await new Promise<void>(resolve => realSetTimeout(resolve));
      await Promise.allSettled(preview.replies.automaticResponses);
      await fixture.whenStable();
    };

    const givenALateCorrectionWillBeAcceptedWithACancelledPointage = (cas: CorrectionTardiveFixture): void => {
      givenALateCorrectionWillBeAccepted(cas);
      if (preview.result.kind !== 'APERCU') throw new Error('Expected a successful preview.');
      const apercu = preview.result.apercu;
      const pointage = requiredFixture(apercu.apres.journal[0], 'journal fixture pointage');
      preview.result = {
        kind: 'APERCU',
        apercu: {
          ...apercu,
          apres: {
            ...apercu.apres,
            journal: [
              ...apercu.apres.journal,
              {
                ...pointage,
                id: new PointageAnomalieId('annule-9'),
                annulation: { motif: 'Erreur de saisie', auteur: 'camille', instant: INSTANT_ENREGISTREMENT },
              },
            ],
          },
        },
      };
    };

    const thenNoTextOfTheViewContains = (texte: string): void => {
      expect((fixture.nativeElement as HTMLElement).textContent.replace(/\s+/g, ' ')).not.toContain(texte);
    };
  });

  it('should explain the loading of a dossier without calling it a conflict', () => {
    givenTheDossierIsStillLoading();

    whenRenderingWithoutWaiting();

    thenTextContains('anomalie-chargement', 'Chargement du dossier…');
  });

  const dossierDeResolutionFixture = (): DossierAnomalie => {
    const dossier = dossierFinAutomatiqueFixture();
    const adresse = { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('debut-8') };
    return { ...dossier, ligne: { ...dossier.ligne, adresse } };
  };

  const dossierRegulariseFixture = (): DossierAnomalie => {
    const dossier = dossierDeResolutionFixture();
    const activite = requiredFixture(dossier.activites[0], 'automatic end activity');
    const periode = requiredFixture(activite.periode, 'automatic end period');
    return {
      ...dossier,
      etat: 'SANS_ANOMALIE',
      finAutomatique: false,
      version: 2,
      choix: [],
      activites: [{ ...activite, etat: 'TERMINEE', periode: { ...periode, fin: INSTANT_FIN_DE_TRAVAIL, duree: 'PT9H' } }],
    };
  };

  const dossierAuPointageAnnuleFixture = (): DossierAnomalie => {
    const dossier = dossierDeResolutionFixture();
    const ouvrant = requiredFixture(dossier.journal[0], 'opening pointage');
    const annule: PointageAnomalie = {
      ...ouvrant,
      id: new PointageAnomalieId('debut-annule-7'),
      annulation: { motif: 'Erreur de saisie', auteur: 'camille', instant: INSTANT_ENREGISTREMENT },
    };
    const journal = [...dossier.journal, annule];
    return { ...dossier, journal, perimetre: new PerimetreDuDossier(journal.map(pointage => pointage.id)) };
  };

  const givenAnAutomaticEndWithAResolutionView = (): void => {
    read.result = { kind: 'DOSSIER', dossier: dossierDeResolutionFixture() };
  };

  const givenTheRegularisationOfTheEndWillBeAccepted = (): void => {
    givenAnAutomaticEndWithAResolutionView();
    const apres = dossierRegulariseFixture();
    givenASuccessfulPreview(apres, acteFinRegulariseeFixture('poste-1', '2026-09-14T17:00:00-03:00'), dossierDeResolutionFixture());
    application.result = { kind: 'APPLIQUE', dossier: apres };
  };

  const minutesFromTheHandleTo = (heure: string): number => {
    const cible = new Date(2026, 8, 14, Number(heure.slice(0, 2)), Number(heure.slice(3))).getTime();
    return (cible - Number(element('anomalie-poignee').getAttribute('aria-valuenow'))) / 60_000;
  };

  const whenTakingTheHandleTo = async (heure: string): Promise<void> => {
    if (element('anomalie-poignee').hasAttribute('data-sans-heure')) await whenPressingOnTheHandle('ArrowLeft');
    for (let ecart = minutesFromTheHandleTo(heure); ecart !== 0; ecart = minutesFromTheHandleTo(heure)) {
      await whenPressingOnTheHandle(ecart > 0 ? 'ArrowRight' : 'ArrowLeft', Math.abs(ecart) >= 15);
      if (minutesFromTheHandleTo(heure) === ecart) throw new Error(`The handle cannot reach ${heure}: it stays ${ecart} minutes away.`);
    }
  };

  const whenPlacingTheEndAt = async (heure: string): Promise<void> => {
    await whenTakingTheHandleTo(heure);
    await whenTheTypingPauses();
  };

  const whenTheTypingPauses = async (): Promise<void> => {
    await vi.advanceTimersByTimeAsync(400);
    await fixture.whenStable();
  };

  const QUERY_DE_LA_LISTE = { nature: 'FIN_AUTOMATIQUE', operateur: 'op-1', element: 'el-1', page: '2' };

  const givenTheAddressComesFromTheList = (): void => {
    route.queryParamMap.next(convertToParamMap({ pointage: 'debut-8', ...QUERY_DE_LA_LISTE }));
  };

  const givenAnotherAutomaticEndRemainingAfterTheRegularisation = (ouvrants: readonly string[] = ['debut-10']): void => {
    givenTheRegularisationOfTheEndWillBeAccepted();
    const apres = dossierRegulariseFixture();
    const modele = requiredFixture(dossierDeResolutionFixture().activites[0], 'automatic end activity');
    const autres: readonly ActiviteAnomalie[] = ouvrants.map(ouvrant => ({
      ...modele,
      id: new ActiviteAnomalieId(`travail-${ouvrant}`),
      ouvrant: new PointageAnomalieId(ouvrant),
    }));
    application.result = { kind: 'APPLIQUE', dossier: { ...apres, finAutomatique: true, activites: [...apres.activites, ...autres] } };
  };

  const uneLigneDeLaListe = (suivi: string, pointage: string): LigneFinAutomatique => ({
    adresse: { suivi: new SuiviAnomalieId(suivi), pointage: new PointageAnomalieId(pointage) },
    element: new ElementAnomalieId('moule-42'),
    designation: 'M-042',
    operateur: 'Camille Martin',
    poste: 'DMU 50',
    debut: INSTANT_DEBUT,
    echeance: INSTANT_ECHEANCE,
  });

  const whenAskingForTheNextAnomaly = async (): Promise<void> => {
    await whenClicking('anomalie-resolution-suivante');
    await fixture.whenStable();
  };

  const thenTheListWasReadFor = (filtre: FiltreAnomalies): void => {
    expect(read.listesDemandees).toEqual([filtre]);
  };

  const thenTheManagerIsLedTo = (commands: readonly unknown[], queryParams: Record<string, string | null>): void => {
    expect(router.navigations).toEqual([{ commands, queryParams }]);
  };

  const whenValidatingTheEnd = async (): Promise<void> => {
    await whenClicking('anomalie-resolution-valider');
  };

  const thenTheResolutionViewOffersNoField = (): void => {
    expect(element('anomalie-resolution').querySelector('input')).toBeNull();
  };

  const thenTheHandleHoldsTheEndAt = (heure: string): void => {
    thenTheHandleHoldsAt(new Date(2026, 8, 14, Number(heure.slice(0, 2)), Number(heure.slice(3))));
  };

  const thenTheFriseIsReadOnly = (): void => {
    expect(friseElements('anomalie-activite').map(barre => barre.getAttribute('role'))).toEqual(['img']);
    expect(friseElements('anomalie-pointage').map(repere => repere.getAttribute('role'))).toEqual(['img']);
  };

  const thenNoPreviewWasAsked = (): void => {
    expect(preview.actes).toEqual([]);
  };

  const thenTheOutcomeReads = (expected: string): void => {
    expect(element('anomalie-resolution-apercu').textContent.replace(/\s+/g, ' ').trim()).toBe(expected);
  };

  const thenThePreviewsWereAskedForTheHours = (expected: readonly string[]): void => {
    expect(preview.actes.map(acte => (acte.kind === 'ANNULATION' ? '' : new Date(acte.fait.instant)).toString())).toEqual(
      expected.map(heure => new Date(2026, 8, 14, Number(heure.slice(0, 2)), Number(heure.slice(3))).toString()),
    );
  };

  const whenDraggingTheHandle = async ({ from, to }: { from: number; to: number }): Promise<void> => {
    friseElements('anomalie-frise-plan').forEach(plan => {
      plan.getBoundingClientRect = () => new DOMRect(0, 0, 1000, 200);
    });
    element('anomalie-poignee').dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: from, bubbles: true }));
    element('anomalie-poignee').dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: to, bubbles: true }));
    await fixture.whenStable();
  };

  const whenPressingAndReleasingTheHandleWithoutMoving = async (): Promise<void> => {
    friseElements('anomalie-frise-plan').forEach(plan => {
      plan.getBoundingClientRect = () => new DOMRect(0, 0, 1000, 200);
    });
    element('anomalie-poignee').dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 500, bubbles: true }));
    await whenReleasingTheHandle();
  };

  const whenReleasingTheHandle = async (): Promise<void> => {
    element('anomalie-poignee').dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, bubbles: true }));
    await Promise.allSettled(preview.replies.automaticResponses);
    await fixture.whenStable();
  };

  const apercuDeLaRegularisationFixture = (avant: DossierAnomalie, apres: DossierAnomalie): ResultatApercu => ({
    kind: 'APERCU',
    apercu: {
      empreinteConsequences: 'empreinte-1',
      evaluation: '2026-10-03T10:00:00Z',
      evenement: 'evenement-1',
      commande: 'commande-1',
      version: avant.version,
      adresse: avant.ligne.adresse,
      avant,
      apres,
      acte: acteFinRegulariseeFixture('poste-1', '2026-09-14T17:00:00-03:00'),
    },
  });

  const givenTheRegularisationOfTheEndWillBeAcceptedOnceTheDossierIsReread = (): void => {
    givenAnAutomaticEndWithAResolutionView();
    preview.followingResults.push({ kind: 'CONCURRENCE' });
    preview.result = apercuDeLaRegularisationFixture(dossierRelu(), { ...dossierRegulariseFixture(), version: 3 });
  };

  const dossierRelu = (): DossierAnomalie => ({ ...dossierDeResolutionFixture(), version: 2 });

  const givenTheDossierWillBeRereadWithAnotherVersion = (): void => {
    read.followingResults.push({ kind: 'DOSSIER', dossier: dossierRelu() });
  };

  const givenTheRegularisationOfTheEndWillBeAcceptedWithConsequences = (): void => {
    givenAnAutomaticEndWithAResolutionView();
    const apres = dossierRegulariseFixture();
    const pointage = requiredFixture(apres.journal[0], 'journal fixture pointage');
    preview.result = apercuDeLaRegularisationFixture(dossierDeResolutionFixture(), {
      ...apres,
      version: 1,
      consequences: ['Durée du travail recalculée'],
      journal: [
        ...apres.journal,
        {
          ...pointage,
          id: new PointageAnomalieId('annule-9'),
          annulation: { motif: 'Erreur de saisie', auteur: 'camille', instant: INSTANT_ENREGISTREMENT },
        },
      ],
    });
  };

  const thenTheRefusalComesAfterTheFrise = (): void => {
    expect(element('anomalie-frise').compareDocumentPosition(element('anomalie-refus')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(
      element('anomalie-refus').compareDocumentPosition(element('anomalie-resolution-valider')) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  };

  const thenTheEndValidationReads = (expected: readonly string[]): void => {
    const erreurs = [...element('anomalie-resolution-validation').querySelectorAll('li')];
    expect(erreurs.map(erreur => erreur.textContent.trim())).toEqual(expected);
  };

  const thenTheDetailIsFolded = (): void => {
    const detail = element('anomalie-resolution-detail');
    if (!(detail instanceof HTMLDetailsElement)) throw new Error('Expected a detail');
    expect(detail.open).toBe(false);
  };

  const thenTheDetailReads = (...expected: readonly string[]): void => {
    expected.forEach(texte => {
      expect(element('anomalie-resolution-detail').textContent).toContain(texte);
    });
  };

  const thenTheDetailGivesNoReason = (motif: string): void => {
    expect(element('anomalie-resolution-detail').textContent).not.toContain(motif);
  };

  const givenAResolutionViewBesideExpiredActivities = (ouvrants: readonly string[]): void => {
    const dossier = dossierDeResolutionFixture();
    const modele = requiredFixture(dossier.activites[0], 'automatic end activity');
    read.result = {
      kind: 'DOSSIER',
      dossier: {
        ...dossier,
        activites: [
          modele,
          ...ouvrants.map(ouvrant => ({
            ...modele,
            id: new ActiviteAnomalieId(`travail-${ouvrant}`),
            ouvrant: new PointageAnomalieId(ouvrant),
          })),
        ],
      },
    };
  };

  const givenTheDossierCannotBeReread = (): void => {
    read.followingResults.push({ kind: 'DOSSIER', dossier: dossierRelu() });
    read.failure = new Error('Dossier courant indisponible');
  };

  const givenTheDossierCanBeReadAgain = (): void => {
    read.failure = undefined;
  };

  const whenDraggingTheHandleForAWhile = async (geste: { from: number; to: number }): Promise<void> => {
    await whenDraggingTheHandle(geste);
    await vi.advanceTimersByTimeAsync(1000);
  };

  const whenThePreviewIsOnItsWay = async (attente: PendingResponseFixture<ResultatApercu>): Promise<void> => {
    await whenTheTypingPauses();
    await attente.arrival;
  };

  const whenFocusingTheHandle = (): void => {
    element('anomalie-poignee').focus();
  };

  const thenTheHandleStaysUsable = (): void => {
    expect(element('anomalie-poignee').getAttribute('aria-disabled')).toBe('false');
  };

  const thenTheFocusStaysOnTheHandle = (): void => {
    expect(document.activeElement).toBe(element('anomalie-poignee'));
  };

  const thenTheResolutionViewIsShown = (): void => {
    expect(present('anomalie-resolution')).toBe(true);
  };

  const thenNoResolutionViewIsShown = (): void => {
    thenAbsent('anomalie-resolution');
    thenTextContains('anomalie-retour', 'Retour aux anomalies');
  };

  const thenTheResolutionViewShowsTheReceipt = (): void => {
    expect(present('anomalie-resolution')).toBe(true);
    thenTextContains('anomalie-resultat', 'Anomalie traitée');
    thenAbsent('anomalie-resolution-valider');
  };

  const givenTheDossierIsStillLoading = (): void => {
    read.pending = new PendingResponseFixture<LectureDossier>();
  };

  const givenAnAutomaticEndStillExpiredAfterItsRegularisation = (): void => {
    const dossier = dossierFinAutomatiqueFixture();
    const adressee = {
      ...dossier,
      ligne: { ...dossier.ligne, adresse: { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('debut-8') } },
    };
    read.result = { kind: 'DOSSIER', dossier: adressee };
    givenASuccessfulPreview(adressee, acteFinRegulariseeFixture('poste-1', '2026-09-14T17:00:00-03:00'), adressee);
    application.result = { kind: 'APPLIQUE', dossier: adressee };
  };

  const whenRenderingWithoutWaiting = (): void => {
    fixture = TestBed.createComponent(DossierAnomaliePage);
    fixture.detectChanges();
  };

  const givenASuccessfulPreview = (
    apres?: DossierAnomalie,
    acte: ActeResolution = acteCorrectionFixture,
    dossier: DossierAnomalie = dossierAnomalieFixture(),
  ): void => {
    preview.result = {
      kind: 'APERCU',
      apercu: {
        empreinteConsequences: 'empreinte-1',
        evaluation: '2026-10-03T10:00:00Z',
        evenement: 'evenement-1',
        commande: 'commande-1',
        version: 1,
        adresse: dossier.ligne.adresse,
        avant: dossier,
        apres: apres ?? { ...dossier, enConflit: false },
        acte,
      },
    };
  };

  const givenAnIncompletePath = (): void => {
    route.paramMap.next(convertToParamMap({}));
  };

  const whenPressingOnTheHandle = async (key: string, shiftKey = false): Promise<void> => {
    element('anomalie-poignee').dispatchEvent(new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true }));
    await fixture.whenStable();
  };

  const whenClickingThePointagesRowAt = async (clientX: number): Promise<void> => {
    friseElements('anomalie-frise-plan').forEach(plan => {
      plan.getBoundingClientRect = () => new DOMRect(0, 0, 1000, 200);
    });
    element('anomalie-frise-placement').dispatchEvent(new MouseEvent('click', { clientX, bubbles: true }));
    await fixture.whenStable();
  };

  const whenTheClockIs = (instant: Date): void => {
    vi.setSystemTime(instant);
  };

  const whenAddressChanges = async (pointage: string): Promise<void> => {
    route.queryParamMap.next(convertToParamMap({ pointage }));
    await fixture.whenStable();
  };

  const whenResponseArrives = async <T>(pending: PendingResponseFixture<T>, result: T): Promise<void> => {
    pending.release(result);
    await pending.completion;
    await fixture.whenStable();
  };

  const frise = (): HTMLElement => element('anomalie-frise');

  const friseElements = (selector: string): HTMLElement[] => [...frise().querySelectorAll<HTMLElement>(dataSelector(selector))];

  const whenClicking = async (selector: string): Promise<void> => {
    element(selector).click();
    await Promise.allSettled([
      ...preview.replies.automaticResponses,
      ...application.replies.automaticResponses,
      ...application.receiptReplies.automaticResponses,
    ]);
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
  const thenTheHandleIsLocked = (): void => {
    expect(element('anomalie-poignee').getAttribute('aria-disabled')).toBe('true');
  };
  const thenTheHandleHoldsAt = (expected: Date): void => {
    expect(Number(element('anomalie-poignee').getAttribute('aria-valuenow'))).toBe(expected.getTime());
  };

  const thenTheHandleHoldsNoHour = (): void => {
    expect(element('anomalie-poignee').hasAttribute('data-sans-heure')).toBe(true);
    expect(element('anomalie-poignee').hasAttribute('aria-valuenow')).toBe(false);
  };

  const texts = (selector: string): string[] =>
    [...(fixture.nativeElement as HTMLElement).querySelectorAll(dataSelector(selector))].map(element =>
      element.textContent.replace(/\s+/g, ' ').trim(),
    );
  const thenTheProblemReads = (expected: string): void => {
    expect(element('anomalie-probleme').textContent.replace(/\s+/g, ' ').trim()).toBe(expected);
  };
  const thenTheLinkTargets = (selector: string, path: string, params: Record<string, string>): void => {
    const cible = new URL(requiredFixture(element(selector).getAttribute('href'), 'link target'), 'http://glm.test');
    expect(cible.pathname).toBe(path);
    expect(Object.fromEntries(cible.searchParams)).toEqual(params);
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
    expect((fixture.nativeElement as HTMLElement).querySelector('header')?.textContent).toContain(expected);
  };
  const thenHeadingDoesNotContain = (expected: string): void => {
    expect((fixture.nativeElement as HTMLElement).querySelector('header')?.textContent).not.toContain(expected);
  };
  const thenAbsent = (selector: string): void => {
    expect(present(selector)).toBe(false);
  };
  const thenDisabled = (selector: string): void => {
    const button = element(selector);
    if (!(button instanceof HTMLButtonElement)) throw new Error('Expected a button');
    expect(button.disabled).toBe(true);
  };
  const thenEnabled = (selector: string): void => {
    const button = element(selector);
    if (!(button instanceof HTMLButtonElement)) throw new Error('Expected a button');
    expect(button.disabled).toBe(false);
  };
});

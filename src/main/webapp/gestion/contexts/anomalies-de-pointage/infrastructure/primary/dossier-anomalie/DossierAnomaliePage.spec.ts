import { ActeResolution, FaitPropose } from '@/gestion/contexts/anomalies-de-pointage/domain/acte/ActeResolution';
import { SaisieActe } from '@/gestion/contexts/anomalies-de-pointage/domain/acte/SaisieActe';
import { ActiviteAnomalieId } from '@/gestion/contexts/anomalies-de-pointage/domain/dossier/ActiviteAnomalieId';
import { DossierAnomalie } from '@/gestion/contexts/anomalies-de-pointage/domain/dossier/DossierAnomalie';
import { ElementAnomalieId } from '@/gestion/contexts/anomalies-de-pointage/domain/dossier/ElementAnomalieId';
import { PointageAnomalieId } from '@/gestion/contexts/anomalies-de-pointage/domain/dossier/PointageAnomalieId';
import { SuiviAnomalieId } from '@/gestion/contexts/anomalies-de-pointage/domain/dossier/SuiviAnomalieId';

import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, ParamMap, Router } from '@angular/router';
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
import { AnomaliesRightsPort } from '../../../domain/dossier/AnomaliesRightsPort';
import { AdresseDossier, LectureDossier, PageAnomalies } from '../../../domain/dossier/DossierAnomalie';
import { DossierAnomaliePage } from './DossierAnomaliePage';

const INSTANT_FIN = instantLocalFixture(new Date(2026, 8, 14, 17, 0), '123456789');
const INSTANT_DEBUT = instantLocalFixture(new Date(2026, 8, 14, 8, 0));
const INSTANT_NON_CONFORMITE = instantLocalFixture(new Date(2026, 8, 14, 12, 1), '123456789');
const INSTANT_ECHEANCE = instantLocalFixture(new Date(2026, 8, 14, 21, 0));
const INSTANT_FIN_DE_TRAVAIL = instantLocalFixture(new Date(2026, 8, 14, 17, 0));
const INSTANT_ENREGISTREMENT = instantLocalFixture(new Date(2026, 8, 15, 8, 0));
const INSTANT_ENGAGEMENT = instantLocalFixture(new Date(2026, 8, 1, 7, 30));

const roundTripFixture = async <T>(result: () => T): Promise<T> => {
  await new Promise<void>(resolve => setTimeout(resolve));
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

class DossierReadFixture extends AnomaliesReadPort {
  failure: Error | undefined;
  result: LectureDossier = { kind: 'DOSSIER', dossier: dossierAnomalieFixture() };
  pending: PendingResponseFixture<LectureDossier> | undefined;
  readonly demandes: AdresseDossier[] = [];

  read(adresse: AdresseDossier): Promise<LectureDossier> {
    this.demandes.push(adresse);
    const pending = this.pending;
    this.pending = undefined;
    if (pending !== undefined) return pending.arrive();
    const failure = this.failure;
    const result = this.result;
    return roundTripFixture(() => {
      if (failure !== undefined) throw failure;
      return result;
    });
  }

  list(): Promise<PageAnomalies> {
    return roundTripFixture(() => ({ nature: 'CONFLIT', lignes: [], total: 0, complete: true }));
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
  result: ResultatApercu = { kind: 'REFUS', code: 'evenement-deja-annule' };

  preview(_adresse: AdresseDossier, _version: number, acte: ActeResolution): Promise<ResultatApercu> {
    this.actes.push(acte);
    return this.replies.answer(this.result);
  }
}

class DossierApplicationFixture extends ApplicationActePort {
  readonly replies = new RepliesFixture<ResultatApplication>();
  readonly receiptReplies = new RepliesFixture<ResultatVerification>();
  result: ResultatApplication = { kind: 'REFUS', code: 'evenement-deja-annule' };
  verification: ResultatVerification = { kind: 'NON_ATTESTE' };

  apply(): Promise<ResultatApplication> {
    return this.replies.answer(this.result);
  }

  verify(): Promise<ResultatVerification> {
    return this.receiptReplies.answer(this.verification);
  }
}

class RouteFixture {
  readonly paramMap = new BehaviorSubject<ParamMap>(convertToParamMap({ suivi: 'suivi-camille' }));
  readonly queryParamMap = new BehaviorSubject<ParamMap>(convertToParamMap({ pointage: 'fin-17' }));
}

class RouterFixture {
  readonly events = EMPTY;
  createUrlTree(_commands: unknown[], extras?: { queryParams?: Record<string, string | null | undefined>; fragment?: string | null }) {
    const queryParams = Object.entries(extras?.queryParams ?? {}).filter(([, value]) => value !== null && value !== undefined);
    return { queryParams: Object.fromEntries(queryParams), fragment: extras?.fragment ?? null };
  }
  serializeUrl(tree: { queryParams: Record<string, string>; fragment: string | null }): string {
    const fragment = tree.fragment === null ? '' : `#${tree.fragment}`;
    return `/?${new URLSearchParams(tree.queryParams).toString()}${fragment}`;
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
  activites: [{ id: new ActiviteAnomalieId('travail-8'), libelle: 'Travail ouvert à 8 h', etat: 'A_RESOUDRE', temps: 'À résoudre' }],
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
  continuations: [],
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

const finARegulariserFixture = (poste = 'poste-1'): SaisieActe =>
  SaisieActe.regularise({
    type: 'FIN',
    intention: 'FIN',
    activiteVisee: 'travail-8',
    operateur: 'op-camille',
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
        periode: { categorie: 'TRAVAIL', debut: INSTANT_DEBUT, fin: INSTANT_ECHEANCE, duree: 'PT13H' },
      },
    ],
    choix: [{ id: 'REGULARISER_FIN:debut-8', code: 'REGULARISER_FIN', libelle: '', explication: '', saisie: finARegulariserFixture() }],
  };
};

const dossierAtFixture = (pointage: string, explication: string): DossierAnomalie => {
  const dossier = dossierAnomalieFixture();
  return {
    ...dossier,
    ligne: {
      ...dossier.ligne,
      adresse: { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId(pointage) },
      explication,
    },
  };
};

describe('Anomaly dossier page', () => {
  let fixture: ComponentFixture<DossierAnomaliePage>;
  let read: DossierReadFixture;
  let route: RouteFixture;
  let preview: DossierPreviewFixture;
  let application: DossierApplicationFixture;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 5, 10, 0));
    read = new DossierReadFixture();
    route = new RouteFixture();
    preview = new DossierPreviewFixture();
    application = new DossierApplicationFixture();
    TestBed.configureTestingModule({
      providers: [
        { provide: ActivatedRoute, useValue: route },
        { provide: Router, useClass: RouterFixture },
        { provide: AnomaliesReadPort, useValue: read },
        { provide: PrevisualisationAnomaliePort, useValue: preview },
        { provide: ApplicationActePort, useValue: application },
        { provide: AnomaliesRightsPort, useValue: { canApply: () => true } },
        { provide: ErrorHandlerPort, useValue: { handleError: () => undefined } },
      ],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should offer a retry when reading fails without showing a misleading dossier', async () => {
    read.failure = new Error('Dossier indisponible');

    await whenRendering();

    thenTextContains('anomalie-retry', 'Réessayer');
    thenAbsent('conflit-diagnostic');
  });

  it('should reacquire the dossier after the manager explicitly retries an unavailable reading', async () => {
    read.failure = new Error('Dossier indisponible');
    await whenRendering();
    read.failure = undefined;

    await whenClicking('anomalie-retry');

    thenTextContains('conflit-diagnostic', 'La fin vise le travail remplacé.');
    thenAbsent('anomalie-retry');
    expect(read.demandes).toHaveLength(2);
  });

  it('should explain the explicit target and termination supplied by the conflict diagnostic', async () => {
    givenAStructuredDiagnostic();

    await whenRendering();

    thenDiagnosticReferencesTheReceivedFact('conflit-diagnostic-pointage', 'fin-17', 'lundi 14 septembre à 17:00:00 · Fin · Fin ciblée');
    thenTextContains('conflit-diagnostic', 'vise l’activité travail-8, remplacée.');
    thenTextContains('conflit-diagnostic', 'Ouverte par debut-8.');
    thenTextContains('conflit-diagnostic', 'Terminée par nc-12.');
  });

  it('should link a diagnostic to its corrected terminating fact independently of the preserved activity identity', async () => {
    givenACorrectedTerminatingFact();

    await whenRendering();

    thenDiagnosticReferencesTheReceivedFact(
      'conflit-diagnostic-terminaison',
      '90000000-0000-0000-0000-000000000001',
      'lundi 14 septembre à 12:01:00 · Non-conformité · Transition',
    );
    thenReceivedFactContains('90000000-0000-0000-0000-000000000001', 'Crée l’activité nc-12');
    thenReceivedFactContains('90000000-0000-0000-0000-000000000001', 'Remplace le pointage nc-12');
  });

  it('should disclose the received terminating fact when following its diagnostic reference', async () => {
    givenACorrectedTerminatingFact();
    await whenRendering();

    await whenClicking('conflit-diagnostic-terminaison');

    thenReceivedFactDetailsAreOpen('90000000-0000-0000-0000-000000000001');
  });

  it('should reopen the same received trace after the manager closes it', async () => {
    givenACorrectedTerminatingFact();
    await whenRendering();

    await whenFollowingTheDiagnosticReference('conflit-diagnostic-terminaison');
    await whenClosingTheReceivedTrace('90000000-0000-0000-0000-000000000001');
    await whenFollowingTheDiagnosticReference('conflit-diagnostic-terminaison');

    thenReceivedFactDetailsAreOpen('90000000-0000-0000-0000-000000000001');
  });

  it('should keep the newly requested fact trace open when the previously consulted trace closes', async () => {
    givenTheOpeningFactReferencedByTheDiagnostic();
    await whenRendering();

    await whenFollowingTheDiagnosticReference('conflit-diagnostic-ouvrant');
    await whenFollowingTheDiagnosticReference('conflit-diagnostic-pointage');

    thenReceivedFactDetailsAreOpen('fin-17');
  });

  it('should locate the challenged and opening facts identified by the received diagnostic', async () => {
    givenTheOpeningFactReferencedByTheDiagnostic();

    await whenRendering();

    thenDiagnosticReferencesTheReceivedFact('conflit-diagnostic-pointage', 'fin-17', 'lundi 14 septembre à 17:00:00 · Fin · Fin ciblée');
    thenDiagnosticReferencesTheReceivedFact('conflit-diagnostic-ouvrant', 'debut-8', 'lundi 14 septembre à 08:00:00 · Travail · Ouverture');
  });

  it('should show the engagement of the workshop in the header as a long day and local time', async () => {
    await whenRendering();

    thenTextContains('anomalie-cloture', 'mardi 1 septembre à 07:30');
  });

  it('should show the date of the first pointage in the header as a long day and local time', async () => {
    await whenRendering();

    thenHeadingContains('lundi 14 septembre à 17:00');
  });

  it('should show the time of a received fact with its seconds, then its long day, in the chronology', async () => {
    await whenRendering();

    thenReceivedFactTimeIs('fin-17', '17:00:00 · lundi 14 septembre');
  });

  it('should add the year to the day of a received fact that is not from the current year', async () => {
    givenAReceivedFactFromAnotherYear();

    await whenRendering();

    thenReceivedFactTimeIs('fin-17', '09:41:22 · mercredi 1 octobre 2025');
  });

  it('should describe the instant of a received fact to the browser with at most three decimals', async () => {
    await whenRendering();

    thenReceivedFactDatetimeIs('fin-17', new Date(2026, 8, 14, 17, 0, 0, 123).toISOString());
  });

  it('should show the registration of a received fact as a long day and local time without seconds', async () => {
    await whenRendering();

    thenReceivedFactContains('fin-17', 'Enregistré le mardi 15 septembre à 08:00');
  });

  it('should show the time of a received fact with its seconds in its traceability details', async () => {
    await whenRendering();

    thenReceivedFactContains('fin-17', 'fin-17 · lundi 14 septembre à 17:00:00');
  });

  it('should show when a cancelled pointage was cancelled as a long day and local time without seconds', async () => {
    givenACancelledOpeningTargetedByTheRemainingEnd();

    await whenRendering();

    thenTextContains('anomalie-annulation', 'Début annulé · gestionnaire · mardi 15 septembre à 08:00');
  });

  it('should show the instant of the proposed fact with its seconds', async () => {
    await whenRendering();

    await whenClicking('anomalie-choix');

    thenTextContains('anomalie-proposition-resume', 'Fin · lundi 14 septembre à 17:00:00');
  });

  it('should show the instant of the pointage to cancel with its seconds', async () => {
    await whenRendering();
    await whenClicking('anomalie-detail');

    await whenClicking('anomalie-annuler');

    thenTextContains('anomalie-proposition-resume', 'Fin · lundi 14 septembre à 17:00:00');
  });

  it('should show the instant of the previewed act and of the compared journals with their seconds', async () => {
    givenASuccessfulPreview();
    await whenRendering();

    await whenPreparingTheCorrection();

    thenTextContains('anomalie-apercu-acte', 'lundi 14 septembre à 17:00:00');
    thenTextContains('anomalie-apercu-journal', 'fin-17 · lundi 14 septembre à 17:00:00');
    thenTextContains('anomalie-apercu-fait-avant-fin-17', 'lundi 14 septembre à 17:00:00');
    thenTextContains('anomalie-apercu-fait-apres-fin-17', 'lundi 14 septembre à 17:00:00');
  });

  it('should describe the instant of an obsolete address history to the browser with at most three decimals', async () => {
    read.result = { kind: 'ANCRE_ANNULEE', journal: dossierAnomalieFixture().journal };

    await whenRendering();

    thenReceivedFactDatetimeIs('fin-17', new Date(2026, 8, 14, 17, 0, 0, 123).toISOString());
  });

  it('should reject an address missing its suivi without requesting a dossier', async () => {
    givenAnIncompletePath();

    await whenRendering();

    thenTextContains('anomalie-adresse-invalide', 'L’adresse doit préciser');
    thenAbsent('conflit-diagnostic');
    expect(read.demandes).toHaveLength(0);
  });

  it('should retain the available journal when the addressed anchor was cancelled', async () => {
    read.result = { kind: 'ANCRE_ANNULEE', journal: dossierAnomalieFixture().journal };

    await whenRendering();

    thenTextContains('anomalie-adresse-obsolete', 'annulé ou remplacé');
    thenTextContains('anomalie-historique', 'lundi 14 septembre à 17:00:00');
    thenAbsent('anomalie-choix');
  });

  it('should name the operator and the workstation of each pointage in the chronology without any identifier', async () => {
    await whenRendering();

    thenReceivedFactContains('fin-17', 'Opérateur : Camille Martin · Poste : DMU 50');
    thenReceivedFactDoesNotContain('fin-17', 'op-camille');
    thenReceivedFactDoesNotContain('fin-17', 'poste-1');
  });

  it('should present an unresolved operator and workstation of a pointage without any identifier', async () => {
    const dossier = dossierAnomalieFixture();
    read.result = {
      kind: 'DOSSIER',
      dossier: { ...dossier, journal: dossier.journal.map(pointage => ({ ...pointage, operateurNom: '', posteLibelle: '' })) },
    };

    await whenRendering();

    thenReceivedFactContains('fin-17', 'Opérateur : Opérateur non résolu · Poste : Poste non résolu');
    thenReceivedFactDoesNotContain('fin-17', 'op-camille');
    thenReceivedFactDoesNotContain('fin-17', 'poste-1');
  });

  it('should distinguish a pointage without workstation from an unresolved workstation in the chronology', async () => {
    const dossier = dossierAnomalieFixture();
    read.result = {
      kind: 'DOSSIER',
      dossier: {
        ...dossier,
        journal: dossier.journal.map(pointage => ({ ...pointage, posteLibelle: '', fait: { ...pointage.fait, poste: '' } })),
      },
    };

    await whenRendering();

    thenReceivedFactContains('fin-17', 'Poste : Sans poste');
  });

  it('should name the operator and the workstation in an obsolete address history without any identifier', async () => {
    const journal = dossierAnomalieFixture().journal;
    read.result = { kind: 'ANCRE_ANNULEE', journal: journal.map(pointage => ({ ...pointage, operateurNom: '' })) };

    await whenRendering();

    thenReceivedFactContains('fin-17', 'Opérateur : Opérateur non résolu · Poste : DMU 50');
    thenReceivedFactDoesNotContain('fin-17', 'op-camille');
  });

  it('should explain that the addressed pointage no longer carries an anomaly', async () => {
    read.result = { kind: 'SANS_ANOMALIE', journal: dossierAnomalieFixture().journal };

    await whenRendering();

    thenTextContains('anomalie-adresse-obsolete', 'ne relève plus d’une anomalie');
    thenAbsent('anomalie-choix');
  });

  it('should display a dossier with only resolution controls', async () => {
    await whenRendering();

    thenAbsent('anomalies-demo');
    thenTextContains('anomalie-cloture', 'Ouvert');
  });

  it('should present unresolved references in the dossier heading without any identity', async () => {
    const dossier = dossierAnomalieFixture();
    read.result = {
      kind: 'DOSSIER',
      dossier: { ...dossier, ligne: { ...dossier.ligne, operateur: '', poste: '', posteId: 'poste-absent' } },
    };

    await whenRendering();

    thenHeadingContains('Opérateur non résolu · Poste non résolu');
    thenHeadingDoesNotContain('poste-absent');
  });

  it('should explain an unresolved activity without presenting an empty duration', async () => {
    const dossier = dossierAnomalieFixture();
    read.result = { kind: 'DOSSIER', dossier: { ...dossier, activites: dossier.activites.map(activite => ({ ...activite, temps: '' })) } };

    await whenRendering();

    thenTextContains('anomalie-activite', 'À résoudre · Temps à résoudre');
  });

  it('should label an explicit continuation from its authoritative sequence instead of presenting an empty link', async () => {
    const dossier = dossierAnomalieFixture();
    read.result = {
      kind: 'DOSSIER',
      dossier: { ...dossier, continuations: [{ ...dossier.ligne, explication: '', nombrePointages: 3 }] },
    };

    await whenRendering();

    thenTextContains('conflit-continuation', 'M-042 · Camille Martin · lundi 14 septembre à 17:00 · 3 pointages');
  });

  it.each([
    { operateur: '', explication: '', attendu: 'M-042 · Opérateur non résolu · lundi 14 septembre à 17:00 · 3 pointages' },
    {
      operateur: 'Camille Martin',
      explication: 'Autre fin contradictoire.',
      attendu: 'Autre fin contradictoire.',
    },
  ])('should retain the continuation information $attendu', async ({ operateur, explication, attendu }) => {
    const dossier = dossierAnomalieFixture();
    read.result = {
      kind: 'DOSSIER',
      dossier: { ...dossier, continuations: [{ ...dossier.ligne, operateur, explication, nombrePointages: 3 }] },
    };

    await whenRendering();

    thenTextContains('conflit-continuation', attendu);
  });

  it('should distinguish a missing workstation from an unresolved workstation in the heading', async () => {
    const dossier = dossierAnomalieFixture();
    read.result = { kind: 'DOSSIER', dossier: { ...dossier, ligne: { ...dossier.ligne, poste: '' } } };

    await whenRendering();

    thenHeadingContains('Camille Martin · Sans poste · lundi 14 septembre à 17:00');
  });

  it('should show an ongoing activity after resolution without presenting a definitive duration', async () => {
    read.result = {
      kind: 'DOSSIER',
      dossier: {
        ...dossierAnomalieFixture(),
        enConflit: false,
        activites: [
          { id: new ActiviteAnomalieId('travail-8'), libelle: 'Travail commencé à 8 h', etat: 'EN_COURS', temps: 'Temps non définitif' },
        ],
      },
    };

    await whenRendering();

    thenTextContains('anomalie-activite', 'En cours · Temps non définitif');
  });

  it.each([
    { code: 'ANNULER_TRANSITION' as const, libelle: 'Annuler la transition', saisie: SaisieActe.cancel('nc-12') },
    {
      code: 'RATTACHER_FIN_A_ACTIVITE_REMPLACANTE' as const,
      libelle: 'Rattacher la fin à l’activité remplaçante',
      saisie: SaisieActe.correct('fin-17', faitConflitFixture()),
    },
  ])(
    'should explain the structured guide $code without choosing a motive or previewing automatically',
    async ({ code, libelle, saisie }) => {
      read.result = {
        kind: 'DOSSIER',
        dossier: { ...dossierAnomalieFixture(), choix: [{ id: 'guide', code, libelle: '', explication: '', saisie }] },
      };
      await whenRendering();

      await whenClicking('anomalie-choix');

      thenTextContains('anomalie-choix', libelle);
      thenFieldValueIs('anomalie-motif', '');
      thenAbsent('anomalie-apercu');
    },
  );

  it('should present the exact authoritative period and duration of finished work', async () => {
    givenAnAuthoritativeActivity('TERMINEE', 'PT8H59M59.876543211S');

    await whenRendering();

    thenTextContains('anomalie-activite', 'Travail');
    thenTextContains('anomalie-activite', 'lundi 14 septembre à 08:00');
    thenTextContains('anomalie-activite', 'lundi 14 septembre à 17:00');
    thenTextContains('anomalie-activite', '8 h 59 min 59,876543211 s');
  });

  it('should retain the finished duration supplied by the dossier', async () => {
    const dossier = dossierAnomalieFixture();
    read.result = {
      kind: 'DOSSIER',
      dossier: { ...dossier, activites: [{ id: new ActiviteAnomalieId('travail-8'), libelle: 'Travail', etat: 'TERMINEE', temps: '4 h' }] },
    };

    await whenRendering();

    thenTextContains('anomalie-activite', 'Terminée · 4 h');
  });

  it('should describe ongoing authoritative work without a definitive duration', async () => {
    givenAnAuthoritativeActivity('EN_COURS', 'PT3H');

    await whenRendering();

    thenTextContains('anomalie-activite', 'En cours · Temps non définitif');
    thenTextDoesNotContain('anomalie-activite', '3 h');
  });

  it.each([
    { duree: 'PT0S', attendu: '0 s' },
    { duree: 'PT45M', attendu: '45 min' },
    { duree: 'PT24H', attendu: '24 h' },
    { duree: 'durée reçue', attendu: 'durée reçue' },
  ])('should present the received non-conformity duration $duree', async ({ duree, attendu }) => {
    givenAnAuthoritativeActivity('TERMINEE', duree, 'NON_CONFORMITE');

    await whenRendering();

    thenTextContains('anomalie-activite', 'Non-conformité');
    thenTextContains('anomalie-activite', attendu);
  });

  it('should show the attested canonical dossier when the original address has become obsolete', async () => {
    givenASuccessfulPreview();
    application.result = { kind: 'ISSUE_INCONNUE' };
    application.verification = { kind: 'ATTESTE', dossier: { ...dossierAnomalieFixture(), version: 3, enConflit: false } };
    await whenRendering();
    await whenPreparingTheCorrection();
    await whenClicking('anomalie-confirmer');
    read.result = { kind: 'ANCRE_ANNULEE', journal: dossierAnomalieFixture().journal };

    await whenClicking('anomalie-verifier');

    thenTextContains('anomalie-resultat', 'Anomalie traitée');
    thenAbsent('anomalie-adresse-obsolete');
  });

  it('should recover the canonical receipt even when an ordinary dossier read is unavailable', async () => {
    givenASuccessfulPreview();
    application.result = { kind: 'ISSUE_INCONNUE' };
    application.verification = { kind: 'ATTESTE', dossier: { ...dossierAnomalieFixture(), version: 3, enConflit: false } };
    await whenRendering();
    await whenPreparingTheCorrection();
    await whenClicking('anomalie-confirmer');
    read.failure = new Error('Lecture ordinaire indisponible');

    await whenClicking('anomalie-verifier');

    thenTextContains('anomalie-resultat', 'Anomalie traitée');
    thenAbsent('anomalie-retry');
  });

  it('should show ongoing work in the proposed result without presenting a definitive duration', async () => {
    givenASuccessfulPreview({
      ...dossierAnomalieFixture(),
      enConflit: false,
      activites: [
        { id: new ActiviteAnomalieId('travail-8'), libelle: 'Travail commencé à 8 h', etat: 'EN_COURS', temps: 'Temps non définitif' },
      ],
    });
    await whenRendering();

    await whenPreparingTheCorrection();

    thenTextContains('anomalie-apercu-activite-apres', 'Travail commencé à 8 h · En cours · Temps non définitif');
  });

  it('should keep new decisions blocked when the confirmation receipt is not attested', async () => {
    givenASuccessfulPreview();
    application.result = { kind: 'ISSUE_INCONNUE' };
    await whenRendering();

    await whenPreparingTheCorrection();
    await whenClicking('anomalie-confirmer');
    await whenClicking('anomalie-verifier');

    thenTextContains('anomalie-operation', 'L’issue de l’écriture est inconnue');
    thenDisabled('anomalie-choix');
    thenFieldValueIs('anomalie-motif', 'Cible confirmée');
    expect(read.demandes).toHaveLength(1);
  });

  it('should clear the displayed interpretation only after the receipt attests the unknown write', async () => {
    givenASuccessfulPreview();
    application.result = { kind: 'ISSUE_INCONNUE' };
    application.verification = { kind: 'ATTESTE', dossier: { ...dossierAnomalieFixture(), version: 2 } };
    await whenRendering();

    await whenPreparingTheCorrection();
    await whenClicking('anomalie-confirmer');
    await whenClicking('anomalie-verifier');

    thenNoInterpretationIsSelected();
    thenAbsent('anomalie-acte');
  });

  it('should explicitly resume the same uncertain confirmation and display its canonical result', async () => {
    givenASuccessfulPreview();
    application.result = { kind: 'ISSUE_INCONNUE' };
    await whenRendering();
    await whenPreparingTheCorrection();
    await whenClicking('anomalie-confirmer');
    await whenClicking('anomalie-verifier');
    application.result = { kind: 'APPLIQUE', dossier: { ...dossierAnomalieFixture(), version: 3, enConflit: false } };

    await whenClicking('anomalie-reprendre-confirmation');

    thenTextContains('anomalie-resultat', 'Anomalie traitée');
    thenAbsent('anomalie-reprendre-confirmation');
  });

  it('should replace the displayed dossier with the accepted partial result while preserving its closure', async () => {
    givenASuccessfulPreview();
    const dossier = dossierAnomalieFixture();
    application.result = {
      kind: 'APPLIQUE',
      dossier: {
        ...dossier,
        version: 2,
        cloture: true,
        finCloture: instantLocalFixture(new Date(2026, 8, 14, 18, 0)),
        ligne: { ...dossier.ligne, explication: 'Reprise encore à rattacher.' },
      },
    };
    await whenRendering();

    await whenPreparingTheCorrection();
    await whenClicking('anomalie-confirmer');

    thenTextContains('conflit-diagnostic', 'Reprise encore à rattacher.');
    thenTextContains('anomalie-cloture', 'Clôturé');
    thenTextContains('anomalie-resultat', 'Acte enregistré, anomalie restante');
    thenAbsent('anomalie-apercu');
  });

  it('should preserve the detailed proposition when the preview is refused', async () => {
    await whenRendering();

    await whenPreparingTheCorrection();

    thenTextContains('anomalie-operation', 'Acte refusé');
    thenTextContains('anomalie-refus', 'Le pointage est déjà annulé.');
    thenFieldValueIs('anomalie-motif', 'Cible confirmée');
    thenAbsent('anomalie-apercu');
  });

  it.each([
    { code: 'operateur-non-habilite', libelle: 'L’opérateur indiqué n’est pas habilité sur ce poste.' },
    { code: 'operateur-introuvable', libelle: 'L’opérateur indiqué est introuvable.' },
    { code: 'poste-de-travail-introuvable', libelle: 'Le poste indiqué est introuvable.' },
  ] as const)('should explain the preview refusal $code without any identifier', async ({ code, libelle }) => {
    preview.result = { kind: 'REFUS', code };
    await whenRendering();

    await whenPreparingTheCorrection();

    thenTextContains('anomalie-refus', libelle);
    thenTextDoesNotContainAnIdentifier('anomalie-refus');
  });

  it('should explain the confirmation refusal operateur-non-habilite without any identifier and keep the proposition', async () => {
    givenASuccessfulPreview();
    application.result = { kind: 'REFUS', code: 'operateur-non-habilite' };
    await whenRendering();
    await whenPreparingTheCorrection();

    await whenClicking('anomalie-confirmer');

    thenTextContains('anomalie-refus', 'L’opérateur indiqué n’est pas habilité sur ce poste.');
    thenTextDoesNotContainAnIdentifier('anomalie-refus');
    thenFieldValueIs('anomalie-motif', 'Cible confirmée');
  });

  it('should retain the obsolete proposition through a failed reacquisition and require an explicit new preview after recovery', async () => {
    givenASuccessfulPreview();
    application.result = { kind: 'CONCURRENCE' };
    await whenRendering();
    await whenPreparingTheCorrection();
    read.failure = new Error('Dossier courant indisponible');

    await whenClicking('anomalie-confirmer');
    const echecVisible = present('anomalie-retry');
    const confirmationApresEchec = present('anomalie-confirmer');
    const apercuApresEchec = present('anomalie-apercu');
    read.failure = undefined;
    const dossier = dossierAnomalieFixture();
    read.result = { kind: 'DOSSIER', dossier: { ...dossier, version: 2 } };
    await whenClicking('anomalie-retry');

    expect(echecVisible).toBe(true);
    expect(confirmationApresEchec).toBe(false);
    expect(apercuApresEchec).toBe(false);
    thenFieldValueIs('anomalie-motif', 'Cible confirmée');
    thenAbsent('anomalie-apercu');
    thenAbsent('anomalie-confirmer');
    thenTextContains('anomalie-operation', 'Les données ont changé. Vérifiez un nouvel aperçu avant de confirmer.');
    expect(preview.actes).toHaveLength(1);
  });
  it('should reread a concurrent dossier without discarding the manager proposal', async () => {
    preview.result = { kind: 'CONCURRENCE' };
    await whenRendering();
    const dossier = dossierAnomalieFixture();
    read.result = {
      kind: 'DOSSIER',
      dossier: { ...dossier, version: 2, ligne: { ...dossier.ligne, explication: 'Le journal a été actualisé.' } },
    };

    await whenPreparingTheCorrection();

    thenTextContains('conflit-diagnostic', 'Le journal a été actualisé.');
    thenTextContains('anomalie-operation', 'Les données ont changé. Vérifiez un nouvel aperçu avant de confirmer.');
    thenFieldValueIs('anomalie-motif', 'Cible confirmée');
    thenAbsent('anomalie-apercu');
    expect(read.demandes).toHaveLength(2);
  });

  it('should keep the unknown outcome blocked when canonical verification fails', async () => {
    givenASuccessfulPreview();
    application.result = { kind: 'ISSUE_INCONNUE' };
    await whenRendering();
    await whenPreparingTheCorrection();
    await whenClicking('anomalie-confirmer');
    const attente = new PendingResponseFixture<ResultatVerification>();
    application.receiptReplies.pending = attente;

    whenStartingClick('anomalie-verifier');
    await attente.arrival;
    await whenResponseFails(attente, new Error('Vérification indisponible'));

    expect(present('anomalie-verifier')).toBe(true);
    thenTextContains('anomalie-operation', 'L’issue de l’écriture est inconnue');
    thenDisabled('anomalie-choix');
    thenFieldValueIs('anomalie-motif', 'Cible confirmée');
    thenAbsent('anomalie-apercu');
  });

  it('should discard the former dossier proposition when its address changes reactively', async () => {
    await whenRendering();
    await whenClicking('anomalie-choix');
    await whenEntering('anomalie-motif', 'Ancienne décision');
    const dossier = dossierAnomalieFixture();
    read.result = {
      kind: 'DOSSIER',
      dossier: {
        ...dossier,
        ligne: {
          ...dossier.ligne,
          adresse: { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('fin-18') },
          explication: 'Autre contradiction.',
        },
      },
    };

    await whenAddressChanges('fin-18');

    thenTextContains('conflit-diagnostic', 'Autre contradiction.');
    thenAbsent('anomalie-acte');
    thenAbsent('anomalie-apercu');
    expect(read.demandes).toHaveLength(2);
  });

  it('should start detailed correction with the selected pointage facts unchanged', async () => {
    await whenRendering();

    await whenClicking('anomalie-detail');
    await whenClicking('anomalie-corriger');

    thenTextContains('anomalie-acte', 'Correction du pointage');
    thenFieldValueIs('anomalie-cible', 'travail-8');
    thenTheInstantFieldsShow('14/09/2026', '17:00:00');
    thenDetailedFactIsOpen();
  });

  it('should name the received activity interval in the journal target and correction choices', async () => {
    givenAnAuthoritativeActivity('TERMINEE', 'PT4H');
    await whenRendering();

    await whenClicking('anomalie-detail');
    await whenClicking('anomalie-corriger');

    const libelle = 'Travail · lundi 14 septembre à 08:00 → lundi 14 septembre à 17:00';
    thenTextContains('anomalie-pointage', libelle);
    thenTargetChoiceIs('travail-8', libelle);
  });

  it('should let the manager select the named non-conformity activity and preview its exact reference', async () => {
    const dossier = dossierAnomalieFixture();
    read.result = {
      kind: 'DOSSIER',
      dossier: {
        ...dossier,
        activites: [
          ...dossier.activites,
          { id: new ActiviteAnomalieId('nc-12'), libelle: 'Non-conformité ouverte à 12 h', etat: 'TERMINEE', temps: '5 h' },
        ],
      },
    };
    await whenRendering();

    await whenClicking('anomalie-detail');
    await whenClicking('anomalie-corriger');
    await whenEntering('anomalie-cible', 'nc-12');
    await whenEntering('anomalie-motif', 'Cible confirmée');
    await whenClicking('anomalie-previsualiser');

    thenTargetChoiceIs('nc-12', 'Non-conformité ouverte à 12 h');
    expect(preview.actes).toEqual([
      {
        kind: 'CORRECTION',
        pointage: 'fin-17',
        motif: 'Cible confirmée',
        fait: { ...faitConflitFixture(), activiteVisee: 'nc-12' },
      },
    ]);
  });

  it('should retain the proposed target when its activity is absent from the dossier instead of selecting another one', async () => {
    await whenRendering();

    await whenClicking('anomalie-choix');

    thenTargetChoiceIs('nc-12', 'nc-12');
  });

  it('should let the manager explicitly choose no target activity when correcting an opening', async () => {
    await whenRendering();

    await whenClicking('anomalie-detail');
    await whenClicking('anomalie-corriger');
    await whenClicking('anomalie-type-DEBUT');
    await whenClicking('anomalie-intention-OUVERTURE');
    await whenEntering('anomalie-cible', '');
    await whenEntering('anomalie-motif', 'Ouverture confirmée');
    await whenClicking('anomalie-previsualiser');

    thenTargetChoiceIs('', 'Aucune activité visée');
    expect(preview.actes).toEqual([
      {
        kind: 'CORRECTION',
        pointage: 'fin-17',
        motif: 'Ouverture confirmée',
        fait: { ...faitConflitFixture(), type: 'DEBUT', intention: 'OUVERTURE', activiteVisee: '' },
      },
    ]);
  });

  it('should name the cancelled opening targeted by a remaining end without inventing an interpreted activity', async () => {
    givenACancelledOpeningTargetedByTheRemainingEnd();
    await whenRendering();

    await whenClicking('anomalie-detail');
    await whenClicking('anomalie-corriger');

    thenTargetChoiceIs('travail-8', 'Travail · lundi 14 septembre à 08:00:00');
    thenAbsent('anomalie-activite');
  });

  it('should stop presenting the guided interpretation as selected after the manager changes its target', async () => {
    await whenRendering();
    await whenClicking('anomalie-choix');

    await whenClicking('anomalie-champs-detail');
    await whenEntering('anomalie-cible', 'travail-8');

    thenTargetChoiceIs('travail-8', 'Travail ouvert à 8 h');
    thenNoInterpretationIsSelected();
  });

  it('should expose cancellation without transforming the chosen pointage fact', async () => {
    await whenRendering();

    await whenClicking('anomalie-detail');
    await whenClicking('anomalie-annuler');

    thenTextContains('anomalie-acte', 'Annulation du pointage');
    thenTextContains('anomalie-pointage', 'lundi 14 septembre à 17:00:00');
    thenAbsent('anomalie-cible');
    thenFieldValueIs('anomalie-motif', '');
  });

  it('should open detailed regularisation without any selected type or intention', async () => {
    await whenRendering();

    await whenClicking('anomalie-detail');
    await whenClicking('anomalie-regulariser');

    thenTextContains('anomalie-acte', 'Régularisation d’un fait manquant');
    thenNothingIsChosen([
      'anomalie-type-DEBUT',
      'anomalie-type-NON_CONFORMITE',
      'anomalie-type-FIN',
      'anomalie-intention-OUVERTURE',
      'anomalie-intention-TRANSITION',
      'anomalie-intention-FIN',
    ]);
    thenDetailedFactIsOpen();
    thenAbsent('anomalie-motif');
  });

  it('should ignore preview consequences arriving after another dossier has replaced its proposition', async () => {
    givenASuccessfulPreview();
    const ancienneReponse = preview.result;
    const attente = new PendingResponseFixture<ResultatApercu>();
    preview.replies.pending = attente;
    await whenRendering();
    await whenPreparingTheCorrection();
    await attente.arrival;
    read.result = { kind: 'DOSSIER', dossier: dossierAtFixture('fin-18', 'Autre contradiction.') };

    await whenAddressChanges('fin-18');
    await whenResponseArrives(attente, ancienneReponse);

    thenTextContains('conflit-diagnostic', 'Autre contradiction.');
    thenAbsent('anomalie-acte');
    thenAbsent('anomalie-apercu');
    thenAbsent('anomalie-operation');
  });

  it('should keep a later unknown outcome blocked when an earlier verification returns after leaving and reopening the same dossier', async () => {
    givenASuccessfulPreview();
    application.result = { kind: 'ISSUE_INCONNUE' };
    await whenRendering();
    await whenPreparingTheCorrection();
    await whenClicking('anomalie-confirmer');
    const ancienneVerification = new PendingResponseFixture<ResultatVerification>();
    application.receiptReplies.pending = ancienneVerification;

    whenStartingClick('anomalie-verifier');
    await ancienneVerification.arrival;
    read.result = { kind: 'DOSSIER', dossier: dossierAtFixture('fin-18', 'Autre contradiction.') };
    await whenAddressChanges('fin-18');
    read.result = { kind: 'DOSSIER', dossier: dossierAnomalieFixture() };
    await whenAddressChanges('fin-17');
    await whenPreparingTheCorrection();
    await whenClicking('anomalie-confirmer');
    await whenResponseArrives(ancienneVerification, {
      kind: 'ATTESTE',
      dossier: { ...dossierAnomalieFixture(), version: 3, enConflit: false },
    });

    thenDisabled('anomalie-choix');
    thenTextContains('anomalie-operation', 'L’issue de l’écriture est inconnue');
    thenFieldValueIs('anomalie-motif', 'Cible confirmée');
  });

  it('should abandon the confirmed dossier when its address becomes incomplete before the write response arrives', async () => {
    givenASuccessfulPreview();
    const attente = new PendingResponseFixture<ResultatApplication>();
    application.replies.pending = attente;
    await whenRendering();
    await whenPreparingTheCorrection();
    await whenClicking('anomalie-confirmer');
    await attente.arrival;

    await whenAddressBecomesIncomplete();
    await whenResponseArrives(attente, { kind: 'APPLIQUE', dossier: { ...dossierAnomalieFixture(), version: 2, enConflit: false } });

    thenAbsent('conflit-diagnostic');
    thenAbsent('anomalie-acte');
    thenTextContains('anomalie-adresse-invalide', 'L’adresse doit préciser');
  });

  it('should present an automatic end as an anomaly of pointage and never as a conflict', async () => {
    givenAnAutomaticEnd();

    await whenRendering();

    thenHeadingOfThePageIs('Dossier d’anomalie de pointage');
    thenTextContains('anomalie-retour', 'Retour aux anomalies');
    thenAbsent('conflit-diagnostic');
    thenPageDoesNotMention('conflit');
  });

  it('should show the due activity with its start, its automatic end and its received duration', async () => {
    givenAnAutomaticEnd();

    await whenRendering();

    thenTextContains('anomalie-fin-automatique', 'Fin automatique');
    thenTextContains('anomalie-fin-automatique-activite', 'Travail');
    thenTextContains('anomalie-fin-automatique-activite', 'Début lundi 14 septembre à 08:00');
    thenTextContains('anomalie-fin-automatique-activite', 'Fin automatique lundi 14 septembre à 21:00');
    thenTextContains('anomalie-fin-automatique-activite', 'Durée 13 h');
  });

  it('should keep the closure of the workshop visible on an automatic end', async () => {
    const dossier = dossierFinAutomatiqueFixture();
    read.result = {
      kind: 'DOSSIER',
      dossier: { ...dossier, cloture: true, finCloture: instantLocalFixture(new Date(2026, 8, 14, 23, 0)) },
    };

    await whenRendering();

    thenTextContains('anomalie-cloture', 'lundi 14 septembre à 23:00');
  });

  it('should not present the automatic end block on a conflict dossier', async () => {
    await whenRendering();

    thenAbsent('anomalie-fin-automatique');
  });

  it('should keep both the conflict and the automatic end visible when the perimeter still carries both', async () => {
    const dossier = dossierFinAutomatiqueFixture();
    read.result = { kind: 'DOSSIER', dossier: { ...dossier, enConflit: true } };

    await whenRendering();

    thenTextContains('anomalie-fin-automatique', 'Fin automatique');
    thenTextContains('conflit-diagnostic', 'Pourquoi ces pointages sont incohérents');
  });

  it('should offer the guided end regularisation with its fact open and no time proposed', async () => {
    givenAnAutomaticEnd();
    await whenRendering();

    await whenClicking('anomalie-choix');

    thenTextContains('anomalie-choix', 'Régulariser la fin');
    thenTextContains('anomalie-acte', 'Régularisation d’un fait manquant');
    thenTheInstantFieldsShow('', '');
    thenFieldValueIs('anomalie-cible', 'travail-8');
    thenFieldValueIs('anomalie-operateur', 'op-camille');
    thenTextContains('anomalie-validation', 'Renseignez la date et l’heure du fait.');
    thenDetailedFactIsOpen();
    thenAbsent('anomalie-motif');
    thenDisabled('anomalie-previsualiser');
  });

  it('should keep the end regularisation chosen while the manager types its time and preview exactly that instant', async () => {
    givenAnAutomaticEnd();
    await whenRendering();
    await whenClicking('anomalie-choix');

    await whenEnteringTheInstant('14/09/2026', '17:00:00');
    await whenClicking('anomalie-previsualiser');

    thenInterpretationIsSelected();
    expect(preview.actes).toEqual([
      {
        kind: 'REGULARISATION',
        fait: {
          type: 'FIN',
          intention: 'FIN',
          activiteVisee: 'travail-8',
          operateur: 'op-camille',
          poste: 'poste-1',
          instant: '2026-09-14T17:00:00-03:00',
        },
      },
    ]);
  });

  it('should stop presenting the end regularisation as chosen once the manager changes its target', async () => {
    givenAnAutomaticEnd();
    await whenRendering();
    await whenClicking('anomalie-choix');

    await whenEntering('anomalie-operateur', 'op-autre');

    thenNoInterpretationIsSelected();
  });

  it('should preview the received instant untouched, nanoseconds included, when the manager changes something else', async () => {
    await whenRendering();
    await whenClicking('anomalie-detail');
    await whenClicking('anomalie-corriger');

    await whenEntering('anomalie-motif', 'Cible confirmée');
    await whenClicking('anomalie-previsualiser');

    expect(preview.actes).toMatchObject([{ kind: 'CORRECTION', fait: { instant: INSTANT_FIN } }]);
  });

  it('should keep the time and drop the fraction of a second when the manager changes the day of a received instant', async () => {
    await givenACorrectionOfTheReceivedEndWithItsReason();

    await whenEntering('anomalie-instant-date', '15/09/2026');
    await whenClicking('anomalie-previsualiser');

    expect(preview.actes).toMatchObject([{ fait: { instant: '2026-09-15T17:00:00-03:00' } }]);
  });

  it('should keep the day when the manager changes the time of a received instant', async () => {
    await givenACorrectionOfTheReceivedEndWithItsReason();

    await whenEntering('anomalie-instant-heure', '18:30');
    await whenClicking('anomalie-previsualiser');

    expect(preview.actes).toMatchObject([{ fait: { instant: '2026-09-14T18:30:00-03:00' } }]);
  });

  it('should ask for the date and the time while the manager has only given a date', async () => {
    givenAnAutomaticEnd();
    await whenRendering();
    await whenClicking('anomalie-choix');

    await whenEntering('anomalie-instant-date', '14/09/2026');

    thenTheInstantFieldsShow('14/09/2026', '');
    thenTextContains('anomalie-validation', 'Renseignez la date et l’heure du fait.');
    thenDisabled('anomalie-previsualiser');
  });

  it('should forget the date the manager had given alone when the same regularisation is proposed anew', async () => {
    await whenRendering();
    await whenClicking('anomalie-detail');
    await whenClicking('anomalie-regulariser');
    await whenEntering('anomalie-instant-date', '14/09/2026');

    await whenClicking('anomalie-regulariser');

    thenTheInstantFieldsShow('', '');
  });

  it('should forget the time the manager had given alone when the same guided choice is chosen again', async () => {
    givenAnAutomaticEnd();
    await whenRendering();
    await whenClicking('anomalie-choix');
    await whenEntering('anomalie-instant-heure', '17:00:00');

    await whenClicking('anomalie-choix');

    thenTheInstantFieldsShow('', '');
  });

  it('should ask for the date and the time while the manager has only given a time', async () => {
    givenAnAutomaticEnd();
    await whenRendering();
    await whenClicking('anomalie-choix');

    await whenEntering('anomalie-instant-heure', '17:00:00');

    thenTheInstantFieldsShow('', '17:00:00');
    thenTextContains('anomalie-validation', 'Renseignez la date et l’heure du fait.');
    thenDisabled('anomalie-previsualiser');
  });

  it('should accept the instant as soon as the missing part is given, whatever the order of the two parts', async () => {
    givenAnAutomaticEnd();
    await whenRendering();
    await whenClicking('anomalie-choix');
    await whenEntering('anomalie-instant-heure', '17:00:00');

    await whenEntering('anomalie-instant-date', '14/09/2026');

    thenTheInstantFieldsShow('14/09/2026', '17:00:00');
    thenTextDoesNotContain('anomalie-validation', 'Renseignez la date et l’heure du fait.');
  });

  it('should keep the time the manager typed and ask again for the instant when the day of a received instant is erased', async () => {
    await givenACorrectionOfTheReceivedEndWithItsReason();

    await whenEntering('anomalie-instant-date', '');

    thenTheInstantFieldsShow('', '17:00:00');
    thenTextContains('anomalie-validation', 'Renseignez la date et l’heure du fait.');
    thenDisabled('anomalie-previsualiser');
  });

  it('should ask again for the instant, without blaming the clock, when the typed time does not exist', async () => {
    await givenACorrectionOfTheReceivedEndWithItsReason();

    field('anomalie-instant-heure').focus();
    await whenEntering('anomalie-instant-heure', '25:00');

    thenTheInstantFieldsShow('14/09/2026', '25:00');
    thenTextContains('anomalie-validation', 'Renseignez la date et l’heure du fait.');
    thenTextDoesNotContain('anomalie-instant-erreur', 'Cette heure');
  });

  it('should keep the typed text and ask again for the instant when the typed day does not exist', async () => {
    await givenACorrectionOfTheReceivedEndWithItsReason();

    await whenEntering('anomalie-instant-date', '31/02/2026');

    thenTheInstantFieldsShow('31/02/2026', '17:00:00');
    thenTextContains('anomalie-validation', 'Renseignez la date et l’heure du fait.');
  });

  it('should show the received instant in local time whatever its offset', async () => {
    givenACorrectionReceivedWithAnOffset('2026-09-14T22:15:30+02:00');

    await whenRendering();
    await whenClicking('anomalie-detail');
    await whenClicking('anomalie-corriger');

    thenTheInstantFieldsShow('14/09/2026', '17:15:30');
  });

  it('should name the buttons that open the calendar and the time list in French', async () => {
    await whenRendering();
    await whenClicking('anomalie-detail');
    await whenClicking('anomalie-corriger');

    thenTheButtonInsideIsNamed('anomalie-instant-calendrier', 'Ouvrir le calendrier');
    thenTheButtonInsideIsNamed('anomalie-instant-horloge', 'Ouvrir la liste des heures');
  });

  it('should lock the instant fields and their buttons while the outcome of a write is unknown', async () => {
    givenASuccessfulPreview();
    application.result = { kind: 'ISSUE_INCONNUE' };
    await whenRendering();
    await whenPreparingTheCorrection();

    await whenClicking('anomalie-confirmer');

    thenInputIsDisabled('anomalie-instant-date');
    thenInputIsDisabled('anomalie-instant-heure');
    thenTheButtonInsideIsDisabled('anomalie-instant-calendrier');
    thenTheButtonInsideIsDisabled('anomalie-instant-horloge');
  });

  describe('in a time zone that changes hour', () => {
    const original = process.env['TZ'];

    beforeEach(() => {
      process.env['TZ'] = 'Europe/Paris';
      vi.setSystemTime(new Date(2026, 2, 29, 10, 0));
    });

    afterEach(() => {
      if (original === undefined) delete process.env['TZ'];
      else process.env['TZ'] = original;
    });

    it('should refuse an hour the clock skips and say why', async () => {
      givenAnAutomaticEnd();
      await whenRendering();
      await whenClicking('anomalie-choix');

      await whenEnteringTheInstant('29/03/2026', '02:30');

      thenTextContains('anomalie-instant-erreur', 'Cette heure n’existe pas ce jour-là, à cause du changement d’heure.');
      thenDisabled('anomalie-previsualiser');
    });

    it('should refuse an hour the clock skips on the day of the change of hour even when the instant was received that day', async () => {
      givenACorrectionReceivedWithAnOffset('2026-03-29T04:00:00+02:00');
      await whenRendering();
      await whenClicking('anomalie-detail');
      await whenClicking('anomalie-corriger');

      await whenEntering('anomalie-instant-heure', '02:30');

      thenTextContains('anomalie-instant-erreur', 'Cette heure n’existe pas ce jour-là, à cause du changement d’heure.');
      thenTheInstantFieldsShow('29/03/2026', '02:30:00');
    });

    it('should stop reproaching the skipped hour when the same guided choice is chosen again', async () => {
      givenAnAutomaticEnd();
      await whenRendering();
      await whenClicking('anomalie-choix');
      await whenEnteringTheInstant('29/03/2026', '02:30');

      await whenClicking('anomalie-choix');

      thenTextDoesNotContain('anomalie-instant-erreur', 'Cette heure');
      thenTheInstantFieldsShow('', '');
    });

    it('should stop reproaching the hour once the manager chooses one that exists', async () => {
      givenAnAutomaticEnd();
      await whenRendering();
      await whenClicking('anomalie-choix');
      await whenEnteringTheInstant('29/03/2026', '02:30');

      await whenEntering('anomalie-instant-heure', '03:30');

      thenTextDoesNotContain('anomalie-instant-erreur', 'Cette heure');
      thenTextDoesNotContain('anomalie-validation', 'Renseignez la date et l’heure du fait.');
    });

    it('should take the first occurrence of an hour the clock repeats', async () => {
      givenAnAutomaticEnd();
      givenASuccessfulPreview(undefined, acteFinRegulariseeFixture('poste-1', '2026-10-25T02:30:00+02:00'));
      await whenRendering();
      await whenClicking('anomalie-choix');
      await whenEnteringTheInstant('25/10/2026', '02:30');

      await whenClicking('anomalie-previsualiser');

      expect(preview.actes).toEqual([acteFinRegulariseeFixture('poste-1', '2026-10-25T02:30:00+02:00')]);
    });
  });

  it('should preview the end regularisation of an activity without workstation without naming one', async () => {
    givenAnAutomaticEnd(finARegulariserFixture(''));
    givenASuccessfulPreview(
      { ...dossierFinAutomatiqueFixture(), etat: 'SANS_ANOMALIE', finAutomatique: false },
      acteFinRegulariseeFixture('', '2026-09-14T17:00:00-03:00'),
    );
    await whenRendering();
    await whenClicking('anomalie-choix');

    await whenEnteringTheInstant('14/09/2026', '17:00');
    await whenClicking('anomalie-previsualiser');

    thenTextContains('anomalie-apercu-acte', 'Poste : Sans poste');
  });

  it.each([
    { code: 'CORRIGER_FIN_TARDIVE' as const, libelle: 'Corriger la fin pointée après l’échéance' },
    { code: 'CORRIGER_TRANSITION_TARDIVE' as const, libelle: 'Corriger la transition pointée après l’échéance' },
  ])('should offer the guided $code with the time of the late pointage and wait for its reason', async ({ code, libelle }) => {
    const dossier = dossierFinAutomatiqueFixture();
    read.result = {
      kind: 'DOSSIER',
      dossier: {
        ...dossier,
        choix: [
          {
            id: `${code}:tardif-30`,
            code,
            libelle: '',
            explication: '',
            saisie: SaisieActe.correct('tardif-30', { ...faitConflitFixture(), instant: '2026-09-14T23:00:00+02:00' }),
          },
        ],
      },
    };
    await whenRendering();

    await whenClicking('anomalie-choix');

    thenTextContains('anomalie-choix', libelle);
    thenTextContains('anomalie-acte', 'Correction du pointage');
    thenTheInstantFieldsShow('14/09/2026', '18:00:00');
    thenFieldValueIs('anomalie-motif', '');
    thenTextContains('anomalie-validation', 'Renseignez un motif.');
    thenDisabled('anomalie-previsualiser');
  });

  const anomalieTraiteeFixture = (['SANS_ANOMALIE', 'ANCRE_ANNULEE', 'EN_CONFLIT', 'FIN_AUTOMATIQUE'] as const).map(etat => ({
    etat,
    enConflit: false,
    finAutomatique: false,
  }));

  it.each(anomalieTraiteeFixture)(
    'should announce in the preview that the anomaly will be processed when $etat has no conflict nor automatic end left',
    async resultat => {
      givenAnEndRegularisationLeaving(resultat);
      await whenRendering();

      await whenPreviewingTheDatedEnd();

      thenTextContains('anomalie-apercu', 'Anomalie traitée après enregistrement de cette décision.');
    },
  );

  it.each(anomalieTraiteeFixture)(
    'should announce in the receipt that the anomaly is processed when $etat has no conflict nor automatic end left',
    async resultat => {
      givenAnEndRegularisationLeaving(resultat);
      await whenRendering();
      await whenPreviewingTheDatedEnd();

      await whenClicking('anomalie-confirmer');

      thenTextContains('anomalie-resultat', 'Anomalie traitée');
    },
  );

  it.each(anomalieTraiteeFixture)(
    'should not explain a conflict in the receipt when $etat has no conflict nor automatic end left',
    async resultat => {
      givenAnEndRegularisationLeaving(resultat);
      await whenRendering();
      await whenPreviewingTheDatedEnd();

      await whenClicking('anomalie-confirmer');

      thenAbsent('conflit-diagnostic');
    },
  );

  it('should not explain a conflict on a dossier read with no conflict nor automatic end left', async () => {
    const dossier = dossierAnomalieFixture();
    read.result = { kind: 'DOSSIER', dossier: { ...dossier, etat: 'SANS_ANOMALIE', enConflit: false } };

    await whenRendering();

    thenAbsent('conflit-diagnostic');
  });

  it('should not explain a conflict in the receipt of a conflict that the act resolved', async () => {
    application.result = { kind: 'APPLIQUE', dossier: { ...dossierAnomalieFixture(), version: 2, enConflit: false } };
    givenASuccessfulPreview();
    await whenRendering();
    await whenPreparingTheCorrection();

    await whenClicking('anomalie-confirmer');

    thenTextContains('anomalie-resultat', 'Anomalie traitée');
    thenAbsent('conflit-diagnostic');
  });

  const anomalieRestanteFixture = [
    { etat: 'ANCRE_ANNULEE' as const, enConflit: false, finAutomatique: true },
    { etat: 'FIN_AUTOMATIQUE' as const, enConflit: false, finAutomatique: true },
    { etat: 'ANCRE_ANNULEE' as const, enConflit: true, finAutomatique: false },
    { etat: 'EN_CONFLIT' as const, enConflit: true, finAutomatique: true },
  ];

  it.each(anomalieRestanteFixture)(
    'should keep the anomaly open in the preview when $etat has conflict $enConflit and automatic end $finAutomatique',
    async resultat => {
      givenAnEndRegularisationLeaving(resultat);
      await whenRendering();

      await whenPreviewingTheDatedEnd();

      thenTextContains('anomalie-apercu', 'Après cet acte : anomalie restante');
    },
  );

  it.each(anomalieRestanteFixture)(
    'should keep the anomaly open in the receipt when $etat has conflict $enConflit and automatic end $finAutomatique',
    async resultat => {
      givenAnEndRegularisationLeaving(resultat);
      await whenRendering();
      await whenPreviewingTheDatedEnd();

      await whenClicking('anomalie-confirmer');

      thenTextContains('anomalie-resultat', 'Acte enregistré, anomalie restante');
    },
  );

  it.each([
    { etat: 'ECHUE' as const, attendu: 'Échue · 13 h' },
    { etat: 'TERMINEE' as const, attendu: 'Terminée · 13 h' },
  ])('should list the $etat activity of an automatic end with its received duration', async ({ etat, attendu }) => {
    const dossier = dossierFinAutomatiqueFixture();
    read.result = { kind: 'DOSSIER', dossier: { ...dossier, activites: dossier.activites.map(activite => ({ ...activite, etat })) } };

    await whenRendering();

    thenTextContains('anomalie-activite', attendu);
  });

  it('should explain the loading of a dossier without calling it a conflict', () => {
    givenTheDossierIsStillLoading();

    whenRenderingWithoutWaiting();

    thenTextContains('anomalie-chargement', 'Chargement du dossier…');
  });

  const givenTheDossierIsStillLoading = (): void => {
    read.pending = new PendingResponseFixture<LectureDossier>();
  };

  const givenAnEndRegularisationLeaving = (resultat: Pick<DossierAnomalie, 'etat' | 'enConflit' | 'finAutomatique'>): void => {
    givenAnAutomaticEnd();
    const apres = { ...dossierFinAutomatiqueFixture(), ...resultat };
    givenASuccessfulPreview(apres, acteFinRegulariseeFixture('poste-1', '2026-09-14T17:00:00-03:00'));
    application.result = { kind: 'APPLIQUE', dossier: apres };
  };

  const whenPreviewingTheDatedEnd = async (): Promise<void> => {
    await whenClicking('anomalie-choix');
    await whenEnteringTheInstant('14/09/2026', '17:00:00');
    await whenClicking('anomalie-previsualiser');
  };

  const whenRenderingWithoutWaiting = (): void => {
    fixture = TestBed.createComponent(DossierAnomaliePage);
    fixture.detectChanges();
  };

  const givenAnAutomaticEnd = (saisie: SaisieActe = finARegulariserFixture()): void => {
    const dossier = dossierFinAutomatiqueFixture();
    read.result = {
      kind: 'DOSSIER',
      dossier: { ...dossier, choix: dossier.choix.map(choix => ({ ...choix, saisie })) },
    };
  };

  const givenASuccessfulPreview = (apres?: DossierAnomalie, acte: ActeResolution = acteCorrectionFixture): void => {
    const dossier = dossierAnomalieFixture();
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

  const givenAStructuredDiagnostic = (): void => {
    const dossier = dossierAnomalieFixture();
    read.result = {
      kind: 'DOSSIER',
      dossier: {
        ...dossier,
        ligne: { ...dossier.ligne, explication: '' },
        diagnostics: [
          {
            pointage: new PointageAnomalieId('fin-17'),
            raison: 'CIBLE_REMPLACEE',
            cible: {
              activite: new ActiviteAnomalieId('travail-8'),
              ouvrant: new PointageAnomalieId('debut-8'),
              termineePar: new PointageAnomalieId('nc-12'),
            },
          },
        ],
      },
    };
  };

  const givenACorrectedTerminatingFact = (): void => {
    const dossier = dossierAnomalieFixture();
    const corrected = new PointageAnomalieId('90000000-0000-0000-0000-000000000001');
    read.result = {
      kind: 'DOSSIER',
      dossier: {
        ...dossier,
        journal: [
          ...dossier.journal,
          {
            id: corrected,
            fait: {
              ...faitConflitFixture(),
              type: 'NON_CONFORMITE',
              intention: 'TRANSITION',
              instant: INSTANT_NON_CONFORMITE,
            },
            activiteCreee: new ActiviteAnomalieId('nc-12'),
            remplace: new PointageAnomalieId('nc-12'),
            operateurNom: 'Camille Martin',
            posteLibelle: 'DMU 50',
            auteur: 'gestionnaire',
            enregistre: '2026-10-04T10:00:00Z',
            regularisation: true,
          },
        ],
        diagnostics: [
          {
            pointage: new PointageAnomalieId('fin-17'),
            raison: 'CIBLE_REMPLACEE',
            cible: { activite: new ActiviteAnomalieId('travail-8'), termineePar: corrected },
          },
        ],
      },
    };
  };

  const givenTheOpeningFactReferencedByTheDiagnostic = (): void => {
    const dossier = dossierAnomalieFixture();
    read.result = {
      kind: 'DOSSIER',
      dossier: {
        ...dossier,
        journal: [
          ...dossier.journal,
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
            auteur: 'camille',
            enregistre: INSTANT_ENREGISTREMENT,
            regularisation: false,
          },
        ],
        diagnostics: [
          {
            pointage: new PointageAnomalieId('fin-17'),
            raison: 'CIBLE_REMPLACEE',
            cible: { activite: new ActiviteAnomalieId('travail-8'), ouvrant: new PointageAnomalieId('debut-8') },
          },
        ],
      },
    };
  };

  const givenAnAuthoritativeActivity = (
    etat: 'TERMINEE' | 'EN_COURS',
    duree?: string,
    categorie: 'TRAVAIL' | 'NON_CONFORMITE' = 'TRAVAIL',
  ): void => {
    const dossier = dossierAnomalieFixture();
    read.result = {
      kind: 'DOSSIER',
      dossier: {
        ...dossier,
        activites: [
          {
            id: new ActiviteAnomalieId('travail-8'),
            libelle: '',
            temps: '',
            etat,
            periode: {
              categorie,
              debut: INSTANT_DEBUT,
              ...(etat === 'TERMINEE' ? { fin: INSTANT_FIN_DE_TRAVAIL } : {}),
              ...(duree === undefined ? {} : { duree }),
            },
          },
        ],
      },
    };
  };

  const givenACancelledOpeningTargetedByTheRemainingEnd = (): void => {
    const dossier = dossierAnomalieFixture();
    read.result = {
      kind: 'DOSSIER',
      dossier: {
        ...dossier,
        activites: [],
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
            activiteCreee: new ActiviteAnomalieId('travail-8'),
            operateurNom: 'Camille Martin',
            posteLibelle: 'DMU 50',
            auteur: 'camille',
            enregistre: INSTANT_DEBUT,
            regularisation: false,
            annulation: { motif: 'Début annulé', auteur: 'gestionnaire', instant: INSTANT_ENREGISTREMENT },
          },
          ...dossier.journal,
        ],
      },
    };
  };

  const givenAReceivedFactFromAnotherYear = (): void => {
    const dossier = dossierAnomalieFixture();
    const [fait] = dossier.journal;
    if (fait === undefined) throw new Error('Expected a received fact');
    read.result = {
      kind: 'DOSSIER',
      dossier: { ...dossier, journal: [{ ...fait, fait: { ...fait.fait, instant: new Date(2025, 9, 1, 9, 41, 22).toISOString() } }] },
    };
  };

  const givenAnIncompletePath = (): void => {
    route.paramMap.next(convertToParamMap({}));
  };

  const whenPreparingTheCorrection = async (): Promise<void> => {
    await whenClicking('anomalie-choix');
    await whenEntering('anomalie-motif', 'Cible confirmée');
    await whenClicking('anomalie-previsualiser');
  };

  const givenACorrectionOfTheReceivedEndWithItsReason = async (): Promise<void> => {
    await whenRendering();
    await whenClicking('anomalie-detail');
    await whenClicking('anomalie-corriger');
    await whenEntering('anomalie-motif', 'Cible confirmée');
  };

  const givenACorrectionReceivedWithAnOffset = (instant: string): void => {
    const dossier = dossierAnomalieFixture();
    read.result = {
      kind: 'DOSSIER',
      dossier: { ...dossier, journal: dossier.journal.map(pointage => ({ ...pointage, fait: { ...pointage.fait, instant } })) },
    };
  };

  const whenEnteringTheInstant = async (date: string, time: string): Promise<void> => {
    await whenEntering('anomalie-instant-date', date);
    await whenEntering('anomalie-instant-heure', time);
  };

  const whenEntering = async (selector: string, value: string): Promise<void> => {
    const input = field(selector);
    input.value = value;
    input.dispatchEvent(new Event(input instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
    await fixture.whenStable();
  };

  const whenAddressChanges = async (pointage: string): Promise<void> => {
    route.queryParamMap.next(convertToParamMap({ pointage }));
    await fixture.whenStable();
  };

  const whenAddressBecomesIncomplete = async (): Promise<void> => {
    route.queryParamMap.next(convertToParamMap({}));
    await fixture.whenStable();
  };

  const whenStartingClick = (selector: string): void => {
    element(selector).click();
  };

  const whenResponseArrives = async <T>(pending: PendingResponseFixture<T>, result: T): Promise<void> => {
    pending.release(result);
    await pending.completion;
    await fixture.whenStable();
  };

  const whenResponseFails = async <T>(pending: PendingResponseFixture<T>, failure: Error): Promise<void> => {
    pending.fail(failure);
    await Promise.allSettled([pending.completion]);
    await fixture.whenStable();
  };

  const whenClicking = async (selector: string): Promise<void> => {
    element(selector).click();
    await Promise.allSettled([
      ...preview.replies.automaticResponses,
      ...application.replies.automaticResponses,
      ...application.receiptReplies.automaticResponses,
    ]);
    await fixture.whenStable();
  };

  const whenFollowingTheDiagnosticReference = async (selector: string): Promise<void> => {
    await whenClicking(selector);
    await roundTripFixture(() => undefined);
    await fixture.whenStable();
  };

  const whenClosingTheReceivedTrace = async (pointage: string): Promise<void> => {
    requiredFixture(receivedFact(pointage).querySelector('summary'), 'received trace summary').click();
    await roundTripFixture(() => undefined);
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

  const field = (selector: string): HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement => {
    const found = element(selector);
    if (isField(found)) return found;
    throw new Error(`Expected a field ${selector}`);
  };

  const isField = (element: HTMLElement): element is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement =>
    element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement;

  const present = (selector: string): boolean => (fixture.nativeElement as HTMLElement).querySelector(dataSelector(selector)) !== null;
  const thenTextContains = (selector: string, expected: string): void => {
    expect(element(selector).textContent).toContain(expected);
  };
  const thenDiagnosticReferencesTheReceivedFact = (selector: string, pointage: string, label: string): void => {
    const link = element(selector);
    expect(new URL(requiredFixture(link.getAttribute('href'), 'diagnostic link'), 'https://fixture').hash).toBe(`#pointage-${pointage}`);
    expect(link.textContent.replace(/\s+/g, ' ').trim()).toBe(label);
    expect(receivedFact(pointage).id).toBe(`pointage-${pointage}`);
  };
  const thenReceivedFactContains = (pointage: string, expected: string): void => {
    expect(receivedFact(pointage).textContent).toContain(expected);
  };
  const thenReceivedFactDoesNotContain = (pointage: string, expected: string): void => {
    expect(receivedFact(pointage).textContent).not.toContain(expected);
  };
  const thenReceivedFactTimeIs = (pointage: string, expected: string): void => {
    expect(receivedFactTime(pointage).textContent.replace(/\s+/g, ' ').trim()).toBe(expected);
  };
  const thenReceivedFactDatetimeIs = (pointage: string, expected: string): void => {
    expect(receivedFactTime(pointage).getAttribute('datetime')).toBe(expected);
  };
  const receivedFactTime = (pointage: string): HTMLElement =>
    requiredFixture(receivedFact(pointage).querySelector<HTMLElement>('time'), 'received fact time');
  const thenReceivedFactDetailsAreOpen = (pointage: string): void => {
    expect(receivedFact(pointage).querySelector<HTMLDetailsElement>('details')?.open).toBe(true);
  };
  const receivedFact = (pointage: string): HTMLElement => {
    const journal = [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(dataSelector('anomalie-pointage'))];
    return requiredFixture(
      journal.find(fact => fact.id === `pointage-${pointage}`),
      'referenced journal fact',
    );
  };
  const thenHeadingOfThePageIs = (expected: string): void => {
    expect((fixture.nativeElement as HTMLElement).querySelector('h1')?.textContent).toBe(expected);
  };
  const thenPageDoesNotMention = (word: string): void => {
    expect((fixture.nativeElement as HTMLElement).textContent.toLowerCase()).not.toContain(word);
  };
  const thenInterpretationIsSelected = (): void => {
    expect(element('anomalie-choix').getAttribute('aria-pressed')).toBe('true');
  };
  const thenHeadingContains = (expected: string): void => {
    expect((fixture.nativeElement as HTMLElement).querySelector('header')?.textContent).toContain(expected);
  };
  const thenHeadingDoesNotContain = (expected: string): void => {
    expect((fixture.nativeElement as HTMLElement).querySelector('header')?.textContent).not.toContain(expected);
  };
  const thenTextDoesNotContain = (selector: string, expected: string): void => {
    expect(element(selector).textContent).not.toContain(expected);
  };
  const thenTextDoesNotContainAnIdentifier = (selector: string): void => {
    expect(element(selector).textContent).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-/i);
  };
  const thenAbsent = (selector: string): void => {
    expect(present(selector)).toBe(false);
  };
  const thenFieldValueIs = (selector: string, expected: string): void => {
    expect(field(selector).value).toBe(expected);
  };
  const thenTheInstantFieldsShow = (date: string, time: string): void => {
    thenFieldValueIs('anomalie-instant-date', date);
    thenFieldValueIs('anomalie-instant-heure', time);
  };
  const thenTargetChoiceIs = (reference: string, libelle: string): void => {
    const cible = field('anomalie-cible');
    if (!(cible instanceof HTMLSelectElement)) throw new Error('Expected an activity choice');
    expect(cible.value).toBe(reference);
    expect(cible.selectedOptions[0]?.textContent).toContain(libelle);
  };
  const thenDisabled = (selector: string): void => {
    const button = element(selector);
    if (!(button instanceof HTMLButtonElement)) throw new Error('Expected a button');
    expect(button.disabled).toBe(true);
  };
  const thenInputIsDisabled = (selector: string): void => {
    expect(field(selector).disabled).toBe(true);
  };
  const thenTheButtonInsideIsDisabled = (selector: string): void => {
    expect(element(selector).querySelector('button')?.disabled).toBe(true);
  };
  const thenTheButtonInsideIsNamed = (selector: string, name: string): void => {
    expect(element(selector).querySelector('button')?.getAttribute('aria-label')).toBe(name);
  };
  const thenNoInterpretationIsSelected = (): void => {
    expect(element('anomalie-choix').getAttribute('aria-pressed')).toBe('false');
  };
  const thenDetailedFactIsOpen = (): void => {
    const detail = element('anomalie-champs-detail').parentElement;
    if (!(detail instanceof HTMLDetailsElement)) throw new Error('Expected detailed fact');
    expect(detail.open).toBe(true);
  };
  const thenNothingIsChosen = (selectors: readonly string[]): void => {
    for (const selector of selectors) {
      const radio = field(selector);
      if (!(radio instanceof HTMLInputElement)) throw new Error('Expected a radio');
      expect(radio.checked).toBe(false);
    }
  };
});

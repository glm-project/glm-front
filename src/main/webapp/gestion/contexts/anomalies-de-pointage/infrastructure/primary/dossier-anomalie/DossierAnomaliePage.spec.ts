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
    return roundTripFixture(() => ({ lignes: [], total: 0, complete: true }));
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
  result: ResultatApercu = { kind: 'REFUS', raison: 'Le pointage est déjà annulé.' };

  preview(_adresse: AdresseDossier, _version: number, acte: ActeResolution): Promise<ResultatApercu> {
    this.actes.push(acte);
    return this.replies.answer(this.result);
  }
}

class DossierApplicationFixture extends ApplicationActePort {
  readonly replies = new RepliesFixture<ResultatApplication>();
  readonly receiptReplies = new RepliesFixture<ResultatVerification>();
  result: ResultatApplication = { kind: 'REFUS', raison: 'Le pointage est déjà annulé.' };
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
  createUrlTree(_commands: unknown[], extras?: { queryParams?: Record<string, string>; fragment?: string | null }) {
    return { queryParams: extras?.queryParams ?? {}, fragment: extras?.fragment ?? null };
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
  instant: '2026-09-14T17:00:00.123456789+02:00',
});

const dossierAnomalieFixture = (): DossierAnomalie => ({
  ligne: {
    adresse: { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('fin-17') },
    element: new ElementAnomalieId('moule-42'),
    designation: 'M-042',
    operateur: 'Camille Martin',
    poste: 'DMU 50',
    date: '14 septembre 2026',
    explication: 'La fin vise le travail remplacé.',
    nombrePointages: 1,
  },
  version: 1,
  cloture: false,
  engagement: 'ENGAGE',
  journal: [
    {
      id: new PointageAnomalieId('fin-17'),
      fait: faitConflitFixture(),
      auteur: 'camille',
      enregistre: '2026-09-15T08:00:00+02:00',
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
  consequences: [],
  continuations: [],
});

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

describe('Conflict dossier page', () => {
  let fixture: ComponentFixture<DossierAnomaliePage>;
  let read: DossierReadFixture;
  let route: RouteFixture;
  let preview: DossierPreviewFixture;
  let application: DossierApplicationFixture;

  beforeEach(() => {
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

  it('should offer a retry when reading fails without showing a misleading dossier', async () => {
    read.failure = new Error('Dossier indisponible');

    await whenRendering();

    thenTextContains('conflit-retry', 'Réessayer');
    thenAbsent('conflit-diagnostic');
  });

  it('should reacquire the dossier after the manager explicitly retries an unavailable reading', async () => {
    read.failure = new Error('Dossier indisponible');
    await whenRendering();
    read.failure = undefined;

    await whenClicking('conflit-retry');

    thenTextContains('conflit-diagnostic', 'La fin vise le travail remplacé.');
    thenAbsent('conflit-retry');
    expect(read.demandes).toHaveLength(2);
  });

  it('should explain the explicit target and termination supplied by the conflict diagnostic', async () => {
    givenAStructuredDiagnostic();

    await whenRendering();

    thenDiagnosticReferencesTheReceivedFact(
      'conflit-diagnostic-pointage',
      'fin-17',
      '2026-09-14T17:00:00.123456789+02:00 · Fin · Fin ciblée',
    );
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
      '2026-09-14T12:01:00.123456789+02:00 · Non-conformité · Transition',
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

    thenDiagnosticReferencesTheReceivedFact(
      'conflit-diagnostic-pointage',
      'fin-17',
      '2026-09-14T17:00:00.123456789+02:00 · Fin · Fin ciblée',
    );
    thenDiagnosticReferencesTheReceivedFact('conflit-diagnostic-ouvrant', 'debut-8', '2026-09-14T08:00:00+02:00 · Travail · Ouverture');
  });

  it('should reject an address missing its suivi without requesting a dossier', async () => {
    givenAnIncompletePath();

    await whenRendering();

    thenTextContains('conflit-adresse-invalide', 'L’adresse doit préciser');
    thenAbsent('conflit-diagnostic');
    expect(read.demandes).toHaveLength(0);
  });

  it('should retain the available journal when the addressed anchor was cancelled', async () => {
    read.result = { kind: 'ANCRE_ANNULEE', journal: dossierAnomalieFixture().journal };

    await whenRendering();

    thenTextContains('conflit-adresse-obsolete', 'annulé ou remplacé');
    thenTextContains('conflit-historique', '2026-09-14T17:00:00.123456789+02:00');
    thenAbsent('conflit-choix');
  });

  it('should display a dossier with only resolution controls', async () => {
    await whenRendering();

    thenAbsent('conflits-demo');
    thenTextContains('conflit-cloture', 'Ouvert');
  });

  it('should retain unresolved reference identities in the dossier heading', async () => {
    const dossier = dossierAnomalieFixture();
    read.result = {
      kind: 'DOSSIER',
      dossier: { ...dossier, ligne: { ...dossier.ligne, operateur: '', poste: '', operateurId: 'op-absent', posteId: 'poste-absent' } },
    };

    await whenRendering();

    thenHeadingContains('Opérateur non résolu · op-absent');
    thenHeadingContains('Poste non résolu · poste-absent');
  });

  it('should explain an unresolved activity without presenting an empty duration', async () => {
    const dossier = dossierAnomalieFixture();
    read.result = { kind: 'DOSSIER', dossier: { ...dossier, activites: dossier.activites.map(activite => ({ ...activite, temps: '' })) } };

    await whenRendering();

    thenTextContains('conflit-activite', 'À résoudre · Temps à résoudre');
  });

  it('should label an explicit continuation from its authoritative sequence instead of presenting an empty link', async () => {
    const dossier = dossierAnomalieFixture();
    read.result = {
      kind: 'DOSSIER',
      dossier: { ...dossier, continuations: [{ ...dossier.ligne, explication: '', nombrePointages: 3 }] },
    };

    await whenRendering();

    thenTextContains('conflit-continuation', 'M-042 · Camille Martin · 14 septembre 2026 · 3 pointages');
  });

  it.each([
    { operateur: '', operateurId: 'op-absent', explication: '', attendu: 'M-042 · op-absent · 14 septembre 2026 · 3 pointages' },
    {
      operateur: 'Camille Martin',
      operateurId: 'op-camille',
      explication: 'Autre fin contradictoire.',
      attendu: 'Autre fin contradictoire.',
    },
  ])('should retain the continuation information $attendu', async ({ operateur, operateurId, explication, attendu }) => {
    const dossier = dossierAnomalieFixture();
    read.result = {
      kind: 'DOSSIER',
      dossier: { ...dossier, continuations: [{ ...dossier.ligne, operateur, operateurId, explication, nombrePointages: 3 }] },
    };

    await whenRendering();

    thenTextContains('conflit-continuation', attendu);
  });

  it('should distinguish a missing workstation from an unresolved workstation in the heading', async () => {
    const dossier = dossierAnomalieFixture();
    read.result = { kind: 'DOSSIER', dossier: { ...dossier, ligne: { ...dossier.ligne, poste: '' } } };

    await whenRendering();

    thenHeadingContains('Camille Martin · Sans poste · 14 septembre 2026');
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

    thenTextContains('conflit-activite', 'En cours · Temps non définitif');
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

      await whenClicking('conflit-choix');

      thenTextContains('conflit-choix', libelle);
      thenFieldValueIs('conflit-motif', '');
      thenAbsent('conflit-apercu');
    },
  );

  it('should present the exact authoritative period and duration of finished work', async () => {
    givenAnAuthoritativeActivity('TERMINEE', 'PT8H59M59.876543211S');

    await whenRendering();

    thenTextContains('conflit-activite', 'Travail');
    thenTextContains('conflit-activite', '2026-09-14T08:00:00.123456789+02:00');
    thenTextContains('conflit-activite', '2026-09-14T17:00:00+02:00');
    thenTextContains('conflit-activite', '8 h 59 min 59,876543211 s');
  });

  it('should retain the finished duration supplied by the dossier', async () => {
    const dossier = dossierAnomalieFixture();
    read.result = {
      kind: 'DOSSIER',
      dossier: { ...dossier, activites: [{ id: new ActiviteAnomalieId('travail-8'), libelle: 'Travail', etat: 'TERMINEE', temps: '4 h' }] },
    };

    await whenRendering();

    thenTextContains('conflit-activite', 'Terminée · 4 h');
  });

  it('should describe ongoing authoritative work without a definitive duration', async () => {
    givenAnAuthoritativeActivity('EN_COURS', 'PT3H');

    await whenRendering();

    thenTextContains('conflit-activite', 'En cours · Temps non définitif');
    thenTextDoesNotContain('conflit-activite', '3 h');
  });

  it.each([
    { duree: 'PT0S', attendu: '0 s' },
    { duree: 'PT45M', attendu: '45 min' },
    { duree: 'PT24H', attendu: '24 h' },
    { duree: 'durée reçue', attendu: 'durée reçue' },
  ])('should present the received non-conformity duration $duree', async ({ duree, attendu }) => {
    givenAnAuthoritativeActivity('TERMINEE', duree, 'NON_CONFORMITE');

    await whenRendering();

    thenTextContains('conflit-activite', 'Non-conformité');
    thenTextContains('conflit-activite', attendu);
  });

  it('should show the attested canonical dossier when the original address has become obsolete', async () => {
    givenASuccessfulPreview();
    application.result = { kind: 'ISSUE_INCONNUE' };
    application.verification = { kind: 'ATTESTE', dossier: { ...dossierAnomalieFixture(), version: 3, enConflit: false } };
    await whenRendering();
    await whenPreparingTheCorrection();
    await whenClicking('conflit-confirmer');
    read.result = { kind: 'ANCRE_ANNULEE', journal: dossierAnomalieFixture().journal };

    await whenClicking('conflit-verifier');

    thenTextContains('conflit-resultat', 'Conflit résolu');
    thenAbsent('conflit-adresse-obsolete');
  });

  it('should recover the canonical receipt even when an ordinary dossier read is unavailable', async () => {
    givenASuccessfulPreview();
    application.result = { kind: 'ISSUE_INCONNUE' };
    application.verification = { kind: 'ATTESTE', dossier: { ...dossierAnomalieFixture(), version: 3, enConflit: false } };
    await whenRendering();
    await whenPreparingTheCorrection();
    await whenClicking('conflit-confirmer');
    read.failure = new Error('Lecture ordinaire indisponible');

    await whenClicking('conflit-verifier');

    thenTextContains('conflit-resultat', 'Conflit résolu');
    thenAbsent('conflit-retry');
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

    thenTextContains('conflit-apercu-activite-apres', 'Travail commencé à 8 h · En cours · Temps non définitif');
  });

  it('should keep new decisions blocked when the confirmation receipt is not attested', async () => {
    givenASuccessfulPreview();
    application.result = { kind: 'ISSUE_INCONNUE' };
    await whenRendering();

    await whenPreparingTheCorrection();
    await whenClicking('conflit-confirmer');
    await whenClicking('conflit-verifier');

    thenTextContains('conflit-operation', 'L’issue de l’écriture est inconnue');
    thenDisabled('conflit-choix');
    thenFieldValueIs('conflit-motif', 'Cible confirmée');
    expect(read.demandes).toHaveLength(1);
  });

  it('should clear the displayed interpretation only after the receipt attests the unknown write', async () => {
    givenASuccessfulPreview();
    application.result = { kind: 'ISSUE_INCONNUE' };
    application.verification = { kind: 'ATTESTE', dossier: { ...dossierAnomalieFixture(), version: 2 } };
    await whenRendering();

    await whenPreparingTheCorrection();
    await whenClicking('conflit-confirmer');
    await whenClicking('conflit-verifier');

    thenNoInterpretationIsSelected();
    thenAbsent('conflit-acte');
  });

  it('should explicitly resume the same uncertain confirmation and display its canonical result', async () => {
    givenASuccessfulPreview();
    application.result = { kind: 'ISSUE_INCONNUE' };
    await whenRendering();
    await whenPreparingTheCorrection();
    await whenClicking('conflit-confirmer');
    await whenClicking('conflit-verifier');
    application.result = { kind: 'APPLIQUE', dossier: { ...dossierAnomalieFixture(), version: 3, enConflit: false } };

    await whenClicking('conflit-reprendre-confirmation');

    thenTextContains('conflit-resultat', 'Conflit résolu');
    thenAbsent('conflit-reprendre-confirmation');
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
        finCloture: '2026-09-14T18:00:00+02:00',
        ligne: { ...dossier.ligne, explication: 'Reprise encore à rattacher.' },
      },
    };
    await whenRendering();

    await whenPreparingTheCorrection();
    await whenClicking('conflit-confirmer');

    thenTextContains('conflit-diagnostic', 'Reprise encore à rattacher.');
    thenTextContains('conflit-cloture', 'Clôturé');
    thenTextContains('conflit-resultat', 'Acte enregistré, conflit restant');
    thenAbsent('conflit-apercu');
  });

  it('should preserve the detailed proposition when the preview is refused', async () => {
    await whenRendering();

    await whenPreparingTheCorrection();

    thenTextContains('conflit-operation', 'Acte refusé');
    thenTextContains('conflit-refus', 'Le pointage est déjà annulé.');
    thenFieldValueIs('conflit-motif', 'Cible confirmée');
    thenAbsent('conflit-apercu');
  });

  it('should retain the obsolete proposition through a failed reacquisition and require an explicit new preview after recovery', async () => {
    givenASuccessfulPreview();
    application.result = { kind: 'CONCURRENCE' };
    await whenRendering();
    await whenPreparingTheCorrection();
    read.failure = new Error('Dossier courant indisponible');

    await whenClicking('conflit-confirmer');
    const echecVisible = present('conflit-retry');
    const confirmationApresEchec = present('conflit-confirmer');
    const apercuApresEchec = present('conflit-apercu');
    read.failure = undefined;
    const dossier = dossierAnomalieFixture();
    read.result = { kind: 'DOSSIER', dossier: { ...dossier, version: 2 } };
    await whenClicking('conflit-retry');

    expect(echecVisible).toBe(true);
    expect(confirmationApresEchec).toBe(false);
    expect(apercuApresEchec).toBe(false);
    thenFieldValueIs('conflit-motif', 'Cible confirmée');
    thenAbsent('conflit-apercu');
    thenAbsent('conflit-confirmer');
    thenTextContains('conflit-operation', 'Les données ont changé. Vérifiez un nouvel aperçu avant de confirmer.');
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
    thenTextContains('conflit-operation', 'Les données ont changé. Vérifiez un nouvel aperçu avant de confirmer.');
    thenFieldValueIs('conflit-motif', 'Cible confirmée');
    thenAbsent('conflit-apercu');
    expect(read.demandes).toHaveLength(2);
  });

  it('should keep the unknown outcome blocked when canonical verification fails', async () => {
    givenASuccessfulPreview();
    application.result = { kind: 'ISSUE_INCONNUE' };
    await whenRendering();
    await whenPreparingTheCorrection();
    await whenClicking('conflit-confirmer');
    const attente = new PendingResponseFixture<ResultatVerification>();
    application.receiptReplies.pending = attente;

    whenStartingClick('conflit-verifier');
    await attente.arrival;
    await whenResponseFails(attente, new Error('Vérification indisponible'));

    expect(present('conflit-verifier')).toBe(true);
    thenTextContains('conflit-operation', 'L’issue de l’écriture est inconnue');
    thenDisabled('conflit-choix');
    thenFieldValueIs('conflit-motif', 'Cible confirmée');
    thenAbsent('conflit-apercu');
  });

  it('should discard the former dossier proposition when its address changes reactively', async () => {
    await whenRendering();
    await whenClicking('conflit-choix');
    await whenEntering('conflit-motif', 'Ancienne décision');
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
    thenAbsent('conflit-acte');
    thenAbsent('conflit-apercu');
    expect(read.demandes).toHaveLength(2);
  });

  it('should start detailed correction with the selected pointage facts unchanged', async () => {
    await whenRendering();

    await whenClicking('conflit-detail');
    await whenClicking('conflit-corriger');

    thenTextContains('conflit-acte', 'Correction du pointage');
    thenFieldValueIs('conflit-cible', 'travail-8');
    thenFieldValueIs('conflit-instant', '2026-09-14T17:00:00.123456789+02:00');
    thenDetailedFactIsOpen();
  });

  it('should name the received activity interval in the journal target and correction choices', async () => {
    givenAnAuthoritativeActivity('TERMINEE', 'PT4H');
    await whenRendering();

    await whenClicking('conflit-detail');
    await whenClicking('conflit-corriger');

    const libelle = 'Travail · 2026-09-14T08:00:00.123456789+02:00 → 2026-09-14T17:00:00+02:00';
    thenTextContains('conflit-pointage', libelle);
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

    await whenClicking('conflit-detail');
    await whenClicking('conflit-corriger');
    await whenEntering('conflit-cible', 'nc-12');
    await whenEntering('conflit-motif', 'Cible confirmée');
    await whenClicking('conflit-previsualiser');

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

    await whenClicking('conflit-choix');

    thenTargetChoiceIs('nc-12', 'nc-12');
  });

  it('should let the manager explicitly choose no target activity when correcting an opening', async () => {
    await whenRendering();

    await whenClicking('conflit-detail');
    await whenClicking('conflit-corriger');
    await whenClicking('conflit-type-DEBUT');
    await whenClicking('conflit-intention-OUVERTURE');
    await whenEntering('conflit-cible', '');
    await whenEntering('conflit-motif', 'Ouverture confirmée');
    await whenClicking('conflit-previsualiser');

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
              instant: '2026-09-14T08:00:00+02:00',
            },
            activiteCreee: new ActiviteAnomalieId('travail-8'),
            auteur: 'camille',
            enregistre: '2026-09-14T08:00:00+02:00',
            regularisation: false,
            annulation: { motif: 'Début annulé', auteur: 'gestionnaire', instant: '2026-09-15T08:00:00+02:00' },
          },
          ...dossier.journal,
        ],
      },
    };
    await whenRendering();

    await whenClicking('conflit-detail');
    await whenClicking('conflit-corriger');

    thenTargetChoiceIs('travail-8', 'Travail à 08:00:00');
    thenAbsent('conflit-activite');
  });

  it('should stop presenting the guided interpretation as selected after the manager changes its target', async () => {
    await whenRendering();
    await whenClicking('conflit-choix');

    await whenClicking('conflit-champs-detail');
    await whenEntering('conflit-cible', 'travail-8');

    thenTargetChoiceIs('travail-8', 'Travail ouvert à 8 h');
    thenNoInterpretationIsSelected();
  });

  it('should expose cancellation without transforming the chosen pointage fact', async () => {
    await whenRendering();

    await whenClicking('conflit-detail');
    await whenClicking('conflit-annuler');

    thenTextContains('conflit-acte', 'Annulation du pointage');
    thenTextContains('conflit-pointage', '2026-09-14T17:00:00.123456789+02:00');
    thenAbsent('conflit-cible');
    thenFieldValueIs('conflit-motif', '');
  });

  it('should open detailed regularisation without any selected type or intention', async () => {
    await whenRendering();

    await whenClicking('conflit-detail');
    await whenClicking('conflit-regulariser');

    thenTextContains('conflit-acte', 'Régularisation d’un fait manquant');
    thenNothingIsChosen([
      'conflit-type-DEBUT',
      'conflit-type-NON_CONFORMITE',
      'conflit-type-FIN',
      'conflit-intention-OUVERTURE',
      'conflit-intention-TRANSITION',
      'conflit-intention-FIN',
    ]);
    thenDetailedFactIsOpen();
    thenAbsent('conflit-motif');
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
    thenAbsent('conflit-acte');
    thenAbsent('conflit-apercu');
    thenAbsent('conflit-operation');
  });

  it('should keep a later unknown outcome blocked when an earlier verification returns after leaving and reopening the same dossier', async () => {
    givenASuccessfulPreview();
    application.result = { kind: 'ISSUE_INCONNUE' };
    await whenRendering();
    await whenPreparingTheCorrection();
    await whenClicking('conflit-confirmer');
    const ancienneVerification = new PendingResponseFixture<ResultatVerification>();
    application.receiptReplies.pending = ancienneVerification;

    whenStartingClick('conflit-verifier');
    await ancienneVerification.arrival;
    read.result = { kind: 'DOSSIER', dossier: dossierAtFixture('fin-18', 'Autre contradiction.') };
    await whenAddressChanges('fin-18');
    read.result = { kind: 'DOSSIER', dossier: dossierAnomalieFixture() };
    await whenAddressChanges('fin-17');
    await whenPreparingTheCorrection();
    await whenClicking('conflit-confirmer');
    await whenResponseArrives(ancienneVerification, {
      kind: 'ATTESTE',
      dossier: { ...dossierAnomalieFixture(), version: 3, enConflit: false },
    });

    thenDisabled('conflit-choix');
    thenTextContains('conflit-operation', 'L’issue de l’écriture est inconnue');
    thenFieldValueIs('conflit-motif', 'Cible confirmée');
  });

  it('should abandon the confirmed dossier when its address becomes incomplete before the write response arrives', async () => {
    givenASuccessfulPreview();
    const attente = new PendingResponseFixture<ResultatApplication>();
    application.replies.pending = attente;
    await whenRendering();
    await whenPreparingTheCorrection();
    await whenClicking('conflit-confirmer');
    await attente.arrival;

    await whenAddressBecomesIncomplete();
    await whenResponseArrives(attente, { kind: 'APPLIQUE', dossier: { ...dossierAnomalieFixture(), version: 2, enConflit: false } });

    thenAbsent('conflit-diagnostic');
    thenAbsent('conflit-acte');
    thenTextContains('conflit-adresse-invalide', 'L’adresse doit préciser');
  });

  const givenASuccessfulPreview = (apres?: DossierAnomalie): void => {
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
        acte: {
          kind: 'CORRECTION',
          pointage: 'fin-17',
          motif: 'Cible confirmée',
          fait: { ...faitConflitFixture(), activiteVisee: 'nc-12' },
        },
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
              instant: '2026-09-14T12:01:00.123456789+02:00',
            },
            activiteCreee: new ActiviteAnomalieId('nc-12'),
            remplace: new PointageAnomalieId('nc-12'),
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
              instant: '2026-09-14T08:00:00+02:00',
            },
            auteur: 'camille',
            enregistre: '2026-09-15T08:00:00Z',
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
              debut: '2026-09-14T08:00:00.123456789+02:00',
              ...(etat === 'TERMINEE' ? { fin: '2026-09-14T17:00:00+02:00' } : {}),
              ...(duree === undefined ? {} : { duree }),
            },
          },
        ],
      },
    };
  };

  const givenAnIncompletePath = (): void => {
    route.paramMap.next(convertToParamMap({}));
  };

  const whenPreparingTheCorrection = async (): Promise<void> => {
    await whenClicking('conflit-choix');
    await whenEntering('conflit-motif', 'Cible confirmée');
    await whenClicking('conflit-previsualiser');
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
  const thenReceivedFactDetailsAreOpen = (pointage: string): void => {
    expect(receivedFact(pointage).querySelector<HTMLDetailsElement>('details')?.open).toBe(true);
  };
  const receivedFact = (pointage: string): HTMLElement => {
    const journal = [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(dataSelector('conflit-pointage'))];
    return requiredFixture(
      journal.find(fact => fact.id === `pointage-${pointage}`),
      'referenced journal fact',
    );
  };
  const thenHeadingContains = (expected: string): void => {
    expect((fixture.nativeElement as HTMLElement).querySelector('header')?.textContent).toContain(expected);
  };
  const thenTextDoesNotContain = (selector: string, expected: string): void => {
    expect(element(selector).textContent).not.toContain(expected);
  };
  const thenAbsent = (selector: string): void => {
    expect(present(selector)).toBe(false);
  };
  const thenFieldValueIs = (selector: string, expected: string): void => {
    expect(field(selector).value).toBe(expected);
  };
  const thenTargetChoiceIs = (reference: string, libelle: string): void => {
    const cible = field('conflit-cible');
    if (!(cible instanceof HTMLSelectElement)) throw new Error('Expected an activity choice');
    expect(cible.value).toBe(reference);
    expect(cible.selectedOptions[0]?.textContent).toContain(libelle);
  };
  const thenDisabled = (selector: string): void => {
    const button = element(selector);
    if (!(button instanceof HTMLButtonElement)) throw new Error('Expected a button');
    expect(button.disabled).toBe(true);
  };
  const thenNoInterpretationIsSelected = (): void => {
    expect(element('conflit-choix').getAttribute('aria-pressed')).toBe('false');
  };
  const thenDetailedFactIsOpen = (): void => {
    const detail = element('conflit-champs-detail').parentElement;
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

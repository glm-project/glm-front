import { ActeResolution, FaitPropose } from '@/gestion/contexts/resolution-conflits/domain/acte/ActeResolution';
import { SaisieActe } from '@/gestion/contexts/resolution-conflits/domain/acte/SaisieActe';
import { ActiviteConflitId } from '@/gestion/contexts/resolution-conflits/domain/dossier/ActiviteConflitId';
import { DossierConflit } from '@/gestion/contexts/resolution-conflits/domain/dossier/DossierConflit';
import { ElementConflitId } from '@/gestion/contexts/resolution-conflits/domain/dossier/ElementConflitId';
import { PointageConflitId } from '@/gestion/contexts/resolution-conflits/domain/dossier/PointageConflitId';
import { SuiviConflitId } from '@/gestion/contexts/resolution-conflits/domain/dossier/SuiviConflitId';

import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, ParamMap, Router } from '@angular/router';
import { dataSelector } from '@test/utils/DataSelector';
import { requiredFixture } from '@test/utils/RequiredFixture';
import { BehaviorSubject, EMPTY } from 'rxjs';
import {
  ApplicationActePort,
  PrevisualisationConflitPort,
  ResultatApercu,
  ResultatApplication,
  ResultatVerification,
} from '../../../domain/acte/ConflitsActesPorts';
import { ConflitsReadPort } from '../../../domain/dossier/ConflitsReadPort';
import { ConflitsRightsPort } from '../../../domain/dossier/ConflitsRightsPort';
import { DemonstrationConflitsPort, IncidentDemo } from '../../../domain/dossier/DemonstrationConflitsPort';
import { AdresseDossier, LectureDossier, PageConflits } from '../../../domain/dossier/DossierConflit';
import { DossierConflitPage } from './DossierConflitPage';

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

class DossierReadFixture extends ConflitsReadPort {
  failure: Error | undefined;
  result: LectureDossier = { kind: 'DOSSIER', dossier: dossierConflitFixture() };
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

  list(): Promise<PageConflits> {
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

class DossierPreviewFixture extends PrevisualisationConflitPort {
  readonly replies = new RepliesFixture<ResultatApercu>();
  readonly actes: ActeResolution[] = [];
  result: ResultatApercu = { kind: 'LIMITATION', raison: 'Commande hors scénario.' };

  preview(_adresse: AdresseDossier, _version: number, acte: ActeResolution): Promise<ResultatApercu> {
    this.actes.push(acte);
    return this.replies.answer(this.result);
  }
}

class DossierApplicationFixture extends ApplicationActePort {
  readonly replies = new RepliesFixture<ResultatApplication>();
  result: ResultatApplication = { kind: 'ECHEC_CERTAIN' };
  verification: ResultatVerification = { kind: 'NON_ATTESTE' };

  apply(): Promise<ResultatApplication> {
    return this.replies.answer(this.result);
  }

  verify(): Promise<ResultatVerification> {
    return roundTripFixture(() => this.verification);
  }
}

class DemonstrationFixture extends DemonstrationConflitsPort {
  armed: IncidentDemo | undefined;
  readonly automaticResponses: Promise<void>[] = [];

  reset(): Promise<void> {
    const response = roundTripFixture(() => undefined);
    this.automaticResponses.push(response);
    return response;
  }

  arm(incident: IncidentDemo): void {
    this.armed = incident;
  }
}

class RouteFixture {
  readonly paramMap = new BehaviorSubject<ParamMap>(convertToParamMap({ suivi: 'suivi-camille' }));
  readonly queryParamMap = new BehaviorSubject<ParamMap>(convertToParamMap({ pointage: 'fin-17' }));
}

class RouterFixture {
  readonly events = EMPTY;
  createUrlTree(_commands: unknown[], extras?: { queryParams?: Record<string, string> }): Record<string, string> {
    return extras?.queryParams ?? {};
  }
  serializeUrl(tree: Record<string, string>): string {
    return `/?${new URLSearchParams(tree).toString()}`;
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

const dossierConflitFixture = (): DossierConflit => ({
  ligne: {
    adresse: { suivi: new SuiviConflitId('suivi-camille'), pointage: new PointageConflitId('fin-17') },
    element: new ElementConflitId('moule-42'),
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
      id: new PointageConflitId('fin-17'),
      fait: faitConflitFixture(),
      auteur: 'camille',
      enregistre: '2026-09-15T08:00:00+02:00',
      regularisation: false,
    },
  ],
  activites: [{ id: new ActiviteConflitId('travail-8'), libelle: 'Travail ouvert à 8 h', etat: 'A_RESOUDRE', temps: 'À résoudre' }],
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

const dossierAtFixture = (pointage: string, explication: string): DossierConflit => {
  const dossier = dossierConflitFixture();
  return {
    ...dossier,
    ligne: {
      ...dossier.ligne,
      adresse: { suivi: new SuiviConflitId('suivi-camille'), pointage: new PointageConflitId(pointage) },
      explication,
    },
  };
};

describe('Conflict dossier page', () => {
  let fixture: ComponentFixture<DossierConflitPage>;
  let read: DossierReadFixture;
  let route: RouteFixture;
  let preview: DossierPreviewFixture;
  let application: DossierApplicationFixture;
  let demonstration: DemonstrationFixture;

  beforeEach(() => {
    read = new DossierReadFixture();
    route = new RouteFixture();
    preview = new DossierPreviewFixture();
    application = new DossierApplicationFixture();
    demonstration = new DemonstrationFixture();
    TestBed.configureTestingModule({
      providers: [
        { provide: ActivatedRoute, useValue: route },
        { provide: Router, useClass: RouterFixture },
        { provide: ConflitsReadPort, useValue: read },
        { provide: PrevisualisationConflitPort, useValue: preview },
        { provide: ApplicationActePort, useValue: application },
        { provide: ConflitsRightsPort, useValue: { canApply: () => true } },
        { provide: DemonstrationConflitsPort, useValue: demonstration },
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

  it('should explain the explicit target and termination supplied by the conflict diagnostic', async () => {
    givenAStructuredDiagnostic();

    await whenRendering();

    thenTextContains('conflit-diagnostic', 'Le pointage fin-17 vise l’activité travail-8, remplacée.');
    thenTextContains('conflit-diagnostic', 'Ouverte par debut-8.');
    thenTextContains('conflit-diagnostic', 'Terminée par nc-12.');
  });

  it('should reject an address missing its suivi without requesting a dossier', async () => {
    givenAnIncompletePath();

    await whenRendering();

    thenTextContains('conflit-adresse-invalide', 'L’adresse doit préciser');
    thenAbsent('conflit-diagnostic');
    expect(read.demandes).toHaveLength(0);
  });

  it('should retain the available journal when the addressed anchor was cancelled', async () => {
    read.result = { kind: 'ANCRE_ANNULEE', journal: dossierConflitFixture().journal };

    await whenRendering();

    thenTextContains('conflit-adresse-obsolete', 'annulé ou remplacé');
    thenTextContains('conflit-historique', '2026-09-14T17:00:00.123456789+02:00');
    thenAbsent('conflit-choix');
  });

  it('should show an ongoing activity after resolution without presenting a definitive duration', async () => {
    read.result = {
      kind: 'DOSSIER',
      dossier: {
        ...dossierConflitFixture(),
        enConflit: false,
        activites: [
          { id: new ActiviteConflitId('travail-8'), libelle: 'Travail commencé à 8 h', etat: 'EN_COURS', temps: 'Temps non définitif' },
        ],
      },
    };

    await whenRendering();

    thenTextContains('conflit-activite', 'En cours · Temps non définitif');
  });

  it('should present the exact authoritative period and duration of finished work', async () => {
    givenAnAuthoritativeActivity('TERMINEE', 'PT8H59M59.876543211S');

    await whenRendering();

    thenTextContains('conflit-activite', 'Travail');
    thenTextContains('conflit-activite', '2026-09-14T08:00:00.123456789+02:00');
    thenTextContains('conflit-activite', '2026-09-14T17:00:00+02:00');
    thenTextContains('conflit-activite', '8 h 59 min 59,876543211 s');
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
    application.verification = { kind: 'ATTESTE', dossier: { ...dossierConflitFixture(), version: 3, enConflit: false } };
    await whenRendering();
    await whenPreparingTheCorrection();
    await whenClicking('conflit-confirmer');
    read.result = { kind: 'ANCRE_ANNULEE', journal: dossierConflitFixture().journal };

    await whenClicking('conflit-verifier');

    thenTextContains('conflit-resultat', 'Conflit résolu');
    thenAbsent('conflit-adresse-obsolete');
  });

  it('should show ongoing work in the proposed result without presenting a definitive duration', async () => {
    givenASuccessfulPreview({
      ...dossierConflitFixture(),
      enConflit: false,
      activites: [
        { id: new ActiviteConflitId('travail-8'), libelle: 'Travail commencé à 8 h', etat: 'EN_COURS', temps: 'Temps non définitif' },
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
    expect(read.demandes).toHaveLength(2);
  });

  it('should clear the displayed interpretation after verifying an unknown write outcome', async () => {
    givenASuccessfulPreview();
    application.result = { kind: 'ISSUE_INCONNUE' };
    await whenRendering();

    await whenPreparingTheCorrection();
    await whenClicking('conflit-confirmer');
    await whenClicking('conflit-verifier');

    thenNoInterpretationIsSelected();
    thenAbsent('conflit-acte');
  });

  it('should replace the displayed dossier with the accepted partial result while preserving its closure', async () => {
    givenASuccessfulPreview();
    const dossier = dossierConflitFixture();
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

  it('should preserve the detailed proposition when previewing is limited to supported demonstration trajectories', async () => {
    await whenRendering();

    await whenPreparingTheCorrection();

    thenTextContains('conflit-operation', 'Limitation de la démonstration');
    thenTextContains('conflit-refus', 'Commande hors scénario.');
    thenFieldValueIs('conflit-motif', 'Cible confirmée');
    thenAbsent('conflit-apercu');
  });

  it('should reread a concurrent dossier without discarding the manager proposal', async () => {
    preview.result = { kind: 'CONCURRENCE' };
    await whenRendering();
    const dossier = dossierConflitFixture();
    read.result = {
      kind: 'DOSSIER',
      dossier: { ...dossier, version: 2, ligne: { ...dossier.ligne, explication: 'Le journal a été actualisé.' } },
    };

    await whenPreparingTheCorrection();

    thenTextContains('conflit-diagnostic', 'Le journal a été actualisé.');
    thenTextContains('conflit-operation', 'Ce suivi a changé');
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
    read.failure = new Error('Vérification indisponible');

    await whenClicking('conflit-verifier');
    const verificationFailed = present('conflit-retry');
    read.failure = undefined;
    await whenClicking('conflit-retry');

    expect(verificationFailed).toBe(true);
    thenTextContains('conflit-operation', 'L’issue de l’écriture est inconnue');
    thenDisabled('conflit-choix');
    thenFieldValueIs('conflit-motif', 'Cible confirmée');
    thenAbsent('conflit-apercu');
  });

  it('should discard the former dossier proposition when its address changes reactively', async () => {
    await whenRendering();
    await whenClicking('conflit-choix');
    await whenEntering('conflit-motif', 'Ancienne décision');
    const dossier = dossierConflitFixture();
    read.result = {
      kind: 'DOSSIER',
      dossier: {
        ...dossier,
        ligne: {
          ...dossier.ligne,
          adresse: { suivi: new SuiviConflitId('suivi-camille'), pointage: new PointageConflitId('fin-18') },
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

  it('should let the manager select the named non-conformity activity and preview its exact reference', async () => {
    const dossier = dossierConflitFixture();
    read.result = {
      kind: 'DOSSIER',
      dossier: {
        ...dossier,
        activites: [
          ...dossier.activites,
          { id: new ActiviteConflitId('nc-12'), libelle: 'Non-conformité ouverte à 12 h', etat: 'TERMINEE', temps: '5 h' },
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
    const dossier = dossierConflitFixture();
    read.result = {
      kind: 'DOSSIER',
      dossier: {
        ...dossier,
        activites: [],
        journal: [
          {
            id: new PointageConflitId('debut-8'),
            fait: {
              ...faitConflitFixture(),
              type: 'DEBUT',
              intention: 'OUVERTURE',
              activiteVisee: '',
              instant: '2026-09-14T08:00:00+02:00',
            },
            activiteCreee: new ActiviteConflitId('travail-8'),
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

  it('should reread the dossier and clear its proposition when demonstration data is reset', async () => {
    await whenRendering();
    await whenClicking('conflit-choix');
    await whenEntering('conflit-motif', 'Décision abandonnée');

    await whenClicking('conflits-reset');

    thenAbsent('conflit-acte');
    thenTextContains('conflit-diagnostic', 'La fin vise le travail remplacé.');
    expect(read.demandes).toHaveLength(2);
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
    const ancienneVerification = new PendingResponseFixture<LectureDossier>();
    read.pending = ancienneVerification;

    whenStartingClick('conflit-verifier');
    await ancienneVerification.arrival;
    read.result = { kind: 'DOSSIER', dossier: dossierAtFixture('fin-18', 'Autre contradiction.') };
    await whenAddressChanges('fin-18');
    read.result = { kind: 'DOSSIER', dossier: dossierConflitFixture() };
    await whenAddressChanges('fin-17');
    await whenPreparingTheCorrection();
    await whenClicking('conflit-confirmer');
    await whenResponseArrives(ancienneVerification, { kind: 'DOSSIER', dossier: dossierConflitFixture() });

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
    await whenResponseArrives(attente, { kind: 'APPLIQUE', dossier: { ...dossierConflitFixture(), version: 2, enConflit: false } });

    thenAbsent('conflit-diagnostic');
    thenAbsent('conflit-acte');
    thenTextContains('conflit-adresse-invalide', 'L’adresse doit préciser');
  });

  const givenASuccessfulPreview = (apres?: DossierConflit): void => {
    const dossier = dossierConflitFixture();
    preview.result = {
      kind: 'APERCU',
      apercu: {
        reference: 'apercu-1',
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
    const dossier = dossierConflitFixture();
    read.result = {
      kind: 'DOSSIER',
      dossier: {
        ...dossier,
        ligne: { ...dossier.ligne, explication: '' },
        diagnostics: [
          {
            pointage: new PointageConflitId('fin-17'),
            raison: 'CIBLE_REMPLACEE',
            cible: {
              activite: new ActiviteConflitId('travail-8'),
              ouvrant: new PointageConflitId('debut-8'),
              termineePar: new PointageConflitId('nc-12'),
            },
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
    const dossier = dossierConflitFixture();
    read.result = {
      kind: 'DOSSIER',
      dossier: {
        ...dossier,
        activites: [
          {
            id: new ActiviteConflitId('travail-8'),
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

  const whenClicking = async (selector: string): Promise<void> => {
    element(selector).click();
    await Promise.allSettled([
      ...preview.replies.automaticResponses,
      ...application.replies.automaticResponses,
      ...demonstration.automaticResponses,
    ]);
    await fixture.whenStable();
  };

  const whenRendering = async (): Promise<void> => {
    fixture = TestBed.createComponent(DossierConflitPage);
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

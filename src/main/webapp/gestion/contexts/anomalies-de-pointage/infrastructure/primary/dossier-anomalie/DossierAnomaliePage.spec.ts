import { ActeResolution, FaitPropose } from '@/gestion/contexts/anomalies-de-pointage/domain/acte/ActeResolution';
import { SaisieActe } from '@/gestion/contexts/anomalies-de-pointage/domain/acte/SaisieActe';
import { ActiviteAnomalieId } from '@/gestion/contexts/anomalies-de-pointage/domain/dossier/ActiviteAnomalieId';
import { DiagnosticConflit, DossierAnomalie } from '@/gestion/contexts/anomalies-de-pointage/domain/dossier/DossierAnomalie';
import { ElementAnomalie } from '@/gestion/contexts/anomalies-de-pointage/domain/dossier/ElementAnomalie';
import { ElementAnomalieId } from '@/gestion/contexts/anomalies-de-pointage/domain/dossier/ElementAnomalieId';
import { OperateurAnomalieId } from '@/gestion/contexts/anomalies-de-pointage/domain/dossier/OperateurAnomalieId';
import { PerimetreDuDossier } from '@/gestion/contexts/anomalies-de-pointage/domain/dossier/PerimetreDuDossier';
import { PointageAnomalieId } from '@/gestion/contexts/anomalies-de-pointage/domain/dossier/PointageAnomalieId';
import { PosteAnomalieId } from '@/gestion/contexts/anomalies-de-pointage/domain/dossier/PosteAnomalieId';
import { OperateurAnomalie, ReferentielAnomalies } from '@/gestion/contexts/anomalies-de-pointage/domain/dossier/ReferentielAnomalies';
import { SuiviAnomalieId } from '@/gestion/contexts/anomalies-de-pointage/domain/dossier/SuiviAnomalieId';

import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, ParamMap, Router } from '@angular/router';
import { ResizeObserverFixture } from '@test/unit/fixtures/gestion/anomalies-de-pointage/ResizeObserverFixture';
import { dataSelector } from '@test/utils/DataSelector';
import { instantLocalFixture, instantLocalWithOffsetFixture } from '@test/utils/gestion/anomalies-de-pointage/InstantLocal.fixture';
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
import {
  ActiviteAnomalie,
  AdresseDossier,
  ChoixGuide,
  LectureDossier,
  PageAnomalies,
  PointageAnomalie,
} from '../../../domain/dossier/DossierAnomalie';
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

const referentielFixture = (): ReferentielAnomalies => {
  const dmu = { id: new PosteAnomalieId('poste-1'), libelle: 'DMU 50' };
  const tour = { id: new PosteAnomalieId('poste-2'), libelle: 'Tour 1' };
  const scie = { id: new PosteAnomalieId('poste-3'), libelle: 'Scie 1' };
  return new ReferentielAnomalies(
    [
      { id: new OperateurAnomalieId('op-camille'), nom: 'Camille Martin', code: '007', postesHabilites: [dmu.id] },
      { id: new OperateurAnomalieId('op-alex'), nom: 'Alex Durand', postesHabilites: [tour.id, scie.id] },
      { id: new OperateurAnomalieId('op-zoe'), nom: 'Zoé Évrard', code: '012', postesHabilites: [] },
    ],
    [dmu, tour, scie],
  );
};

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
  referentielFailure: Error | undefined;
  referentielResult = referentielFixture();
  referentielPending: PendingResponseFixture<ReferentielAnomalies> | undefined;
  referentielDemandes = 0;
  elementsDemandes = 0;

  elements(): Promise<readonly ElementAnomalie[]> {
    this.elementsDemandes += 1;
    return Promise.resolve([]);
  }

  operateurs(): Promise<readonly OperateurAnomalie[]> {
    return Promise.reject(new Error('Le dossier lit le référentiel entier, jamais les opérateurs seuls.'));
  }

  referentiel(): Promise<ReferentielAnomalies> {
    this.referentielDemandes += 1;
    const pending = this.referentielPending;
    this.referentielPending = undefined;
    if (pending !== undefined) return pending.arrive();
    const failure = this.referentielFailure;
    const result = this.referentielResult;
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
    const result = lectureAvecLePerimetreDuJournal(this.result);
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
    return this.replies.answer(apercuAvecLePerimetreDuJournal(this.result));
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

class RouterFixture {
  readonly events = EMPTY;
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
  continuations: [],
});

const pointageDeLaFinFixture = (): PointageAnomalie => requiredFixture(dossierAnomalieFixture().journal[0], 'journal fixture pointage');

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
const UN_INSTANT_ILLISIBLE = 'pas un instant';

const faitFinTardiveFixture = (instant = INSTANT_FIN_TARDIVE): FaitPropose => ({ ...faitConflitFixture(), instant });

const acteFinTardiveFixture = (instant: string): ActeResolution => ({
  kind: 'CORRECTION',
  pointage: 'fin-23',
  motif: 'Fin tardive confirmée',
  fait: { ...faitFinTardiveFixture(), instant },
});

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

const GESTES_FIXTURE = {
  DEMARRAGE: { type: 'DEBUT', intention: 'OUVERTURE' },
  DEMARRAGE_NC: { type: 'NON_CONFORMITE', intention: 'OUVERTURE' },
  PASSAGE_NC: { type: 'NON_CONFORMITE', intention: 'TRANSITION' },
  RETOUR_BON: { type: 'DEBUT', intention: 'TRANSITION' },
  ARRET: { type: 'FIN', intention: 'FIN' },
} as const;

type GesteFixture = keyof typeof GESTES_FIXTURE;

interface PointageCiteFixture {
  readonly geste: GesteFixture;
  readonly heure: string;
  readonly regularisation?: true;
  readonly absentDuJournal?: true;
}

interface ActiviteCiteFixture {
  readonly categorie?: 'TRAVAIL' | 'NON_CONFORMITE';
  readonly debut?: string;
}

interface CasDeConflitFixture {
  readonly cas: string;
  readonly raison: DiagnosticConflit['raison'];
  readonly enCause: PointageCiteFixture;
  readonly activite?: ActiviteCiteFixture;
  readonly ouvrant?: PointageCiteFixture;
  readonly termineePar?: PointageCiteFixture;
  readonly phrase: string;
}

const instantAt = (heure: string): string => {
  const [heures = 0, minutes = 0] = heure.split(':').map(Number);
  return instantLocalFixture(new Date(2026, 8, 14, heures, minutes));
};

const ARRET_17: PointageCiteFixture = { geste: 'ARRET', heure: '17:00' };
const ARRET_12: PointageCiteFixture = { geste: 'ARRET', heure: '12:00' };
const ARRET_7: PointageCiteFixture = { geste: 'ARRET', heure: '07:00' };
const PASSAGE_NC_17: PointageCiteFixture = { geste: 'PASSAGE_NC', heure: '17:00' };
const PASSAGE_NC_12: PointageCiteFixture = { geste: 'PASSAGE_NC', heure: '12:00' };
const RETOUR_BON_12: PointageCiteFixture = { geste: 'RETOUR_BON', heure: '12:00' };
const DEMARRAGE_8: PointageCiteFixture = { geste: 'DEMARRAGE', heure: '08:00' };
const DEMARRAGE_NC_8: PointageCiteFixture = { geste: 'DEMARRAGE_NC', heure: '08:00' };
const TRAVAIL_8: ActiviteCiteFixture = { categorie: 'TRAVAIL', debut: '08:00' };
const NC_8: ActiviteCiteFixture = { categorie: 'NON_CONFORMITE', debut: '08:00' };
const SANS_PERIODE: ActiviteCiteFixture = {};
const ABSENT = { absentDuJournal: true } as const;

const CAS_DE_CONFLIT: readonly CasDeConflitFixture[] = [
  {
    cas: 'a replaced work with its terminating pointage',
    raison: 'CIBLE_REMPLACEE',
    enCause: ARRET_17,
    activite: TRAVAIL_8,
    termineePar: PASSAGE_NC_12,
    phrase: 'L’arrêt de 17:00 vise le travail, remplacé à 12:00 par un passage en NC.',
  },
  {
    cas: 'a replaced non-conformity, agreed in the feminine',
    raison: 'CIBLE_REMPLACEE',
    enCause: ARRET_17,
    activite: NC_8,
    termineePar: PASSAGE_NC_12,
    phrase: 'L’arrêt de 17:00 vise la non-conformité, remplacée à 12:00 par un passage en NC.',
  },
  {
    cas: 'a replaced activity absent from the dossier',
    raison: 'CIBLE_REMPLACEE',
    enCause: ARRET_17,
    termineePar: PASSAGE_NC_12,
    phrase: 'L’arrêt de 17:00 vise l’activité, remplacée à 12:00 par un passage en NC.',
  },
  {
    cas: 'a replacement by a stop',
    raison: 'CIBLE_REMPLACEE',
    enCause: ARRET_17,
    activite: TRAVAIL_8,
    termineePar: ARRET_12,
    phrase: 'L’arrêt de 17:00 vise le travail, remplacé à 12:00 par un arrêt.',
  },
  {
    cas: 'a replacement by a return to good',
    raison: 'CIBLE_REMPLACEE',
    enCause: ARRET_17,
    activite: TRAVAIL_8,
    termineePar: RETOUR_BON_12,
    phrase: 'L’arrêt de 17:00 vise le travail, remplacé à 12:00 par un retour en bon.',
  },
  {
    cas: 'a replacement by a start',
    raison: 'CIBLE_REMPLACEE',
    enCause: ARRET_17,
    activite: TRAVAIL_8,
    termineePar: DEMARRAGE_8,
    phrase: 'L’arrêt de 17:00 vise le travail, remplacé à 08:00 par un démarrage.',
  },
  {
    cas: 'a replaced work without terminating pointage',
    raison: 'CIBLE_REMPLACEE',
    enCause: ARRET_17,
    activite: TRAVAIL_8,
    phrase: 'L’arrêt de 17:00 vise un travail qui n’est plus en cours.',
  },
  {
    cas: 'a replaced non-conformity without terminating pointage',
    raison: 'CIBLE_REMPLACEE',
    enCause: ARRET_17,
    activite: NC_8,
    phrase: 'L’arrêt de 17:00 vise une non-conformité qui n’est plus en cours.',
  },
  {
    cas: 'a replaced activity absent from the dossier without terminating pointage',
    raison: 'CIBLE_REMPLACEE',
    enCause: ARRET_17,
    phrase: 'L’arrêt de 17:00 vise une activité qui n’est plus en cours.',
  },
  {
    cas: 'a terminating pointage the journal does not hold',
    raison: 'CIBLE_REMPLACEE',
    enCause: ARRET_17,
    activite: TRAVAIL_8,
    termineePar: { ...PASSAGE_NC_12, ...ABSENT },
    phrase: 'L’arrêt de 17:00 vise un travail qui n’est plus en cours.',
  },
  {
    cas: 'a work already stopped',
    raison: 'CIBLE_DEJA_TERMINEE',
    enCause: ARRET_17,
    activite: TRAVAIL_8,
    termineePar: ARRET_12,
    phrase: 'L’arrêt de 17:00 vise le travail, déjà arrêté à 12:00.',
  },
  {
    cas: 'a non-conformity already stopped',
    raison: 'CIBLE_DEJA_TERMINEE',
    enCause: ARRET_17,
    activite: NC_8,
    termineePar: ARRET_12,
    phrase: 'L’arrêt de 17:00 vise la non-conformité, déjà arrêtée à 12:00.',
  },
  {
    cas: 'an activity absent from the dossier already stopped',
    raison: 'CIBLE_DEJA_TERMINEE',
    enCause: ARRET_17,
    termineePar: ARRET_12,
    phrase: 'L’arrêt de 17:00 vise l’activité, déjà arrêtée à 12:00.',
  },
  {
    cas: 'a work already stopped by an unknown pointage',
    raison: 'CIBLE_DEJA_TERMINEE',
    enCause: ARRET_17,
    activite: TRAVAIL_8,
    phrase: 'L’arrêt de 17:00 vise un travail déjà arrêté.',
  },
  {
    cas: 'a non-conformity already stopped by an unknown pointage',
    raison: 'CIBLE_DEJA_TERMINEE',
    enCause: ARRET_17,
    activite: NC_8,
    phrase: 'L’arrêt de 17:00 vise une non-conformité déjà arrêtée.',
  },
  {
    cas: 'a challenged pointage the journal does not hold',
    raison: 'CIBLE_DEJA_TERMINEE',
    enCause: { ...ARRET_17, ...ABSENT },
    activite: TRAVAIL_8,
    termineePar: ARRET_12,
    phrase: 'Un pointage non résolu vise le travail, déjà arrêté à 12:00.',
  },
  {
    cas: 'a stop before the opening received, which wins over the start received on the activity',
    raison: 'GESTE_AVANT_OUVERTURE',
    enCause: ARRET_7,
    activite: { ...TRAVAIL_8, debut: '08:30' },
    ouvrant: DEMARRAGE_8,
    phrase: 'L’arrêt de 07:00 vise un travail démarré à 08:00.',
  },
  {
    cas: 'a stop before the start received on the activity',
    raison: 'GESTE_AVANT_OUVERTURE',
    enCause: ARRET_7,
    activite: { ...TRAVAIL_8, debut: '08:30' },
    phrase: 'L’arrêt de 07:00 vise un travail démarré à 08:30.',
  },
  {
    cas: 'a stop before the opening of a non-conformity',
    raison: 'GESTE_AVANT_OUVERTURE',
    enCause: ARRET_7,
    activite: NC_8,
    ouvrant: DEMARRAGE_NC_8,
    phrase: 'L’arrêt de 07:00 vise une non-conformité démarrée à 08:00.',
  },
  {
    cas: 'an opening the journal does not hold',
    raison: 'GESTE_AVANT_OUVERTURE',
    enCause: ARRET_7,
    activite: { ...TRAVAIL_8, debut: '08:30' },
    ouvrant: { ...DEMARRAGE_8, ...ABSENT },
    phrase: 'L’arrêt de 07:00 vise un travail démarré à 08:30.',
  },
  {
    cas: 'an activity with neither opening nor period',
    raison: 'GESTE_AVANT_OUVERTURE',
    enCause: ARRET_7,
    activite: SANS_PERIODE,
    phrase: 'L’arrêt de 07:00 vise une activité pas encore démarrée.',
  },
  {
    cas: 'a cancelled start',
    raison: 'OUVRANT_ANNULE',
    enCause: ARRET_17,
    activite: TRAVAIL_8,
    ouvrant: DEMARRAGE_8,
    phrase: 'L’arrêt de 17:00 vise un travail dont le démarrage de 08:00 est annulé.',
  },
  {
    cas: 'a cancelled start of a non-conformity',
    raison: 'OUVRANT_ANNULE',
    enCause: ARRET_17,
    activite: NC_8,
    ouvrant: DEMARRAGE_NC_8,
    phrase: 'L’arrêt de 17:00 vise une non-conformité dont le démarrage en NC de 08:00 est annulé.',
  },
  {
    cas: 'a cancelled start without opening pointage',
    raison: 'OUVRANT_ANNULE',
    enCause: ARRET_17,
    activite: TRAVAIL_8,
    phrase: 'L’arrêt de 17:00 vise un travail dont le démarrage est annulé.',
  },
  {
    cas: 'a cancelled start the journal does not hold',
    raison: 'OUVRANT_ANNULE',
    enCause: ARRET_17,
    activite: TRAVAIL_8,
    ouvrant: { ...DEMARRAGE_8, ...ABSENT },
    phrase: 'L’arrêt de 17:00 vise un travail dont le démarrage est annulé.',
  },
  {
    cas: 'a return to good on a work already good',
    raison: 'TRANSITION_MEME_CATEGORIE',
    enCause: RETOUR_BON_12,
    activite: TRAVAIL_8,
    ouvrant: DEMARRAGE_8,
    phrase: 'Le retour en bon de 12:00 vise le travail démarré à 08:00, déjà en bon.',
  },
  {
    cas: 'a passage in non-conformity on a non-conformity',
    raison: 'TRANSITION_MEME_CATEGORIE',
    enCause: PASSAGE_NC_12,
    activite: NC_8,
    ouvrant: DEMARRAGE_NC_8,
    phrase: 'Le passage en NC de 12:00 vise la non-conformité démarrée à 08:00, déjà en NC.',
  },
  {
    cas: 'a transition whose start is read from the activity',
    raison: 'TRANSITION_MEME_CATEGORIE',
    enCause: RETOUR_BON_12,
    activite: TRAVAIL_8,
    phrase: 'Le retour en bon de 12:00 vise le travail démarré à 08:00, déjà en bon.',
  },
  {
    cas: 'a return to good on an activity without period',
    raison: 'TRANSITION_MEME_CATEGORIE',
    enCause: RETOUR_BON_12,
    activite: SANS_PERIODE,
    phrase: 'Le retour en bon de 12:00 vise un travail déjà en bon.',
  },
  {
    cas: 'a passage in non-conformity on an activity without period',
    raison: 'TRANSITION_MEME_CATEGORIE',
    enCause: PASSAGE_NC_12,
    activite: SANS_PERIODE,
    phrase: 'Le passage en NC de 12:00 vise une non-conformité déjà en NC.',
  },
  {
    cas: 'a transition whose pointage and activity are both unknown',
    raison: 'TRANSITION_MEME_CATEGORIE',
    enCause: { ...RETOUR_BON_12, ...ABSENT },
    activite: SANS_PERIODE,
    phrase: 'Un pointage non résolu vise une activité déjà de même catégorie.',
  },
  {
    cas: 'a due work while another activity is running',
    raison: 'CIBLE_ECHUE_AVEC_AUTRE_ACTIVITE',
    enCause: PASSAGE_NC_17,
    activite: { ...TRAVAIL_8, debut: '06:00' },
    phrase: 'Le passage en NC de 17:00 vise le travail de 06:00, déjà terminé automatiquement, alors qu’une autre activité est en cours.',
  },
  {
    cas: 'a due non-conformity while another activity is running',
    raison: 'CIBLE_ECHUE_AVEC_AUTRE_ACTIVITE',
    enCause: PASSAGE_NC_17,
    activite: { ...NC_8, debut: '06:00' },
    phrase:
      'Le passage en NC de 17:00 vise la non-conformité de 06:00, déjà terminée automatiquement, alors qu’une autre activité est en cours.',
  },
  {
    cas: 'a due activity without period',
    raison: 'CIBLE_ECHUE_AVEC_AUTRE_ACTIVITE',
    enCause: PASSAGE_NC_17,
    activite: SANS_PERIODE,
    phrase: 'Le passage en NC de 17:00 vise une activité déjà terminée automatiquement, alors qu’une autre activité est en cours.',
  },
  {
    cas: 'a regularised stop on a work already stopped',
    raison: 'CONTRADICTION_REGULARISATION',
    enCause: { geste: 'ARRET', heure: '19:00', regularisation: true },
    activite: TRAVAIL_8,
    termineePar: { geste: 'ARRET', heure: '18:00' },
    phrase: 'L’arrêt régularisé de 19:00 vise un travail déjà arrêté à 18:00.',
  },
  {
    cas: 'a regularised stop on a non-conformity already stopped',
    raison: 'CONTRADICTION_REGULARISATION',
    enCause: { geste: 'ARRET', heure: '19:00', regularisation: true },
    activite: NC_8,
    termineePar: { geste: 'ARRET', heure: '18:00' },
    phrase: 'L’arrêt régularisé de 19:00 vise une non-conformité déjà arrêtée à 18:00.',
  },
  {
    cas: 'a passage on a work extended by a regularisation',
    raison: 'CONTRADICTION_REGULARISATION',
    enCause: { geste: 'PASSAGE_NC', heure: '18:00' },
    activite: TRAVAIL_8,
    phrase: 'Le passage en NC de 18:00 vise un travail prolongé par une régularisation.',
  },
  {
    cas: 'a passage on a non-conformity extended by a regularisation',
    raison: 'CONTRADICTION_REGULARISATION',
    enCause: { geste: 'PASSAGE_NC', heure: '18:00' },
    activite: NC_8,
    phrase: 'Le passage en NC de 18:00 vise une non-conformité prolongée par une régularisation.',
  },
  {
    cas: 'a regularised passage on a work extended by a regularisation',
    raison: 'CONTRADICTION_REGULARISATION',
    enCause: { geste: 'PASSAGE_NC', heure: '18:00', regularisation: true },
    activite: TRAVAIL_8,
    phrase: 'Le passage en NC régularisé de 18:00 vise un travail prolongé par une régularisation.',
  },
];

interface CasDeFinAutomatiqueFixture {
  readonly cas: string;
  readonly categorie: 'TRAVAIL' | 'NON_CONFORMITE';
  readonly tardif?: {
    readonly code: 'CORRIGER_FIN_TARDIVE' | 'CORRIGER_TRANSITION_TARDIVE';
    readonly pointage: PointageCiteFixture;
    readonly activiteVisee?: string;
    readonly sansCorrection?: true;
  };
  readonly regularisation?: 'AUCUNE' | 'AILLEURS';
  readonly phrase: string;
}

const ARRET_19_30: PointageCiteFixture = { geste: 'ARRET', heure: '19:30' };
const PASSAGE_NC_19_30: PointageCiteFixture = { geste: 'PASSAGE_NC', heure: '19:30' };

const CAS_DE_FIN_AUTOMATIQUE: readonly CasDeFinAutomatiqueFixture[] = [
  {
    cas: 'a work never stopped',
    categorie: 'TRAVAIL',
    phrase: 'Le travail démarré à 08:00 n’a jamais été arrêté : fin automatique à 18:00.',
  },
  {
    cas: 'a non-conformity never stopped',
    categorie: 'NON_CONFORMITE',
    phrase: 'La non-conformité démarrée à 08:00 n’a jamais été arrêtée : fin automatique à 18:00.',
  },
  {
    cas: 'a work the server offers neither to regularise nor to correct',
    categorie: 'TRAVAIL',
    regularisation: 'AUCUNE',
    phrase: 'Le travail démarré à 08:00 a été terminé automatiquement à 18:00.',
  },
  {
    cas: 'a non-conformity the server offers neither to regularise nor to correct',
    categorie: 'NON_CONFORMITE',
    regularisation: 'AUCUNE',
    phrase: 'La non-conformité démarrée à 08:00 a été terminée automatiquement à 18:00.',
  },
  {
    cas: 'a work whose end regularisation aims at another activity',
    categorie: 'TRAVAIL',
    regularisation: 'AILLEURS',
    phrase: 'Le travail démarré à 08:00 a été terminé automatiquement à 18:00.',
  },
  {
    cas: 'a late choice that carries a regularisation but is no end regularisation',
    categorie: 'TRAVAIL',
    tardif: { code: 'CORRIGER_FIN_TARDIVE', pointage: ARRET_19_30, sansCorrection: true },
    regularisation: 'AUCUNE',
    phrase: 'Le travail démarré à 08:00 a été terminé automatiquement à 18:00.',
  },
  {
    cas: 'a work stopped after its due time',
    categorie: 'TRAVAIL',
    tardif: { code: 'CORRIGER_FIN_TARDIVE', pointage: ARRET_19_30 },
    phrase: 'L’arrêt de 19:30 vise le travail, déjà terminé automatiquement à 18:00.',
  },
  {
    cas: 'a non-conformity stopped after its due time',
    categorie: 'NON_CONFORMITE',
    tardif: { code: 'CORRIGER_FIN_TARDIVE', pointage: ARRET_19_30 },
    phrase: 'L’arrêt de 19:30 vise la non-conformité, déjà terminée automatiquement à 18:00.',
  },
  {
    cas: 'a work with a passage pointed after its due time',
    categorie: 'TRAVAIL',
    tardif: { code: 'CORRIGER_TRANSITION_TARDIVE', pointage: PASSAGE_NC_19_30 },
    phrase: 'Le passage en NC de 19:30 vise le travail, déjà terminé automatiquement à 18:00.',
  },
  {
    cas: 'a late pointage the journal does not hold',
    categorie: 'TRAVAIL',
    tardif: { code: 'CORRIGER_FIN_TARDIVE', pointage: { ...ARRET_19_30, ...ABSENT } },
    phrase: 'Un pointage non résolu vise le travail, déjà terminé automatiquement à 18:00.',
  },
  {
    cas: 'a late choice aimed at another activity',
    categorie: 'TRAVAIL',
    tardif: { code: 'CORRIGER_FIN_TARDIVE', pointage: ARRET_19_30, activiteVisee: 'travail-9' },
    phrase: 'Le travail démarré à 08:00 n’a jamais été arrêté : fin automatique à 18:00.',
  },
  {
    cas: 'a late choice that carries no correction',
    categorie: 'TRAVAIL',
    tardif: { code: 'CORRIGER_FIN_TARDIVE', pointage: ARRET_19_30, sansCorrection: true },
    phrase: 'Le travail démarré à 08:00 n’a jamais été arrêté : fin automatique à 18:00.',
  },
];

describe('Anomaly dossier page', () => {
  let fixture: ComponentFixture<DossierAnomaliePage>;
  let read: DossierReadFixture;
  let route: RouteFixture;
  let preview: DossierPreviewFixture;
  let application: DossierApplicationFixture;
  let resizeObserver: ResizeObserverFixture;

  beforeEach(() => {
    resizeObserver = new ResizeObserverFixture();
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
    resizeObserver.restore();
  });

  it('should offer a retry when reading fails without showing a misleading dossier', async () => {
    read.failure = new Error('Dossier indisponible');

    await whenRendering();

    thenTextContains('anomalie-retry', 'Réessayer');
    thenAbsent('anomalie-probleme');
  });

  it('should reacquire the dossier after the manager explicitly retries an unavailable reading', async () => {
    read.failure = new Error('Dossier indisponible');
    await whenRendering();
    read.failure = undefined;

    await whenClicking('anomalie-retry');

    thenTheProblemReads('La fin vise le travail remplacé.');
    thenAbsent('anomalie-retry');
    expect(read.demandes).toHaveLength(2);
  });

  it.each(CAS_DE_CONFLIT)('should say the problem of $cas', async cas => {
    givenAConflictDiagnosedAs(cas);

    await whenRendering();

    thenTheProblemReads(cas.phrase);
  });

  it('should say nothing of the activity, the pointages or their identifiers a diagnostic cites but the dossier does not hold', async () => {
    givenAStructuredDiagnostic('fin-absent');

    await whenRendering();

    thenTheProblemReads('Un pointage non résolu vise une activité qui n’est plus en cours.');
    thenTextDoesNotContainAnIdentifier('anomalie-probleme');
    thenTextDoesNotContain('anomalie-probleme', 'fin-absent');
    thenTextDoesNotContain('anomalie-probleme', 'travail-8');
    thenTextDoesNotContain('anomalie-probleme', 'debut-8');
    thenTextDoesNotContain('anomalie-probleme', 'nc-12');
  });

  it('should say one problem per diagnostic, in the order received', async () => {
    givenTwoDiagnostics();

    await whenRendering();

    thenTheProblemsRead([
      'L’arrêt de 17:00 vise un travail qui n’est plus en cours.',
      'Le démarrage de 08:00 vise un travail qui n’est plus en cours.',
    ]);
  });

  it('should offer to cancel the pointage at fault and the one that already stopped the activity, named by their gesture and time', async () => {
    givenAnActivityAlreadyStoppedBeforeTheEndAtFault();

    await whenRendering();

    thenTheDirectActionsAre(['Annuler l’arrêt de 17:00', 'Annuler l’arrêt de 12:00']);
  });

  it('should preselect no direct action', async () => {
    givenAnActivityAlreadyStoppedBeforeTheEndAtFault();

    await whenRendering();

    thenNoDirectActionIsPressed();
  });

  it('should list the propositions of the server, then the direct actions, then the other corrections', async () => {
    givenAnActivityAlreadyStoppedBeforeTheEndAtFault();

    await whenRendering();

    thenThePropositionsComeBeforeTheDirectActionsAndTheOtherCorrections();
  });

  it('should name the direct action on a regularised pointage as regularised', async () => {
    givenARegularisedPassageAtFault();

    await whenRendering();

    thenTheDirectActionsAre(['Annuler le passage en NC régularisé de 18:00']);
  });

  it('should prepare the cancellation of the pointage at fault when the manager chooses its direct action', async () => {
    givenAnActivityAlreadyStoppedBeforeTheEndAtFault();
    await whenRendering();

    await whenChoosingTheDirectAction('ANNULATION', 'fin-17');

    thenTextContains('anomalie-acte', 'Annulation du pointage');
    thenTextContains('anomalie-proposition-resume', 'Arrêt · lundi 14 septembre à 17:00:00');
    thenOnlyTheDirectActionIsPressed('ANNULATION', 'fin-17');
  });

  it('should prepare the cancellation of the terminating pointage when the manager chooses its direct action', async () => {
    givenAnActivityAlreadyStoppedBeforeTheEndAtFault();
    await whenRendering();

    await whenChoosingTheDirectAction('ANNULATION', 'fin-12');

    thenTextContains('anomalie-acte', 'Annulation du pointage');
    thenTextContains('anomalie-proposition-resume', 'Arrêt · lundi 14 septembre à 12:00:00');
    thenOnlyTheDirectActionIsPressed('ANNULATION', 'fin-12');
  });

  it('should name the direct actions on a passage by its gesture, with the article of its gender', async () => {
    givenAPassageBeforeTheOpeningOfItsActivity();

    await whenRendering();

    thenTheDirectActionsAre(['Annuler le passage en NC de 07:00', 'Corriger l’heure du passage en NC de 07:00']);
  });

  it('should move the focus to the proposition when the manager chooses a direct action', async () => {
    givenAnActivityAlreadyStoppedBeforeTheEndAtFault();
    await whenRendering();

    await whenChoosingTheDirectAction('ANNULATION', 'fin-17');

    expect(document.activeElement).toBe(element('anomalie-proposition-titre'));
  });

  it('should press only the proposition of the server when the manager chooses it after a direct action', async () => {
    givenAnActivityAlreadyStoppedBeforeTheEndAtFault();
    await whenRendering();
    await whenChoosingTheDirectAction('ANNULATION', 'fin-17');

    await whenClicking('anomalie-choix');

    thenInterpretationIsSelected();
    thenNoDirectActionIsPressed();
  });

  it('should offer to cancel or to correct the time of a pointage made before the opening of its activity', async () => {
    givenAStopBeforeTheOpeningOfItsActivity();

    await whenRendering();

    thenTheDirectActionsAre(['Annuler l’arrêt de 07:00', 'Corriger l’heure de l’arrêt de 07:00']);
  });

  it('should prepare the correction of the time of the pointage and open its fact when the manager chooses its direct action', async () => {
    givenAStopBeforeTheOpeningOfItsActivity();
    await whenRendering();

    await whenChoosingTheDirectAction('CORRECTION', 'fin-7');

    thenTextContains('anomalie-acte', 'Correction du pointage');
    thenTheInstantFieldsShow('14/09/2026', '07:00:00');
    thenDetailedFactIsOpen();
    thenOnlyTheDirectActionIsPressed('CORRECTION', 'fin-7');
  });

  it('should give the seconds of a pointage in its direct action when another pointage of the dossier falls in the same minute', async () => {
    givenAnEndAtFaultInTheSameMinuteAsAnotherPointage();

    await whenRendering();

    thenTheDirectActionsAre(['Annuler l’arrêt de 17:00:40']);
  });

  it('should leave out the seconds of a pointage in its direct action when the other pointages of the dossier fall in other minutes', async () => {
    givenAnEndAtFaultInAnotherMinuteThanAnotherPointage();

    await whenRendering();

    thenTheDirectActionsAre(['Annuler l’arrêt de 17:00']);
  });

  it('should show no direct action section when the dossier has nothing to propose', async () => {
    await whenRendering();

    thenAbsent('anomalie-actions-directes');
  });

  it('should show no direct action section for an automatic end', async () => {
    givenAnAutomaticEnd();

    await whenRendering();

    thenAbsent('anomalie-actions-directes');
  });

  it('should show the direct actions of a consultant disabled, with the reason', async () => {
    givenAConsultantWhoCannotApplyDecisions();
    givenAnActivityAlreadyStoppedBeforeTheEndAtFault();

    await whenRendering();

    thenTheDirectActionsAreDisabled();
    thenTextContains('anomalie-droits', 'La correction est réservée aux gestionnaires');
  });

  it('should disable the direct actions while a write has an unknown outcome', async () => {
    givenAnActivityAlreadyStoppedBeforeTheEndAtFault();
    givenASuccessfulPreview(undefined, acteCorrectionFixture, dossierAtFixture('fin-17', ''));
    application.result = { kind: 'ISSUE_INCONNUE' };
    await whenRendering();
    await whenPreparingTheCorrection();
    await whenClicking('anomalie-confirmer');

    thenTheDirectActionsAreDisabled();
  });

  it('should gather the manual corrections under Autres corrections instead of asking whether a pointage is missing', async () => {
    await whenRendering();

    thenTextContains('anomalie-detail', 'Autres corrections');
    thenTextContains('anomalie-regulariser', 'Ajouter un pointage manquant');
  });

  it('should remind the manager that correcting or cancelling a pointage is done from the selection panel', async () => {
    await whenRendering();

    thenTextContains(
      'anomalie-autres-corrections-aide',
      'Pour corriger ou annuler un autre pointage de cette anomalie, sélectionnez-le sur la frise : les boutons sont dans le panneau Sélection.',
    );
  });

  it('should graduate the frise by the width its host announces', async () => {
    await whenRendering();

    await whenTheFriseIsMeasured(80);

    thenTheFriseGraduationsAre(['18:00']);
  });

  it('should draw on the frise only the pointages of the anomaly', async () => {
    givenAJournalBeyondTheAnomaly();

    await whenRendering();

    thenTheFriseMarkersAre(['fin-17']);
  });

  it('should compare the whole journal before and after the act although the frise shows only the anomaly', async () => {
    givenAJournalBeyondTheAnomaly();
    givenASuccessfulPreview(undefined, acteCorrectionFixture, journalBeyondTheAnomaly());
    await whenRendering();

    await whenPreparingTheCorrection();

    thenTheFriseMarkersAre(['fin-17']);
    thenTextContains('anomalie-apercu-fait-avant-autre-30', 'mercredi 16 septembre à 09:00:00');
    thenTextContains('anomalie-apercu-fait-apres-autre-30', 'mercredi 16 septembre à 09:00:00');
  });

  it('should keep the received explanation when the conflict comes with no diagnostic', async () => {
    await whenRendering();

    thenTheProblemReads('La fin vise le travail remplacé.');
  });

  it('should select the pointage at fault of a conflict and show its gesture in the selection panel', async () => {
    givenAStructuredDiagnostic();

    await whenRendering();

    thenTheSelectionShowsTheGesture('Arrêt');
  });

  it('should select nothing when the only pointage at fault is not in the journal', async () => {
    givenDiagnosticsOn(['fin-absent']);

    await whenRendering();

    thenTheSelectionReads('Sélectionnez un pointage ou une activité sur la frise pour voir ses détails.');
  });

  it('should select the first pointage at fault the journal holds when an earlier diagnostic cites one it does not', async () => {
    givenDiagnosticsOn(['fin-absent', 'fin-17']);

    await whenRendering();

    thenTheSelectionShowsTheGesture('Arrêt');
  });

  it('should select the oldest pointage at fault in the chronology, whatever the order of the diagnostics', async () => {
    givenTwoDiagnostics();

    await whenRendering();

    thenTheSelectionShowsTheGesture('Démarrage');
  });

  it('should show the selection of another pointage when the manager selects it in the chronology', async () => {
    givenTwoDiagnostics();
    await whenRendering();

    await whenSelecting('fin-17');

    thenTheSelectionShowsTheGesture('Arrêt');
  });

  it('should press only the marker of the selected pointage', async () => {
    givenTwoDiagnostics();
    await whenRendering();

    await whenSelecting('fin-17');

    thenOnlyThePointageIsPressed('fin-17', ['debut-8']);
  });

  it('should name each marker of the frise by the time of its pointage with its seconds and its gesture', async () => {
    givenTwoDiagnostics();

    await whenRendering();

    thenTheMarkerIsNamed('fin-17', '17:00:00 · Arrêt · en cause');
    thenTheMarkerIsNamed('debut-8', '08:00:00 · Démarrage · en cause');
  });

  it('should name the activity created and the pointage replaced by a selected corrected terminating fact', async () => {
    givenACorrectedTerminatingFact();
    await whenRendering();

    await whenSelecting('90000000-0000-0000-0000-000000000001');

    thenTheSelectionContains('Crée l’activité Passage en NC · lundi 14 septembre à 12:01:00');
    thenTheSelectionDoesNotContain('Crée l’activité nc-12');
    thenTheSelectionContains('Remplace un pointage non résolu');
    thenTheSelectionDoesNotContain('Remplace le pointage nc-12');
  });

  it('should keep an instant it cannot read as received when it names a pointage in a problem', async () => {
    givenAChallengedPointageWithAnUnreadableInstant();

    await whenRendering();

    thenTheProblemReads('L’arrêt de illisible vise un travail qui n’est plus en cours.');
  });

  it.each([
    ['DEBUT', 'OUVERTURE', 'Démarrage'],
    ['NON_CONFORMITE', 'OUVERTURE', 'Démarrage en NC'],
    ['NON_CONFORMITE', 'TRANSITION', 'Passage en NC'],
    ['DEBUT', 'TRANSITION', 'Retour en bon'],
    ['FIN', 'FIN', 'Arrêt'],
  ] as const)('should name a received %s %s pointage by the operator gesture %s on the frise', async (type, intention, geste) => {
    givenAReceivedGesture(type, intention);

    await whenRendering();

    thenTheMarkerIsNamed('fin-17', `17:00:00 · ${geste}`);
  });

  it.each([
    ['DEBUT', 'OUVERTURE', false],
    ['NON_CONFORMITE', 'OUVERTURE', true],
    ['NON_CONFORMITE', 'TRANSITION', true],
    ['DEBUT', 'TRANSITION', false],
    ['FIN', 'FIN', false],
  ] as const)('should flag a %s %s gesture on the frise only when it is a non-conformity: %s', async (type, intention, highlighted) => {
    givenAReceivedGesture(type, intention);

    await whenRendering();

    thenTheMarkerFlagIs('fin-17', 'data-non-conformite', String(highlighted));
  });

  it('should keep the gesture label of a regularised pointage and mark it as regularised on the frise', async () => {
    givenACorrectedTerminatingFact();

    await whenRendering();

    thenTheMarkerIsNamed('90000000-0000-0000-0000-000000000001', '12:01:00 · Passage en NC · régularisé');
  });

  it('should name each pointage of an obsolete address history by its gesture instead of its type and intention', async () => {
    read.result = {
      kind: 'ANCRE_ANNULEE',
      journal: [
        {
          ...pointageDeLaFinFixture(),
          fait: { ...faitConflitFixture(), type: 'NON_CONFORMITE', intention: 'OUVERTURE', activiteVisee: '' },
        },
      ],
    };

    await whenRendering();

    thenReceivedGestureIs('fin-17', 'Démarrage en NC');
  });

  it('should show the engagement of the workshop in the header as a long day and local time', async () => {
    await whenRendering();

    thenTextContains('anomalie-cloture', 'mardi 1 septembre à 07:30');
  });

  it('should show the date of the first pointage in the header as a long day and local time', async () => {
    await whenRendering();

    thenHeadingContains('lundi 14 septembre à 17:00');
  });

  it('should add the year to the day of a selected pointage that is not from the current year', async () => {
    givenAReceivedFactFromAnotherYear();
    await whenRendering();

    await whenSelecting('fin-17');

    thenTheSelectionTimeIs('09:41:22 · mercredi 1 octobre 2025');
  });

  it('should describe the instant of a selected pointage to the browser with at most three decimals', async () => {
    await whenRendering();

    await whenSelecting('fin-17');

    thenTheSelectionDatetimeIs(new Date(2026, 8, 14, 17, 0, 0, 123).toISOString());
  });

  it('should correct the selected pointage from the selection panel', async () => {
    await whenRendering();
    await whenSelecting('fin-17');

    await whenClickingInTheSelection('anomalie-corriger');

    thenTextContains('anomalie-acte', 'Correction du pointage');
    thenTheInstantFieldsShow('14/09/2026', '17:00:00');
  });

  it('should leave the actions and the traceability to the selection panel and keep the frise sober', async () => {
    givenTwoDiagnostics();

    await whenRendering();

    thenTheFriseOffersNoActionNorTraceability();
  });

  it('should offer neither correction nor cancellation of a cancelled pointage', async () => {
    givenACancelledOpeningTargetedByTheRemainingEnd();
    await whenRendering();

    await whenSelecting('debut-8');

    thenTheSelectionOffersNoAction();
  });

  it('should offer a consultant the actions of the selection disabled, with the reason', async () => {
    givenAConsultantWhoCannotApplyDecisions();
    givenDiagnosticsOn(['fin-17']);

    await whenRendering();

    thenTheSelectionActionsAreDisabled();
    thenTextContains('anomalie-droits', 'La correction est réservée aux gestionnaires');
  });

  it('should disable the actions of the selection while a write has an unknown outcome', async () => {
    givenASuccessfulPreview();
    application.result = { kind: 'ISSUE_INCONNUE' };
    await whenRendering();
    await whenPreparingTheCorrection();
    await whenClicking('anomalie-confirmer');

    await whenSelecting('fin-17');

    thenTheSelectionActionsAreDisabled();
  });

  it('should cancel the selected pointage from the selection panel', async () => {
    await whenRendering();
    await whenSelecting('fin-17');

    await whenClickingInTheSelection('anomalie-annuler');

    thenTextContains('anomalie-acte', 'Annulation du pointage');
    thenTextContains('anomalie-proposition-resume', 'Arrêt · lundi 14 septembre à 17:00:00');
  });

  it('should return to the initial selection of the dossier a receipt replaces the displayed one with', async () => {
    givenTwoDiagnostics();
    givenAReceiptWhoseOnlyFaultIs('fin-17');
    await whenRendering();
    await whenPreparingTheCorrection();

    await whenClicking('anomalie-confirmer');

    thenTheSelectionShowsTheGesture('Arrêt');
  });

  it('should return to the initial selection of another address the manager opens', async () => {
    givenTwoDiagnostics();
    await whenRendering();
    await whenSelecting('fin-17');
    read.result = { kind: 'DOSSIER', dossier: { ...dossierDiagnosedOn(['fin-17', 'debut-8']), version: 2 } };

    await whenAddressChanges('debut-8');

    thenTheSelectionShowsTheGesture('Démarrage');
  });

  it('should return to the initial selection when the dossier is read again after a concurrent change', async () => {
    preview.result = { kind: 'CONCURRENCE' };
    givenTwoDiagnostics();
    await whenRendering();
    await whenSelecting('fin-17');
    read.result = { kind: 'DOSSIER', dossier: { ...dossierDiagnosedOn(['debut-8']), version: 2 } };

    await whenPreparingTheCorrection();

    thenTheSelectionShowsTheGesture('Démarrage');
  });

  it('should keep the proposition in progress when the manager selects another pointage', async () => {
    givenTwoDiagnostics();
    await whenRendering();
    await whenClicking('anomalie-choix');
    await whenEntering('anomalie-motif', 'Cible confirmée');

    await whenSelecting('fin-17');

    thenInterpretationIsSelected();
    thenTextContains('anomalie-acte', 'Correction du pointage');
    thenFieldValueIs('anomalie-motif', 'Cible confirmée');
  });

  it('should show the time of the selected pointage with its seconds, then its long day, in the selection', async () => {
    await whenRendering();

    await whenSelecting('fin-17');

    thenTheSelectionTimeIs('17:00:00 · lundi 14 septembre');
  });

  it('should show the regularisation mention of the selected pointage', async () => {
    givenACorrectedTerminatingFact();
    await whenRendering();

    await whenSelecting('90000000-0000-0000-0000-000000000001');

    thenTheSelectionContains('Régularisation');
  });

  it('should designate the pointage replaced by the selected pointage by its nature and instant', async () => {
    givenAReplacementOfTheEndRecordedInTheDossier();
    await whenRendering();

    await whenSelecting('fin-18');

    thenTheSelectionContains('Remplace le pointage lundi 14 septembre à 17:00:00 · Arrêt');
  });

  it('should only flag on the frise that a pointage is cancelled, and give its reason in the selection', async () => {
    givenACancelledOpeningTargetedByTheRemainingEnd();
    await whenRendering();

    await whenSelecting('debut-8');

    thenTheMarkerFlagIs('debut-8', 'data-annule', 'true');
    thenTheMarkerDoesNotGiveTheReason('debut-8', 'Début annulé · gestionnaire');
    thenTheSelectionContains('Début annulé · gestionnaire');
  });

  it('should show the registration of the selected pointage as a long day and local time without seconds', async () => {
    await whenRendering();

    await whenSelecting('fin-17');

    thenTheTraceContains('Enregistré le mardi 15 septembre à 08:00 · camille');
  });

  it('should show the time of the selected pointage with its seconds in its traceability', async () => {
    await whenRendering();

    await whenSelecting('fin-17');

    thenTheTraceContains('Camille Martin · lundi 14 septembre à 17:00:00');
  });

  it('should show when a cancelled pointage was cancelled as a long day and local time without seconds', async () => {
    givenACancelledOpeningTargetedByTheRemainingEnd();
    await whenRendering();

    await whenSelecting('debut-8');

    thenTheSelectionContains('Début annulé · gestionnaire · mardi 15 septembre à 08:00');
  });

  it('should show the instant of the proposed fact with its seconds', async () => {
    await whenRendering();

    await whenClicking('anomalie-choix');

    thenTextContains('anomalie-proposition-resume', 'Arrêt · lundi 14 septembre à 17:00:00');
  });

  it('should show the instant of the pointage to cancel with its seconds', async () => {
    await whenRendering();
    await whenClicking('anomalie-detail');

    await whenCancelling('fin-17');

    thenTextContains('anomalie-proposition-resume', 'Arrêt · lundi 14 septembre à 17:00:00');
  });

  it('should show no fact line in the proposition summary while neither type nor intention is entered', async () => {
    await whenRendering();
    await whenClicking('anomalie-detail');

    await whenClicking('anomalie-regulariser');

    thenSummaryIsEmpty();
  });

  it('should show the instant of the previewed act and of the compared journals with their seconds', async () => {
    givenASuccessfulPreview();
    await whenRendering();

    await whenPreparingTheCorrection();

    thenTextContains('anomalie-apercu-acte', 'lundi 14 septembre à 17:00:00');
    thenTextContains('anomalie-apercu-journal', 'Camille Martin · lundi 14 septembre à 17:00:00');
    thenTextContains('anomalie-apercu-fait-avant-fin-17', 'lundi 14 septembre à 17:00:00');
    thenTextContains('anomalie-apercu-fait-apres-fin-17', 'lundi 14 septembre à 17:00:00');
  });

  it('should name the pointages compared before and after the act by their gesture', async () => {
    givenAPreviewTurningTheEndIntoAnNcPassage();
    await whenRendering();

    await whenPreparingTheCorrection();

    thenComparedFactContains('avant', 'fin-17', 'Arrêt');
    thenComparedFactContains('apres', 'fin-17', 'Passage en NC');
    thenComparedFactDoesNotContain('apres', 'fin-17', 'Transition');
  });

  it('should name the fact of the previewed act by its gesture instead of its type and intention', async () => {
    givenAGuidedCorrectionOf({ type: 'NON_CONFORMITE', intention: 'TRANSITION' });
    await whenRendering();

    await whenPreparingTheCorrection();

    thenTextContains('anomalie-apercu-acte', 'Passage en NC · lundi 14 septembre à 17:00:00');
    thenTextDoesNotContain('anomalie-apercu-acte', 'Transition');
  });

  it('should name the operator of every compared pointage instead of its identifier, before and after', async () => {
    givenAPreviewComparingNamedAndUnnamedOperators();
    await whenRendering();

    await whenPreparingTheCorrection();

    thenComparedFactHeaderIs('avant', 'fin-17', 'Camille Martin · lundi 14 septembre à 17:00:00');
    thenComparedFactHeaderIs('apres', 'fin-17', 'Alex Durand · lundi 14 septembre à 17:00:00');
    thenComparedFactHeaderIs('apres', 'fin-18', 'Opérateur non résolu · lundi 14 septembre à 17:00:00');
  });

  it('should designate the activities of the compared pointages by their label, never by their identifier', async () => {
    givenAPreviewComparingNamedAndUnnamedOperators();
    await whenRendering();

    await whenPreparingTheCorrection();

    thenComparedFactContains('apres', 'fin-18', 'Vise l’activité Travail ouvert à 8 h');
    thenComparedFactContains('apres', 'fin-18', 'Crée l’activité Arrêt · lundi 14 septembre à 17:00:00');
    thenComparedFactContains('apres', 'fin-19', 'Vise l’activité Activité non résolue');
    thenComparedFactsShowNoIdentifier(['travail-8', 'nc-12', 'nc-99']);
  });

  it('should designate the activities of a selected pointage trace by their label, never by their identifier', async () => {
    givenAPointageCreatingAnActivityAbsentFromTheDossier();
    await whenRendering();

    await whenSelecting('debut-9');

    thenTheTraceContains('Camille Martin · lundi 14 septembre à 08:00:00');
    thenTheTraceContains('Vise l’activité Travail ouvert à 8 h');
    thenTheTraceContains('Crée l’activité Démarrage · lundi 14 septembre à 08:00:00');
    thenTheTraceShowsNoIdentifier(['debut-9', 'travail-8', 'travail-9']);
  });

  it('should name the operator in the selected trace and say an unresolved record without showing its identifier', async () => {
    givenAPointageCreatingAnActivityAbsentFromTheDossier({ operateurNom: '' });
    await whenRendering();

    await whenSelecting('debut-9');

    thenTheTraceContains('Opérateur non résolu · lundi 14 septembre à 08:00:00');
  });

  it('should designate the activities of an obsolete address history by their label, never by their identifier', async () => {
    read.result = {
      kind: 'ANCRE_ANNULEE',
      journal: [
        { ...pointageDeLaFinFixture(), id: new PointageAnomalieId('debut-9'), activiteCreee: new ActiviteAnomalieId('travail-9') },
        { ...pointageDeLaFinFixture(), id: new PointageAnomalieId('fin-9'), fait: { ...faitConflitFixture(), activiteVisee: 'travail-9' } },
        {
          ...pointageDeLaFinFixture(),
          id: new PointageAnomalieId('fin-10'),
          fait: { ...faitConflitFixture(), activiteVisee: 'travail-10' },
        },
      ],
    };

    await whenRendering();

    thenReceivedFactContains('debut-9', 'Crée l’activité Arrêt · lundi 14 septembre à 17:00:00');
    thenReceivedFactContains('fin-9', 'Vise l’activité Arrêt · lundi 14 septembre à 17:00:00');
    thenReceivedFactContains('fin-10', 'Vise l’activité Activité non résolue');
    thenReceivedFactsShowNoActivityIdentifier(['debut-9', 'fin-9', 'fin-10']);
  });

  it('should designate the replaced pointage of the pointages compared after the act, never by its identifier', async () => {
    givenAPreviewComparingNamedAndUnnamedOperators({ remplace: 'fin-17' });
    await whenRendering();

    await whenPreparingTheCorrection();

    thenComparedFactContains('apres', 'fin-18', 'Remplace le pointage lundi 14 septembre à 17:00:00 · Arrêt');
    thenComparedFactsShowNoIdentifier(['fin-17 ·', 'pointage fin-17']);
  });

  it('should designate the replaced pointage of an obsolete address history by its nature and instant', async () => {
    read.result = {
      kind: 'ANCRE_ANNULEE',
      journal: [
        pointageDeLaFinFixture(),
        { ...pointageDeLaFinFixture(), id: new PointageAnomalieId('fin-18'), remplace: new PointageAnomalieId('fin-17') },
        { ...pointageDeLaFinFixture(), id: new PointageAnomalieId('fin-19'), remplace: new PointageAnomalieId('fin-absent') },
      ],
    };

    await whenRendering();

    thenReceivedFactContains('fin-18', 'Remplace le pointage lundi 14 septembre à 17:00:00 · Arrêt');
    thenReceivedFactContains('fin-19', 'Remplace un pointage non résolu');
    thenReceivedFactDoesNotContain('fin-19', 'fin-absent');
  });

  it('should designate the pointage of the previewed act by its nature and instant instead of its identifier', async () => {
    givenASuccessfulPreview();
    await whenRendering();

    await whenPreparingTheCorrection();

    thenTextContains('anomalie-apercu-acte', 'lundi 14 septembre à 17:00:00 · Arrêt · Cible confirmée');
    thenTextDoesNotContain('anomalie-apercu-acte', 'fin-17');
  });

  it('should say the pointage of the previewed act is unresolved when the compared journal does not hold it', async () => {
    givenAPreviewWhoseJournalBeforeTheActIsEmpty();
    await whenRendering();

    await whenPreparingTheCorrection();

    thenTextContains('anomalie-apercu-acte', 'Pointage non résolu · Cible confirmée');
    thenTextDoesNotContain('anomalie-apercu-acte', 'fin-17');
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
    thenAbsent('anomalie-probleme');
    expect(read.demandes).toHaveLength(0);
  });

  it('should retain the available journal when the addressed anchor was cancelled', async () => {
    read.result = { kind: 'ANCRE_ANNULEE', journal: dossierAnomalieFixture().journal };

    await whenRendering();

    thenTextContains('anomalie-adresse-obsolete', 'annulé ou remplacé');
    thenTextContains('anomalie-historique', 'lundi 14 septembre à 17:00:00');
    thenAbsent('anomalie-choix');
  });

  it('should name the operator and the workstation of the selected pointage without any identifier', async () => {
    await whenRendering();

    await whenSelecting('fin-17');

    thenTheSelectionContains('Opérateur : Camille Martin · Poste : DMU 50');
    thenTheSelectionDoesNotContain('op-camille');
    thenTheSelectionDoesNotContain('poste-1');
  });

  it('should present an unresolved operator and workstation of the selected pointage without any identifier', async () => {
    const dossier = dossierAnomalieFixture();
    read.result = {
      kind: 'DOSSIER',
      dossier: { ...dossier, journal: dossier.journal.map(pointage => ({ ...pointage, operateurNom: '', posteLibelle: '' })) },
    };

    await whenRendering();

    await whenSelecting('fin-17');

    thenTheSelectionContains('Opérateur : Opérateur non résolu · Poste : Poste non résolu');
    thenTheSelectionDoesNotContain('op-camille');
    thenTheSelectionDoesNotContain('poste-1');
  });

  it('should distinguish a selected pointage without workstation from an unresolved workstation', async () => {
    const dossier = dossierAnomalieFixture();
    read.result = {
      kind: 'DOSSIER',
      dossier: {
        ...dossier,
        journal: dossier.journal.map(pointage => ({ ...pointage, posteLibelle: '', fait: { ...pointage.fait, poste: '' } })),
      },
    };

    await whenRendering();

    await whenSelecting('fin-17');

    thenTheSelectionContains('Poste : Sans poste');
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

  it('should explain a selected unresolved activity without presenting an empty duration', async () => {
    const dossier = dossierAnomalieFixture();
    read.result = { kind: 'DOSSIER', dossier: { ...dossier, activites: dossier.activites.map(activite => ({ ...activite, temps: '' })) } };

    await whenRendering();
    await whenSelectingTheActivity('travail-8');

    thenTheSelectionContains('À résoudre · Temps à résoudre');
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

  it('should show a selected ongoing activity after resolution without presenting a definitive duration', async () => {
    read.result = {
      kind: 'DOSSIER',
      dossier: {
        ...dossierAnomalieFixture(),
        enConflit: false,
        activites: [
          {
            id: new ActiviteAnomalieId('travail-8'),
            libelle: 'Travail commencé à 8 h',
            etat: 'EN_COURS',
            temps: 'Temps non définitif',
            ouvrant: new PointageAnomalieId('debut-8'),
          },
        ],
      },
    };

    await whenRendering();
    await whenSelectingTheActivity('travail-8');

    thenTheSelectionContains('En cours · Temps non définitif');
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

  it('should present the exact authoritative period and duration of selected finished work', async () => {
    givenAnAuthoritativeActivity('TERMINEE', 'PT8H59M59.876543211S');
    await whenRendering();

    await whenSelectingTheActivity('travail-8');

    thenTheSelectionContains('Travail');
    thenTheSelectionContains('Début lundi 14 septembre à 08:00');
    thenTheSelectionContains('Fin lundi 14 septembre à 17:00');
    thenTheSelectionContains('8 h 59 min 59,876543211 s');
  });

  it('should retain the finished duration supplied by the dossier for the selected activity', async () => {
    const dossier = dossierAnomalieFixture();
    read.result = {
      kind: 'DOSSIER',
      dossier: {
        ...dossier,
        activites: [
          {
            id: new ActiviteAnomalieId('travail-8'),
            libelle: 'Travail',
            etat: 'TERMINEE',
            temps: '4 h',
            ouvrant: new PointageAnomalieId('debut-8'),
          },
        ],
      },
    };

    await whenRendering();
    await whenSelectingTheActivity('travail-8');

    thenTheSelectionContains('Terminée · 4 h');
  });

  it('should describe selected ongoing authoritative work without a definitive duration', async () => {
    givenAnAuthoritativeActivity('EN_COURS', 'PT3H');
    await whenRendering();

    await whenSelectingTheActivity('travail-8');

    thenTheSelectionContains('En cours · Temps non définitif');
    thenTheSelectionDoesNotContain('3 h');
  });

  it.each([
    { duree: 'PT0S', attendu: '0 s' },
    { duree: 'PT45M', attendu: '45 min' },
    { duree: 'PT24H', attendu: '24 h' },
    { duree: 'durée reçue', attendu: 'durée reçue' },
  ])('should present the received non-conformity duration $duree', async ({ duree, attendu }) => {
    givenAnAuthoritativeActivity('TERMINEE', duree, 'NON_CONFORMITE');
    await whenRendering();

    await whenSelectingTheActivity('travail-8');

    thenTheSelectionContains('Non-conformité');
    thenTheSelectionContains(attendu);
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

  it('should name on the frise the ongoing work in the proposed result without presenting a definitive duration', async () => {
    givenASuccessfulPreview({
      ...dossierAnomalieFixture(),
      enConflit: false,
      activites: [
        {
          id: new ActiviteAnomalieId('travail-8'),
          libelle: 'Travail commencé à 8 h',
          etat: 'EN_COURS',
          temps: 'Temps non définitif',
          ouvrant: new PointageAnomalieId('debut-8'),
        },
      ],
    });
    await whenRendering();

    await whenPreparingTheCorrection();

    thenTheActivityAfterTheActIsNamed('travail-8', 'Travail commencé à 8 h · En cours · Temps non définitif · modifiée');
  });

  it('should draw no state after the act under the frise before any preview', async () => {
    givenASuccessfulPreview();

    await whenRendering();

    thenAbsent('anomalie-frise-apres');
  });

  it('should draw the state after the act under the frise once the preview is shown', async () => {
    givenASuccessfulPreview();
    await whenRendering();

    await whenPreparingTheCorrection();

    thenTextContains('anomalie-frise-apres-titre', 'Après cet acte');
  });

  it('should flag as changed the activities of the state after the act that the act changes or creates, and no other', async () => {
    const dossier = dossierAnomalieFixture();
    const inchangee = {
      id: new ActiviteAnomalieId('travail-8'),
      libelle: 'Travail ouvert à 8 h',
      etat: 'A_RESOUDRE',
      temps: 'À résoudre',
      ouvrant: new PointageAnomalieId('debut-8'),
    } as const;
    givenASuccessfulPreview({
      ...dossier,
      enConflit: false,
      activites: [
        inchangee,
        {
          id: new ActiviteAnomalieId('nc-12'),
          libelle: 'NC ouverte à 12 h',
          etat: 'EN_COURS',
          temps: '',
          ouvrant: new PointageAnomalieId('debut-12'),
        },
      ],
    });
    await whenRendering();

    await whenPreparingTheCorrection();

    thenTheActivityAfterTheActIsFlagged('travail-8', 'false');
    thenTheActivityAfterTheActIsFlagged('nc-12', 'true');
  });

  it('should show in green the fact the act creates and strike the pointage it cancels, in the state after the act', async () => {
    const dossier = dossierAnomalieFixture();
    const origine = pointageDeLaFinFixture();
    givenASuccessfulPreview({
      ...dossier,
      enConflit: false,
      journal: [
        { ...origine, annulation: { motif: 'La cible est la NC.', auteur: 'gestionnaire', instant: INSTANT_ENREGISTREMENT } },
        {
          ...origine,
          id: new PointageAnomalieId('remplacement'),
          fait: { ...origine.fait, activiteVisee: 'nc-12', instant: INSTANT_FIN_DE_TRAVAIL },
          remplace: origine.id,
        },
      ],
    });
    await whenRendering();

    await whenPreparingTheCorrection();

    thenTheMarkerAfterTheActIs('remplacement', { 'data-fait-de-l-acte': 'true', 'data-annule': 'false' });
    thenTheMarkerAfterTheActIs('fin-17', { 'data-fait-de-l-acte': 'false', 'data-annule': 'true' });
  });

  it('should withdraw the state after the act when the manager changes the reason', async () => {
    givenASuccessfulPreview();
    await whenRendering();
    await whenPreparingTheCorrection();

    await whenEntering('anomalie-motif', 'Motif précisé');

    thenAbsent('anomalie-frise-apres');
  });

  it('should keep the received textual consequences of the act, and show none when it has none', async () => {
    givenASuccessfulPreview({ ...dossierAnomalieFixture(), enConflit: false, consequences: ['Une heure de travail de plus.'] });
    await whenRendering();

    await whenPreparingTheCorrection();

    thenTextContains('anomalie-apercu-consequences', 'Une heure de travail de plus.');
  });

  it('should draw no textual consequences block when the act has none', async () => {
    givenASuccessfulPreview();
    await whenRendering();

    await whenPreparingTheCorrection();

    thenAbsent('anomalie-apercu-consequences');
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

    thenTheProblemReads('Reprise encore à rattacher.');
    thenTextContains('anomalie-cloture', 'Clôturé');
    thenTextContains('anomalie-resultat', 'Acte enregistré, conflit restant');
    thenAbsent('anomalie-apercu');
  });

  it.each([
    { enConflit: false, finAutomatique: true, attendu: 'Conflit levé · fin automatique restante' },
    { enConflit: true, finAutomatique: false, attendu: 'Acte enregistré, conflit restant' },
    { enConflit: true, finAutomatique: true, attendu: 'Acte enregistré, conflit restant' },
  ])(
    'should announce in the receipt of a conflict act "$attendu" when the conflict is $enConflit and the automatic end $finAutomatique',
    async ({ enConflit, finAutomatique, attendu }) => {
      givenAConflictActLeaving({ enConflit, finAutomatique });
      await whenRendering();

      await whenPreparingTheCorrection();
      await whenClicking('anomalie-confirmer');

      thenTextContains('anomalie-resultat', attendu);
    },
  );

  it('should link the receipt of a lifted conflict to the remaining automatic end and keep the way back to the list', async () => {
    givenALiftedConflictLeavingAnExpiredActivity();
    route.queryParamMap.next(
      convertToParamMap({ pointage: 'fin-17', nature: 'CONFLIT', operateur: 'op-camille', element: 'moule-42', page: '2' }),
    );
    await whenRendering();

    await whenPreparingTheCorrection();
    await whenClicking('anomalie-confirmer');

    thenTheLinkTargets('anomalie-fin-automatique-restante', '/anomalies/suivi-camille', {
      pointage: 'debut-8',
      nature: 'CONFLIT',
      operateur: 'op-camille',
      element: 'moule-42',
      page: '2',
    });
  });

  it('should number the links when several automatic ends remain', async () => {
    givenALiftedConflictLeavingExpiredActivities(['debut-8', 'debut-9']);
    await whenRendering();

    await whenPreparingTheCorrection();
    await whenClicking('anomalie-confirmer');

    thenTheTextsAre('anomalie-fin-automatique-restante', [
      'Traiter la fin automatique restante (1 sur 2)',
      'Traiter la fin automatique restante (2 sur 2)',
    ]);
  });

  it('should link no automatic end in the receipt when none remains', async () => {
    givenAConflictActLeaving({ enConflit: false, finAutomatique: false });
    await whenRendering();

    await whenPreparingTheCorrection();
    await whenClicking('anomalie-confirmer');

    thenAbsent('anomalie-fin-automatique-restante');
  });

  it('should link no automatic end in the receipt of an automatic end that is still the one the manager is on', async () => {
    givenAnAutomaticEndStillExpiredAfterItsRegularisation();
    await whenRendering();

    await whenPreviewingTheDatedEnd();
    await whenClicking('anomalie-confirmer');

    thenTextContains('anomalie-resultat', 'Acte enregistré, anomalie restante');
    thenAbsent('anomalie-fin-automatique-restante');
  });

  it('should announce the remaining automatic end in the preview without linking it', async () => {
    givenALiftedConflictLeavingExpiredActivities(['debut-8']);
    await whenRendering();

    await whenPreparingTheCorrection();

    thenTextContains('anomalie-apercu', 'Après cet acte : conflit levé · fin automatique restante');
    thenAbsent('anomalie-fin-automatique-restante');
  });

  it('should announce the outcome of the conflict in the receipt when two verifications of the receipt come back one after the other', async () => {
    const apres = givenALiftedConflictLeavingExpiredActivities(['debut-8']);
    application.result = { kind: 'ISSUE_INCONNUE' };
    await whenRendering();
    await whenPreparingTheCorrection();
    await whenClicking('anomalie-confirmer');

    const [premiere, seconde] = await whenAskingTwiceToVerifyTheReceipt();
    await whenResponseArrives(premiere, { kind: 'ATTESTE', dossier: apres });
    await whenResponseArrives(seconde, { kind: 'ATTESTE', dossier: apres });

    thenTextContains('anomalie-resultat', 'Conflit levé · fin automatique restante');
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

    thenTheProblemReads('Le journal a été actualisé.');
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

    thenTheProblemReads('Autre contradiction.');
    thenAbsent('anomalie-acte');
    thenAbsent('anomalie-apercu');
    expect(read.demandes).toHaveLength(2);
  });

  it('should start detailed correction with the selected pointage facts unchanged', async () => {
    await whenRendering();

    await whenClicking('anomalie-detail');
    await whenCorrecting('fin-17');

    thenTextContains('anomalie-acte', 'Correction du pointage');
    thenFieldValueIs('anomalie-cible', 'travail-8');
    thenTheInstantFieldsShow('14/09/2026', '17:00:00');
    thenDetailedFactIsOpen();
  });

  it('should name the received activity interval in the journal target and correction choices', async () => {
    givenAnAuthoritativeActivity('TERMINEE', 'PT4H');
    await whenRendering();

    await whenClicking('anomalie-detail');
    await whenCorrecting('fin-17');

    const libelle = 'Travail · lundi 14 septembre à 08:00 → lundi 14 septembre à 17:00';
    thenTheTraceContains(`Vise l’activité ${libelle}`);
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
          {
            id: new ActiviteAnomalieId('nc-12'),
            libelle: 'Non-conformité ouverte à 12 h',
            etat: 'TERMINEE',
            temps: '5 h',
            ouvrant: new PointageAnomalieId('debut-12'),
          },
        ],
      },
    };
    await whenRendering();

    await whenClicking('anomalie-detail');
    await whenCorrecting('fin-17');
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

    thenTargetChoiceIs('nc-12', 'Activité non résolue (référence actuelle)');
  });

  it('should let the manager explicitly choose no target activity when correcting an opening', async () => {
    await whenRendering();

    await whenClicking('anomalie-detail');
    await whenCorrecting('fin-17');
    await whenChoosingTheGesture('Démarrage');
    await whenEntering('anomalie-cible', '');
    await whenEntering('anomalie-motif', 'Ouverture confirmée');
    await whenClicking('anomalie-previsualiser');

    thenAbsent('anomalie-cible');
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
    await whenCorrecting('fin-17');

    thenTargetChoiceIs('travail-8', 'Démarrage · lundi 14 septembre à 08:00:00');
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
    await whenCancelling('fin-17');

    thenTextContains('anomalie-acte', 'Annulation du pointage');
    thenTheSelectionTimeIs('17:00:00 · lundi 14 septembre');
    thenAbsent('anomalie-cible');
    thenFieldValueIs('anomalie-motif', '');
  });

  it('should open detailed regularisation without any chosen gesture', async () => {
    await whenRendering();

    await whenClicking('anomalie-detail');
    await whenClicking('anomalie-regulariser');

    thenTextContains('anomalie-acte', 'Régularisation d’un fait manquant');
    thenGestureIs('Choisissez ce que signale le pointage');
    thenDetailedFactIsOpen();
    thenAbsent('anomalie-motif');
  });

  it('should offer the five gestures a pointage can signal, after an empty choice, when a missing fact is regularised from scratch', async () => {
    await whenRendering();
    await whenClicking('anomalie-detail');

    await whenClicking('anomalie-regulariser');

    expect(gestureChoices()).toEqual([
      'Choisissez ce que signale le pointage',
      'Démarrage',
      'Démarrage en NC',
      'Passage en NC',
      'Retour en bon',
      'Arrêt',
    ]);
    thenGestureIs('Choisissez ce que signale le pointage');
    expect(gestureSelect().options[0]?.disabled).toBe(true);
  });

  it('should show the gesture the pointage signals, without an empty choice, when a received pointage is corrected', async () => {
    await whenRendering();
    await whenClicking('anomalie-detail');

    await whenCorrecting('fin-17');

    expect(gestureChoices()).toEqual(['Démarrage', 'Démarrage en NC', 'Passage en NC', 'Retour en bon', 'Arrêt']);
    thenGestureIs('Arrêt');
  });

  it.each(['Démarrage', 'Démarrage en NC', 'Passage en NC', 'Retour en bon', 'Arrêt'])(
    'should propose the gesture "%s" the manager chooses for the pointage',
    async geste => {
      await whenRendering();
      await whenClicking('anomalie-detail');
      await whenCorrecting('fin-17');

      await whenChoosingTheGesture(geste);

      thenGestureIs(geste);
      thenTextContains('anomalie-proposition-resume', `${geste} · lundi 14 septembre à 17:00:00`);
    },
  );

  it.each(['Démarrage', 'Démarrage en NC'])('should not ask for the activity the gesture "%s" ends, as it ends none', async geste => {
    await whenRendering();
    await whenClicking('anomalie-detail');
    await whenClicking('anomalie-regulariser');

    await whenChoosingTheGesture(geste);

    thenAbsent('anomalie-cible');
  });

  it.each(['Passage en NC', 'Retour en bon', 'Arrêt'])('should ask for the activity the gesture "%s" ends', async geste => {
    await whenRendering();
    await whenClicking('anomalie-detail');
    await whenClicking('anomalie-regulariser');

    await whenChoosingTheGesture(geste);

    thenTargetChoiceIs('', 'Aucune activité visée');
  });

  it('should not ask for an activity before the manager says what the pointage signals', async () => {
    await whenRendering();
    await whenClicking('anomalie-detail');

    await whenClicking('anomalie-regulariser');

    thenAbsent('anomalie-cible');
  });

  it('should keep the activity a start still aims at, so that the manager can clear it', async () => {
    await whenRendering();
    await whenClicking('anomalie-detail');
    await whenCorrecting('fin-17');

    await whenChoosingTheGesture('Démarrage');

    thenTargetChoiceIs('travail-8', 'Travail ouvert à 8 h');
    thenTextContains('anomalie-validation', 'Une ouverture ne vise aucune activité');
  });

  it('should stop asking for the activity once the manager has cleared the one a start aimed at', async () => {
    await whenRendering();
    await whenClicking('anomalie-detail');
    await whenCorrecting('fin-17');
    await whenChoosingTheGesture('Démarrage');

    await whenEntering('anomalie-cible', '');

    thenAbsent('anomalie-cible');
  });

  it('should fold the operator and the workstation of a corrected pointage into one line, by their names', async () => {
    await whenRendering();
    await whenClicking('anomalie-detail');

    await whenCorrecting('fin-17');

    thenTextContains('anomalie-identite', 'Camille Martin · DMU 50');
    thenAbsent('anomalie-operateur');
    thenAbsent('anomalie-poste');
  });

  it('should name what the modify button changes while keeping its visible text in its accessible name', async () => {
    await whenRendering();
    await whenClicking('anomalie-detail');

    await whenCorrecting('fin-17');

    thenTheButtonReads('anomalie-identite-modifier', 'Modifier', 'Modifier l’opérateur et le poste');
  });

  it('should unfold the operator and workstation fields when the manager asks to modify them', async () => {
    await whenRendering();
    await whenClicking('anomalie-detail');
    await whenCorrecting('fin-17');

    await whenClicking('anomalie-identite-modifier');

    thenOperatorIs('Camille Martin · 007');
    thenPosteChoiceIs('poste-1', 'DMU 50');
    thenTheIdentityIsUnfolded(true);
  });

  it('should fold the operator and workstation fields again when the manager asks to modify them twice', async () => {
    await whenRendering();
    await whenClicking('anomalie-detail');
    await whenCorrecting('fin-17');
    await whenClicking('anomalie-identite-modifier');

    await whenClicking('anomalie-identite-modifier');

    thenAbsent('anomalie-operateur');
    thenAbsent('anomalie-poste');
    thenTheIdentityIsUnfolded(false);
  });

  it('should fold the operator and workstation fields again when the manager starts another proposition', async () => {
    await whenRendering();
    await whenClicking('anomalie-detail');
    await whenCorrecting('fin-17');
    await whenClicking('anomalie-identite-modifier');

    await whenClicking('anomalie-choix');

    thenAbsent('anomalie-operateur');
    thenTheIdentityIsUnfolded(false);
  });

  it('should name the operator the manager chose in the folded line', async () => {
    await whenRendering();
    await whenClicking('anomalie-detail');
    await whenCorrecting('fin-17');
    await whenClicking('anomalie-identite-modifier');
    await whenChoosingTheOperator('Alex Durand');

    await whenClicking('anomalie-identite-modifier');

    thenTextContains('anomalie-identite', 'Alex Durand · DMU 50');
  });

  it('should name an operator and a workstation the referential does not hold as unresolved in the folded line', async () => {
    givenAnAutomaticEnd(finARegulariserFixture('poste-supprime', 'op-supprime'));

    await whenRendering();
    await whenClicking('anomalie-choix');

    thenTextContains('anomalie-identite', 'Opérateur non résolu · Poste non résolu');
  });

  it('should say that no workstation is chosen in the folded line', async () => {
    givenAnAutomaticEnd(finARegulariserFixture(''));

    await whenRendering();
    await whenClicking('anomalie-choix');

    thenTextContains('anomalie-identite', 'Camille Martin · Sans poste');
  });

  it('should offer the operators of the referential by name and pupitre code when the fact is edited', async () => {
    await whenRendering();
    await whenClicking('anomalie-detail');
    await whenCorrecting('fin-17');

    await whenClicking('anomalie-identite-modifier');
    await whenOpeningTheOperatorChoice();

    expect(operatorOptions()).toEqual(['Camille Martin · 007', 'Alex Durand', 'Zoé Évrard · 012']);
    thenTextDoesNotContainAnIdentifier('anomalie-fait-propose');
  });

  it('should say once what is missing about the gesture when a missing fact is regularised from scratch', async () => {
    await whenRendering();
    await whenClicking('anomalie-detail');

    await whenClicking('anomalie-regulariser');

    thenTheValidationReads(['Choisissez ce que signale le pointage.', 'Choisissez l’opérateur.', 'Renseignez la date et l’heure du fait.']);
  });

  it('should ask to choose the operator, and say why the act cannot be previewed, when a missing fact is regularised from scratch', async () => {
    await whenRendering();
    await whenClicking('anomalie-detail');

    await whenClicking('anomalie-regulariser');

    thenOperatorIs('Choisissez l’opérateur');
    thenTextContains('anomalie-validation', 'Choisissez l’opérateur.');
    thenTheOperatorChoiceIsDescribedByItsError('Choisissez l’opérateur.');
    thenPosteChoiceIs('', 'Sans poste');
  });

  it('should show no line about the operator while a missing fact has none yet', async () => {
    await whenRendering();
    await whenClicking('anomalie-detail');

    await whenClicking('anomalie-regulariser');

    thenAbsent('anomalie-identite');
    thenAbsent('anomalie-identite-modifier');
  });

  it('should name the operator in a line once the manager has chosen one for a missing fact', async () => {
    await whenRendering();
    await whenClicking('anomalie-detail');
    await whenClicking('anomalie-regulariser');

    await whenChoosingTheOperator('Zoé Évrard · 012');

    thenTextContains('anomalie-identite', 'Zoé Évrard · Sans poste');
  });

  it('should stop describing the operator control by an error once an operator is chosen', async () => {
    await whenRendering();
    await whenClicking('anomalie-detail');
    await whenClicking('anomalie-regulariser');

    await whenChoosingTheOperator('Zoé Évrard · 012');

    thenOperatorIs('Zoé Évrard · 012');
    thenTheOperatorChoiceIsNoLongerDescribedByAnError();
  });

  it('should label the gesture and the activity fields by what they decide', async () => {
    await whenRendering();
    await whenClicking('anomalie-detail');
    await whenCorrecting('fin-17');

    expect(labelOf('anomalie-signal')).toBe('Ce que signale le pointage');
    expect(labelOf('anomalie-cible')).toBe('Activité qu’il termine');
  });

  it('should label the operator and workstation fields by their role, never by an identifier', async () => {
    await whenRendering();
    await whenClicking('anomalie-detail');
    await whenCorrecting('fin-17');

    await whenClicking('anomalie-identite-modifier');
    expect(labelOf('anomalie-operateur')).toBe('Opérateur concerné');
    expect(labelOf('anomalie-poste')).toBe('Poste (facultatif)');
  });

  it('should find the operator the manager looks for by its pupitre code and put it in the proposition', async () => {
    await whenRendering();
    await whenClicking('anomalie-detail');
    await whenCorrecting('fin-17');

    await whenClicking('anomalie-identite-modifier');
    await whenChoosingTheOperator('Zoé Évrard · 012', '012');
    await whenEntering('anomalie-motif', 'Opérateur corrigé');
    await whenClicking('anomalie-previsualiser');

    thenOperatorIs('Zoé Évrard · 012');
    expect(preview.actes).toMatchObject([{ kind: 'CORRECTION', fait: { operateur: 'op-zoe' } }]);
  });

  it('should withdraw the preview when the manager chooses another gesture', async () => {
    givenASuccessfulPreview();
    await whenRendering();
    await whenPreparingTheCorrection();

    await whenChoosingTheGesture('Retour en bon');

    thenAbsent('anomalie-apercu');
    thenAbsent('anomalie-confirmer');
  });

  it('should preview the type and intention of the gesture chosen after a former preview was withdrawn', async () => {
    givenASuccessfulPreview();
    await whenRendering();
    await whenPreparingTheCorrection();
    await whenChoosingTheGesture('Retour en bon');

    await whenClicking('anomalie-previsualiser');

    expect(preview.actes[1]).toMatchObject({ fait: { type: 'DEBUT', intention: 'TRANSITION' } });
  });

  it('should withdraw the preview when the manager chooses another operator', async () => {
    givenASuccessfulPreview();
    await whenRendering();
    await whenPreparingTheCorrection();

    await whenClicking('anomalie-identite-modifier');
    await whenChoosingTheOperator('Alex Durand');

    thenAbsent('anomalie-apercu');
    thenAbsent('anomalie-confirmer');
  });

  it('should preview the operator chosen after a former preview was withdrawn', async () => {
    givenASuccessfulPreview();
    await whenRendering();
    await whenPreparingTheCorrection();
    await whenClicking('anomalie-identite-modifier');
    await whenChoosingTheOperator('Alex Durand');

    await whenClicking('anomalie-previsualiser');

    expect(preview.actes).toHaveLength(2);
    expect(preview.actes[1]).toMatchObject({ fait: { operateur: 'op-alex' } });
  });

  it('should keep an operator the referential does not hold as the selected reference without showing its identifier', async () => {
    givenAnAutomaticEnd(finARegulariserFixture('poste-supprime', 'op-supprime'));
    await whenRendering();

    await whenClicking('anomalie-choix');

    await whenClicking('anomalie-identite-modifier');
    thenOperatorIs('Opérateur non résolu (référence actuelle)');
    thenPosteChoiceIs('poste-supprime', 'Poste non résolu (référence actuelle)');
    thenTextDoesNotContain('anomalie-fait-propose', 'op-supprime');
    thenTextDoesNotContain('anomalie-fait-propose', 'poste-supprime');
  });

  it('should offer no workstation first, then the workstations the operator is qualified on, then the others', async () => {
    await whenRendering();
    await whenClicking('anomalie-detail');

    await whenCorrecting('fin-17');

    await whenClicking('anomalie-identite-modifier');
    expect(posteChoices()).toEqual(['Sans poste', 'Postes habilités: DMU 50', 'Autres postes: Tour 1, Scie 1']);
  });

  it('should regroup the workstations when the manager chooses an operator with other qualifications', async () => {
    await whenRendering();
    await whenClicking('anomalie-detail');
    await whenCorrecting('fin-17');

    await whenClicking('anomalie-identite-modifier');
    await whenChoosingTheOperator('Alex Durand');

    expect(posteChoices()).toEqual(['Sans poste', 'Postes habilités: Tour 1, Scie 1', 'Autres postes: DMU 50']);
  });

  it('should offer every workstation as another one when the operator chosen is qualified on none', async () => {
    await whenRendering();
    await whenClicking('anomalie-detail');
    await whenCorrecting('fin-17');

    await whenClicking('anomalie-identite-modifier');
    await whenChoosingTheOperator('Zoé Évrard · 012');

    expect(posteChoices()).toEqual(['Sans poste', 'Autres postes: DMU 50, Tour 1, Scie 1']);
  });

  it('should withdraw the preview when the manager chooses another workstation', async () => {
    givenASuccessfulPreview();
    await whenRendering();
    await whenPreparingTheCorrection();

    await whenClicking('anomalie-identite-modifier');
    await whenEntering('anomalie-poste', 'poste-2');

    thenAbsent('anomalie-apercu');
    thenAbsent('anomalie-confirmer');
  });

  it.each([
    { choix: 'poste-2', attendu: 'poste-2' },
    { choix: '', attendu: '' },
  ])('should preview the workstation chosen, "$choix", in the proposition', async ({ choix, attendu }) => {
    givenASuccessfulPreview();
    await whenRendering();
    await whenPreparingTheCorrection();
    await whenClicking('anomalie-identite-modifier');
    await whenEntering('anomalie-poste', choix);

    await whenClicking('anomalie-previsualiser');

    expect(preview.actes[1]).toMatchObject({ fait: { poste: attendu } });
  });

  it('should read the referential once when the manager may apply decisions', async () => {
    await whenRendering();

    expect(read.referentielDemandes).toBe(1);
  });

  it('should not pay for the element referential, which only the list filter needs', async () => {
    await whenRendering();

    expect(read.elementsDemandes).toBe(0);
  });

  it('should not read the referential for a consultant who cannot apply decisions', async () => {
    givenAConsultantWhoCannotApplyDecisions();

    await whenRendering();

    thenTextContains('anomalie-droits', 'La correction est réservée aux gestionnaires');
    expect(read.referentielDemandes).toBe(0);
  });

  it('should announce the loading of the referential in place of the operator and workstation fields', async () => {
    const attente = givenTheReferentielIsStillLoading();

    await whenOpeningTheGuidedCorrectionWhileTheReferentielLoads(attente);

    thenTextContains('anomalie-referentiel-chargement', 'Chargement des opérateurs et des postes…');
    thenAbsent('anomalie-operateur');
    thenAbsent('anomalie-poste');
  });

  it('should fold the operator and workstation fields into their line once the referential has arrived', async () => {
    const attente = givenTheReferentielIsStillLoading();
    await whenOpeningTheGuidedCorrectionWhileTheReferentielLoads(attente);

    await whenResponseArrives(attente, referentielFixture());

    thenAbsent('anomalie-referentiel-chargement');
    thenAbsent('anomalie-operateur');
    thenTextContains('anomalie-identite', 'Camille Martin · DMU 50');
  });

  it('should say that the referential is unavailable and keep the current choices, which can no longer be changed', async () => {
    read.referentielFailure = new Error('Référentiel indisponible');
    await whenRendering();

    await whenClicking('anomalie-choix');

    thenTextContains('anomalie-referentiel-erreur', 'Liste des opérateurs et des postes indisponible');
    thenOperatorIs('Opérateur actuel conservé');
    thenDisabled('anomalie-operateur');
    thenPosteChoiceIs('poste-1', 'Poste actuel conservé');
    thenInputIsDisabled('anomalie-poste');
  });

  it('should leave the unavailable referential open, with no way to fold it away', async () => {
    read.referentielFailure = new Error('Référentiel indisponible');
    await whenRendering();

    await whenClicking('anomalie-choix');

    thenAbsent('anomalie-identite-modifier');
  });

  it('should leave the loading referential open, with no way to fold it away', async () => {
    const attente = givenTheReferentielIsStillLoading();

    await whenOpeningTheGuidedCorrectionWhileTheReferentielLoads(attente);

    thenAbsent('anomalie-identite-modifier');
  });

  it('should show no line about the operator while the referential is unavailable, the fields already saying it', async () => {
    read.referentielFailure = new Error('Référentiel indisponible');
    await whenRendering();

    await whenClicking('anomalie-choix');

    thenAbsent('anomalie-identite');
  });

  it('should show no line about the operator while the referential loads, the fields already saying it', async () => {
    const attente = givenTheReferentielIsStillLoading();

    await whenOpeningTheGuidedCorrectionWhileTheReferentielLoads(attente);

    thenAbsent('anomalie-identite');
  });

  it('should keep the line about the operator and its button above the fields the manager unfolded by modifying', async () => {
    await whenRendering();
    await whenClicking('anomalie-detail');
    await whenCorrecting('fin-17');

    await whenClicking('anomalie-identite-modifier');

    thenTextContains('anomalie-identite', 'Camille Martin · DMU 50');
    thenTheIdentityIsUnfolded(true);
  });

  it('should let the manager preview the current choices while the referential is unavailable', async () => {
    read.referentielFailure = new Error('Référentiel indisponible');
    await whenRendering();
    await whenClicking('anomalie-choix');
    await whenEntering('anomalie-motif', 'Cible confirmée');

    await whenClicking('anomalie-previsualiser');

    expect(preview.actes).toMatchObject([{ fait: { operateur: 'op-camille', poste: 'poste-1' } }]);
  });

  it('should offer the operators and workstations again once the manager retries an unavailable referential', async () => {
    await givenAnUnavailableReferentielRetried();

    await whenClicking('anomalie-identite-modifier');

    thenAbsent('anomalie-referentiel-erreur');
    thenOperatorIs('Camille Martin · 007');
    expect(posteChoices()).toEqual(['Sans poste', 'Postes habilités: DMU 50', 'Autres postes: Tour 1, Scie 1']);
    expect(read.referentielDemandes).toBe(2);
  });

  it('should keep the focus on the retry button while the referential is read again', async () => {
    read.referentielFailure = new Error('Référentiel indisponible');
    await whenRendering();
    await whenClicking('anomalie-choix');

    await whenRetryingTheReferentielWhileItIsRead();

    expect(document.activeElement).toBe(element('anomalie-referentiel-retry'));
  });

  it('should mark the retry as busy while the referential is read again', async () => {
    read.referentielFailure = new Error('Référentiel indisponible');
    await whenRendering();
    await whenClicking('anomalie-choix');

    await whenRetryingTheReferentielWhileItIsRead();

    thenTheRetryIsBusy();
  });

  it('should keep the operator and workstation fields in place while the referential is read again', async () => {
    read.referentielFailure = new Error('Référentiel indisponible');
    await whenRendering();
    await whenClicking('anomalie-choix');

    await whenRetryingTheReferentielWhileItIsRead();

    thenAbsent('anomalie-referentiel-chargement');
    thenPosteChoiceIs('poste-1', 'Poste actuel conservé');
  });

  it.each([
    {
      cas: 'the referential',
      fait: { operateur: 'op-alex', poste: 'poste-2' },
      referentiel: referentielFixture(),
      attendu: 'Opérateur : Alex Durand · Poste : Tour 1',
    },
    {
      cas: 'the journal when the referential does not hold them',
      fait: { operateur: 'op-camille', poste: 'poste-1' },
      referentiel: new ReferentielAnomalies([], []),
      attendu: 'Opérateur : Camille Martin · Poste : DMU 50',
    },
    {
      cas: 'nothing but their unresolved state when neither the referential nor the journal knows them',
      fait: { operateur: 'op-inconnu', poste: 'poste-inconnu' },
      referentiel: referentielFixture(),
      attendu: 'Opérateur : Opérateur non résolu · Poste : Poste non résolu',
    },
  ])('should name the operator and workstation of the previewed act from $cas', async ({ fait, referentiel, attendu }) => {
    read.referentielResult = referentiel;
    givenAGuidedCorrectionOf(fait);
    await whenRendering();

    await whenPreparingTheCorrection();

    thenTextContains('anomalie-apercu-acte', attendu);
    thenTextDoesNotContain('anomalie-apercu-acte', fait.operateur);
    thenTextDoesNotContain('anomalie-apercu-acte', fait.poste);
  });

  it('should name the operator and workstation of the previewed act from the journal after the act when the referential is unavailable', async () => {
    read.referentielFailure = new Error('Référentiel indisponible');
    const fait = { operateur: 'op-nouveau', poste: 'poste-nouveau' };
    const acte = givenAGuidedCorrectionOf(fait);
    const dossier = dossierAnomalieFixture();
    const origine = requiredFixture(dossier.journal[0], 'received fact');
    givenASuccessfulPreview(
      {
        ...dossier,
        journal: [
          origine,
          {
            ...origine,
            id: new PointageAnomalieId('fin-corrigee'),
            fait: { ...origine.fait, ...fait },
            operateurNom: 'Nina Nouveau',
            posteLibelle: 'Four 3',
          },
        ],
      },
      acte,
    );
    await whenRendering();

    await whenPreparingTheCorrection();

    thenTextContains('anomalie-apercu-acte', 'Opérateur : Nina Nouveau · Poste : Four 3');
  });

  it('should keep the operator and workstation of the previewed act without calling them unresolved when the referential is unavailable and the journal does not know them', async () => {
    read.referentielFailure = new Error('Référentiel indisponible');
    givenAGuidedCorrectionOf({ operateur: 'op-inconnu', poste: 'poste-inconnu' });
    await whenRendering();

    await whenPreparingTheCorrection();

    thenTextContains('anomalie-apercu-acte', 'Opérateur : Opérateur actuel conservé · Poste : Poste actuel conservé');
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

    thenTheProblemReads('Autre contradiction.');
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

    thenAbsent('anomalie-probleme');
    thenAbsent('anomalie-acte');
    thenTextContains('anomalie-adresse-invalide', 'L’adresse doit préciser');
  });

  it('should present an automatic end as an anomaly of pointage and never as a conflict', async () => {
    givenAnAutomaticEnd();

    await whenRendering();

    thenHeadingOfThePageIs('Dossier d’anomalie de pointage');
    thenTextContains('anomalie-retour', 'Retour aux anomalies');
    thenTheProblemReads('Le travail démarré à 08:00 n’a jamais été arrêté : fin automatique à 21:00.');
    thenPageDoesNotMention('conflit');
  });

  it('should select the first due activity when an automatic end carries several', async () => {
    givenTwoDueActivities();

    await whenRendering();

    thenTheActivityIsPressed('travail-8');
    thenTheActivityIsNotPressed('nc-9');
  });

  it('should select the pointage at fault rather than the due activity when the perimeter carries both', async () => {
    givenAnAutomaticEndWithAPointageAtFault();

    await whenRendering();

    thenTheSelectionShowsTheGesture('Arrêt');
    thenAbsent('anomalie-selection-activite');
  });

  it('should select nothing when an activity is due but the dossier is no automatic end', async () => {
    givenADueActivityOnADossierThatIsNoAutomaticEnd();

    await whenRendering();

    thenTheSelectionReads('Sélectionnez un pointage ou une activité sur la frise pour voir ses détails.');
  });

  it('should show the facts of the activity the manager selects on the frise instead of the pointage selected', async () => {
    givenTwoDiagnostics();
    await whenRendering();

    await whenSelectingTheActivity('travail-8');

    thenTheSelectedActivityIs('Travail');
    thenAbsent('anomalie-selection-geste');
  });

  it('should press only the bar of the selected activity', async () => {
    givenTwoDiagnostics();
    await whenRendering();

    await whenSelectingTheActivity('travail-8');

    thenTheActivityIsPressed('travail-8');
    thenNoPointageIsPressed(['fin-17', 'debut-8']);
  });

  it('should offer neither correction nor cancellation for a selected activity', async () => {
    givenTwoDiagnostics();
    await whenRendering();

    await whenSelectingTheActivity('travail-8');

    thenTheSelectionOffersNoAction();
  });

  it('should keep the proposition in progress when the manager selects an activity', async () => {
    givenTwoDiagnostics();
    await whenRendering();
    await whenClicking('anomalie-choix');
    await whenEntering('anomalie-motif', 'Cible confirmée');

    await whenSelectingTheActivity('travail-8');

    thenInterpretationIsSelected();
    thenFieldValueIs('anomalie-motif', 'Cible confirmée');
  });

  it('should return to the due activity of the dossier a receipt replaces the displayed one with', async () => {
    givenAnEndRegularisationLeaving({ etat: 'FIN_AUTOMATIQUE', enConflit: false, finAutomatique: true });
    await whenRendering();
    await whenPreviewingTheDatedEnd();
    await whenSelectingTheActivity('travail-8');

    await whenClicking('anomalie-confirmer');

    thenTheActivityIsPressed('travail-8');
  });

  it('should show the frise under the heading and before the selection and the decision', async () => {
    await whenRendering();

    thenTheFriseComesBeforeTheSelectionAndTheDecision();
  });

  it('should show no chronology list nor activities section beside the frise', async () => {
    await whenRendering();

    thenPageDoesNotMention('activités concernées');
    thenPageDoesNotMention('pointages et rattachements');
  });

  it('should not refer to a chronology the page no longer shows', async () => {
    await whenRendering();

    thenPageDoesNotMention('chronologie');
  });

  it('should select the due activity of an automatic end at the opening of the dossier', async () => {
    givenAnAutomaticEnd();

    await whenRendering();

    thenTheSelectedActivityIs('Travail');
    thenAbsent('anomalie-selection-geste');
    thenTheActivityIsPressed('travail-8');
  });

  it('should show the due activity with its start, its automatic end and its received duration in the selection', async () => {
    givenAnAutomaticEnd();

    await whenRendering();

    thenTheSelectionContains('Travail');
    thenTheSelectionContains('Début lundi 14 septembre à 08:00');
    thenTheSelectionContains('Fin lundi 14 septembre à 21:00');
    thenTheSelectionContains('Fin automatique · 13 h');
  });

  it('should keep the facts of the due activity out of the heading of an automatic end', async () => {
    givenAnAutomaticEnd();

    await whenRendering();

    thenHeadingDoesNotContain('Fin lundi 14 septembre à 21:00');
    thenAbsent('anomalie-fin-automatique-activite');
  });

  it.each(CAS_DE_FIN_AUTOMATIQUE)('should say the problem of $cas', async cas => {
    givenAnAutomaticEndDiagnosedAs(cas);

    await whenRendering();

    thenTheProblemsRead([cas.phrase]);
  });

  it('should say one problem per due activity of the dossier', async () => {
    givenTwoDueActivities();

    await whenRendering();

    thenTheProblemsRead([
      'Le travail démarré à 08:00 n’a jamais été arrêté : fin automatique à 18:00.',
      'La non-conformité démarrée à 09:00 n’a jamais été arrêtée : fin automatique à 19:00.',
    ]);
  });

  it.each([
    { cas: 'an activity that is not due', etat: 'TERMINEE' as const, periode: { fin: INSTANT_FIN_DE_TRAVAIL } },
    { cas: 'a due activity without period', etat: 'ECHUE' as const },
    { cas: 'a due activity whose end was not received', etat: 'ECHUE' as const, periode: {} },
  ])('should say nothing of $cas on an automatic end', async ({ etat, periode }) => {
    givenAnAutomaticEndWhoseActivityIs(etat, periode);

    await whenRendering();

    thenAbsent('anomalie-probleme');
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

  it('should not select an activity of a conflict dossier and show no automatic end in its selection', async () => {
    await whenRendering();

    thenAbsent('anomalie-selection-activite');
    thenTheSelectionDoesNotContain('Fin automatique');
  });

  it('should say both the automatic end and the conflict when the perimeter still carries both', async () => {
    const dossier = dossierFinAutomatiqueFixture();
    read.result = {
      kind: 'DOSSIER',
      dossier: { ...dossier, enConflit: true, ligne: { ...dossier.ligne, explication: 'Une fin vise le travail remplacé.' } },
    };

    await whenRendering();

    thenTheProblemsRead([
      'Le travail démarré à 08:00 n’a jamais été arrêté : fin automatique à 21:00.',
      'Une fin vise le travail remplacé.',
    ]);
  });

  it('should offer the guided end regularisation with its fact open and no time proposed', async () => {
    givenAnAutomaticEnd();
    await whenRendering();

    await whenClicking('anomalie-choix');

    thenTextContains('anomalie-choix', 'Régulariser la fin');
    thenTextContains('anomalie-acte', 'Régularisation d’un fait manquant');
    thenTheInstantFieldsShow('', '');
    thenFieldValueIs('anomalie-cible', 'travail-8');
    thenTextContains('anomalie-identite', 'Camille Martin · DMU 50');
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

  it('should refuse a fact in the future and keep the preview unavailable', async () => {
    givenAnAutomaticEnd();
    await whenRendering();
    await whenClicking('anomalie-choix');

    await whenEnteringTheInstant('05/10/2026', '10:01');

    thenTextContains('anomalie-validation', 'La date et l’heure du fait ne peuvent pas être dans le futur.');
    thenDisabled('anomalie-previsualiser');
  });

  it('should refuse a fact that precedes the start of the activity it ends', async () => {
    givenAnAutomaticEnd();
    await whenRendering();
    await whenClicking('anomalie-choix');

    await whenEnteringTheInstant('14/09/2026', '07:59');

    thenTextContains('anomalie-validation', 'Le fait ne peut pas précéder le début de l’activité qu’il termine.');
    thenDisabled('anomalie-previsualiser');
  });

  it('should accept a fact at exactly the start of the activity it ends', async () => {
    givenAnAutomaticEnd();
    await whenRendering();
    await whenClicking('anomalie-choix');

    await whenEnteringTheInstant('14/09/2026', '08:00');

    thenTextDoesNotContain('anomalie-validation', 'précéder');
    thenEnabled('anomalie-previsualiser');
  });

  it('should bound the fact by the activity the manager now aims at', async () => {
    givenAnAutomaticEndBesideAnActivityStartedAtNoon();
    await whenRendering();
    await whenClicking('anomalie-choix');
    await whenEnteringTheInstant('14/09/2026', '10:00');

    await whenEntering('anomalie-cible', 'nc-12');

    thenTextContains('anomalie-validation', 'Le fait ne peut pas précéder le début de l’activité qu’il termine.');
    thenDisabled('anomalie-previsualiser');
  });

  it('should accept an hour that became past while the tab stayed open', async () => {
    givenAnAutomaticEnd();
    await whenRendering();
    whenTheClockIs(new Date(2026, 9, 5, 10, 30));
    await whenClicking('anomalie-choix');

    await whenEnteringTheInstant('05/10/2026', '10:15');

    thenTextDoesNotContain('anomalie-validation', 'futur');
    thenEnabled('anomalie-previsualiser');
  });

  it('should accept at the next gesture an hour that was still in the future at the previous one', async () => {
    givenAnAutomaticEnd();
    await whenRendering();
    await whenClicking('anomalie-choix');
    await whenEnteringTheInstant('05/10/2026', '10:15');
    whenTheClockIs(new Date(2026, 9, 5, 10, 30));

    await whenEntering('anomalie-instant-heure', '10:16');

    thenTextDoesNotContain('anomalie-validation', 'futur');
    thenEnabled('anomalie-previsualiser');
  });

  it('should stop presenting the end regularisation as chosen once the manager changes its target', async () => {
    givenAnAutomaticEnd();
    await whenRendering();
    await whenClicking('anomalie-choix');

    await whenClicking('anomalie-identite-modifier');
    await whenChoosingTheOperator('Alex Durand');

    thenNoInterpretationIsSelected();
  });

  it('should preview the received instant untouched, nanoseconds included, when the manager changes something else', async () => {
    await whenRendering();
    await whenClicking('anomalie-detail');
    await whenCorrecting('fin-17');

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
    await whenCorrecting('fin-17');

    thenTheInstantFieldsShow('14/09/2026', '17:15:30');
  });

  it('should name the buttons that open the calendar and the time list in French', async () => {
    await whenRendering();
    await whenClicking('anomalie-detail');
    await whenCorrecting('fin-17');

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

  it('should lock the choice of what the pointage signals while the outcome of a write is unknown', async () => {
    givenASuccessfulPreview();
    application.result = { kind: 'ISSUE_INCONNUE' };
    await whenRendering();
    await whenPreparingTheCorrection();

    await whenClicking('anomalie-confirmer');

    thenInputIsDisabled('anomalie-signal');
  });

  describe('handle of the proposed instant on the frise', () => {
    it('should draw a handle on the proposed end once the manager chooses the late end correction', async () => {
      givenALateEnd();
      await whenRendering();

      await whenClicking('anomalie-choix');

      thenTheHandleReads('23:00');
    });

    it('should move the proposed end by one minute when the right arrow is pressed on the handle', async () => {
      givenALateEnd();
      await whenRendering();
      await whenClicking('anomalie-choix');

      await whenPressingOnTheHandle('ArrowRight');

      thenTheInstantFieldsShow('14/09/2026', '23:01:00');
    });

    it('should move the handle and strike the received time on its marker when the manager types an hour in the field', async () => {
      givenALateEnd();
      await whenRendering();
      await whenClicking('anomalie-choix');

      await whenEntering('anomalie-instant-heure', '22:30');

      thenTheHandleReads('22:30');
      thenTheMarkerFlagIs('fin-23', 'data-deplace', 'true');
    });

    it('should withdraw the preview when the handle moves', async () => {
      givenALateEnd();
      givenASuccessfulPreview(undefined, acteFinTardiveFixture(INSTANT_FIN_TARDIVE));
      await whenRendering();
      await whenClicking('anomalie-choix');
      await whenEntering('anomalie-motif', 'Fin tardive confirmée');
      await whenClicking('anomalie-previsualiser');

      await whenPressingOnTheHandle('ArrowLeft');

      thenAbsent('anomalie-apercu');
    });

    it('should keep the handle while the state after the act is drawn', async () => {
      await givenAPreviewOfTheLateEndCorrection();

      thenTheHandleReads('23:00');
      thenTextContains('anomalie-frise-apres-titre', 'Après cet acte');
    });

    it('should withdraw the state after the act when the handle moves', async () => {
      await givenAPreviewOfTheLateEndCorrection();

      await whenPressingOnTheHandle('ArrowLeft');

      thenTheHandleReads('22:59');
      thenAbsent('anomalie-frise-apres');
    });

    it('should preview the instant the handle moved to, without the fraction of a second of the received one', async () => {
      givenALateEnd(instantLocalFixture(new Date(2026, 8, 14, 23, 0), '123456789'));
      givenASuccessfulPreview(undefined, acteFinTardiveFixture('2026-09-14T23:01:00-03:00'));
      await whenRendering();
      await whenClicking('anomalie-choix');
      await whenEntering('anomalie-motif', 'Fin tardive confirmée');

      await whenPressingOnTheHandle('ArrowRight');
      await whenClicking('anomalie-previsualiser');

      expect(preview.actes).toEqual([acteFinTardiveFixture('2026-09-14T23:01:00-03:00')]);
    });

    it('should stop the handle at the start of the activity the fact ends', async () => {
      givenALateEnd();
      await whenRendering();
      await whenClicking('anomalie-choix');

      await whenPressingOnTheHandle('Home');

      thenTheInstantFieldsShow('14/09/2026', '08:00:00');
    });

    it('should stop the handle at the clock read when the key is pressed, not at the clock of the previous gesture', async () => {
      givenALateEnd();
      whenTheClockIs(new Date(2026, 8, 14, 23, 20));
      await whenRendering();
      await whenClicking('anomalie-choix');
      whenTheClockIs(new Date(2026, 8, 14, 23, 40, 12));

      await whenPressingOnTheHandle('End');

      thenTheInstantFieldsShow('14/09/2026', '23:40:00');
    });

    it('should stop the handle at the edge of the scale, three hours after the last received instant, long before the clock', async () => {
      givenALateEnd();
      await whenRendering();
      await whenClicking('anomalie-choix');

      await whenPressingOnTheHandle('End');

      thenTheInstantFieldsShow('15/09/2026', '02:00:00');
      thenTheHandleHoldsAt(new Date(2026, 8, 15, 2, 0));
    });

    it('should stop the handle three hours after the last pointage of the anomaly, not after a later pointage of the journal', async () => {
      givenALateEndInAJournalBeyondTheAnomaly();
      await whenRendering();
      await whenClicking('anomalie-choix');

      await whenPressingOnTheHandle('End');

      thenTheHandleHoldsAt(new Date(2026, 8, 15, 2, 0));
    });

    it('should hold the handle at the edge of the scale when the manager types an hour long after the received instants', async () => {
      givenALateEnd();
      await whenRendering();
      await whenClicking('anomalie-choix');

      await whenEnteringTheInstant('04/10/2026', '10:00');

      thenTheHandleHoldsAt(new Date(2026, 8, 15, 2, 0));
      thenTheHandleReads('10:00');
    });

    it.each([
      { bouton: 'anomalie-instant-plus-5', heure: '23:05:00' },
      { bouton: 'anomalie-instant-moins-5', heure: '22:55:00' },
    ])('should move the proposed end five minutes with the button $bouton', async ({ bouton, heure }) => {
      givenALateEnd();
      await whenRendering();
      await whenClicking('anomalie-choix');

      await whenClicking(bouton);

      thenTheInstantFieldsShow('14/09/2026', heure);
    });

    it.each([
      { borne: 'Home', desactive: 'anomalie-instant-moins-5', actif: 'anomalie-instant-plus-5' },
      { borne: 'End', desactive: 'anomalie-instant-plus-5', actif: 'anomalie-instant-moins-5' },
    ])('should disable the button that goes past the bound the handle reached with $borne', async ({ borne, desactive, actif }) => {
      givenALateEnd();
      await whenRendering();
      await whenClicking('anomalie-choix');

      await whenPressingOnTheHandle(borne);

      thenDisabled(desactive);
      thenEnabled(actif);
    });

    it('should lock the handle and its buttons while the outcome of a write is unknown', async () => {
      givenALateEnd();
      givenASuccessfulPreview(undefined, acteFinTardiveFixture(INSTANT_FIN_TARDIVE));
      application.result = { kind: 'ISSUE_INCONNUE' };
      await whenRendering();
      await whenClicking('anomalie-choix');
      await whenEntering('anomalie-motif', 'Fin tardive confirmée');
      await whenClicking('anomalie-previsualiser');

      await whenClicking('anomalie-confirmer');

      thenTheHandleIsLocked();
      thenDisabled('anomalie-instant-moins-5');
      thenDisabled('anomalie-instant-plus-5');
    });

    it('should strike the received time on the marker of the pointage the handle corrects once it moved away', async () => {
      givenALateEnd();
      await whenRendering();
      await whenClicking('anomalie-choix');

      await whenPressingOnTheHandle('ArrowLeft');

      thenTheMarkerFlagIs('fin-23', 'data-deplace', 'true');
    });

    it('should strike no marker while the handle places an end that corrects no pointage', async () => {
      givenAnAutomaticEnd();
      await whenRendering();
      await whenClicking('anomalie-choix');

      await whenEnteringTheInstant('14/09/2026', '17:00');

      thenTheMarkerFlagIs('debut-8', 'data-deplace', 'false');
    });

    it('should draw no handle before any proposal is chosen', async () => {
      givenALateEnd();

      await whenRendering();

      thenAbsent('anomalie-poignee');
    });

    it('should draw no handle for the end regularisation, which comes without an hour', async () => {
      givenAnAutomaticEnd();
      await whenRendering();

      await whenClicking('anomalie-choix');

      thenAbsent('anomalie-poignee');
    });

    it('should draw no handle for the cancellation of a pointage', async () => {
      givenALateEnd();
      await whenRendering();

      await whenCancelling('fin-23');

      thenAbsent('anomalie-poignee');
    });

    it('should draw no handle once the manager turns the fact into a start, which ends no activity', async () => {
      givenALateEnd();
      await whenRendering();
      await whenClicking('anomalie-choix');

      await whenChoosingTheGesture('Démarrage');

      thenAbsent('anomalie-poignee');
    });

    it('should draw no handle while the fact aims at no activity, which gives it no lower bound', async () => {
      givenALateEnd();
      await whenRendering();
      await whenClicking('anomalie-choix');

      await whenEntering('anomalie-cible', '');

      thenAbsent('anomalie-poignee');
    });

    it.each([
      {
        cas: 'before the start of the activity it ends',
        jour: '14/09/2026',
        heure: '07:00',
        borne: new Date(2026, 8, 14, 8, 0),
        erreur: 'Le fait ne peut pas précéder le début de l’activité qu’il termine.',
      },
      {
        cas: 'far in the future',
        jour: '14/09/2062',
        heure: '10:00',
        borne: new Date(2026, 8, 15, 2, 0),
        erreur: 'La date et l’heure du fait ne peuvent pas être dans le futur.',
      },
    ])(
      'should hold the handle at its nearest bound for an hour typed $cas and say why in the field',
      async ({ jour, heure, borne, erreur }) => {
        givenALateEnd();
        await whenRendering();
        await whenClicking('anomalie-choix');

        await whenEnteringTheInstant(jour, heure);

        thenTheHandleHoldsAt(borne);
        thenTextContains('anomalie-validation', erreur);
      },
    );

    it('should bring the proposed end back within its bounds with the first move of the handle', async () => {
      givenALateEnd();
      await whenRendering();
      await whenClicking('anomalie-choix');
      await whenEnteringTheInstant('14/09/2026', '07:00');

      await whenPressingOnTheHandle('ArrowRight');

      thenTheInstantFieldsShow('14/09/2026', '08:00:00');
    });
  });

  describe('placement of the real end on the frise', () => {
    it('should place the end at the hour clicked on the pointages row, rounded to five minutes', async () => {
      givenAnAutomaticEnd();
      await whenRendering();
      await whenClicking('anomalie-choix');

      await whenClickingThePointagesRowAt(504);

      thenTheInstantFieldsShow('14/09/2026', '15:35:00');
    });

    it.each([
      { cas: 'before the start of the activity the end closes', clientX: 0, heure: '08:00:00' },
      { cas: 'after the clock', clientX: 1000, heure: '12:30:00' },
    ])('should bring a click $cas back to the nearest bound', async ({ clientX, heure }) => {
      givenAnAutomaticEnd();
      whenTheClockIs(new Date(2026, 8, 14, 12, 30, 40));
      await whenRendering();
      await whenClicking('anomalie-choix');

      await whenClickingThePointagesRowAt(clientX);

      thenTheInstantFieldsShow('14/09/2026', heure);
    });

    it('should tell the manager how to place the hour of the fact while it has none', async () => {
      givenAnAutomaticEnd();
      await whenRendering();

      await whenClicking('anomalie-choix');

      thenTextContains('anomalie-frise-aide', 'Cliquez sur la frise pour placer l’heure du fait, ou saisissez-la.');
    });

    it('should not call the fact an end in the help once the manager turns it into a passage', async () => {
      givenAnAutomaticEnd();
      await whenRendering();
      await whenClicking('anomalie-choix');

      await whenChoosingTheGesture('Passage en NC');

      thenTextContains('anomalie-frise-aide', 'Cliquez sur la frise pour placer l’heure du fait, ou saisissez-la.');
    });

    it('should give no help to place the end before any proposal is chosen', async () => {
      givenAnAutomaticEnd();

      await whenRendering();

      thenAbsent('anomalie-frise-aide');
    });

    it('should give no help to place the end once it is placed', async () => {
      givenAnAutomaticEnd();
      await whenRendering();
      await whenClicking('anomalie-choix');

      await whenClickingThePointagesRowAt(504);

      thenAbsent('anomalie-frise-aide');
    });

    it('should invent no hour and keep the preview unavailable until the end is placed', async () => {
      givenAnAutomaticEnd();
      await whenRendering();

      await whenClicking('anomalie-choix');

      thenTheInstantFieldsShow('', '');
      thenAbsent('anomalie-poignee');
      thenDisabled('anomalie-previsualiser');
    });

    it('should make the preview available once the end is placed', async () => {
      givenAnAutomaticEnd();
      await whenRendering();
      await whenClicking('anomalie-choix');

      await whenClickingThePointagesRowAt(504);

      thenEnabled('anomalie-previsualiser');
    });

    it('should draw the handle at the hour placed so that the manager goes on dragging it', async () => {
      givenAnAutomaticEnd();
      await whenRendering();
      await whenClicking('anomalie-choix');

      await whenClickingThePointagesRowAt(504);

      thenTheHandleReads('15:35');
    });

    it('should offer no placement row for a late end that comes with its hour', async () => {
      givenALateEnd();
      await whenRendering();

      await whenClicking('anomalie-choix');

      thenAbsent('anomalie-frise-placement');
    });

    it('should offer no placement row once the manager turns the fact into a start, which ends no activity', async () => {
      givenAnAutomaticEnd();
      await whenRendering();
      await whenClicking('anomalie-choix');

      await whenChoosingTheGesture('Démarrage');

      thenAbsent('anomalie-frise-placement');
    });

    it('should offer no placement row while the fact aims at no activity, which gives it no lower bound', async () => {
      givenAnAutomaticEnd();
      await whenRendering();
      await whenClicking('anomalie-choix');

      await whenEntering('anomalie-cible', '');

      thenAbsent('anomalie-frise-placement');
    });

    it('should offer no placement row for the cancellation of a pointage', async () => {
      givenAnAutomaticEnd();
      await whenRendering();

      await whenCancelling('debut-8');

      thenAbsent('anomalie-frise-placement');
    });

    it('should offer no placement row to a consultant, who cannot choose the regularisation', async () => {
      givenAnAutomaticEnd();
      givenAConsultantWhoCannotApplyDecisions();
      await whenRendering();

      await whenClicking('anomalie-choix');

      thenAbsent('anomalie-frise-placement');
    });

    it('should offer no placement row before any proposal is chosen', async () => {
      givenAnAutomaticEnd();

      await whenRendering();

      thenAbsent('anomalie-frise-placement');
    });

    it('should offer no placement row once the end is placed, the handle taking over', async () => {
      givenAnAutomaticEnd();
      await whenRendering();
      await whenClicking('anomalie-choix');

      await whenClickingThePointagesRowAt(504);

      thenAbsent('anomalie-frise-placement');
    });
  });

  describe('pointage pointed after the deadline', () => {
    it.each(['CORRIGER_FIN_TARDIVE', 'CORRIGER_TRANSITION_TARDIVE'] as const)(
      'should mark on the frise the pointage the %s choice corrects',
      async code => {
        givenALateGestureCorrectedBy(code);

        await whenRendering();

        thenTheMarkerFlagIs('fin-23', 'data-tardif', 'true');
        thenTheMarkerFlagIs('debut-8', 'data-tardif', 'false');
      },
    );

    it.each(['CORRIGER_FIN_TARDIVE', 'CORRIGER_TRANSITION_TARDIVE'] as const)(
      'should say in the selection that the pointage the %s choice corrects was pointed after the deadline',
      async code => {
        givenALateGestureCorrectedBy(code);
        await whenRendering();

        await whenSelecting('fin-23');

        thenTheSelectionContains('Pointé après l’échéance');
      },
    );

    it('should not say it of a pointage the late choice does not correct', async () => {
      givenALateGestureCorrectedBy('CORRIGER_FIN_TARDIVE');
      await whenRendering();

      await whenSelecting('debut-8');

      thenTheSelectionDoesNotContain('Pointé après l’échéance');
    });

    it('should not say it when the dossier holds no late choice', async () => {
      givenAnAutomaticEnd();
      await whenRendering();

      await whenSelecting('debut-8');

      thenTheSelectionDoesNotContain('Pointé après l’échéance');
    });
  });

  describe('summary of what the operator pointed on the element beyond the anomaly', () => {
    const MATIN = new Date(2026, 8, 14, 8, 0);
    const SOIR = new Date(2026, 8, 14, 17, 0);

    it.each([
      ['earlier on the day of the anomaly, from when', [new Date(2026, 8, 14, 6, 0)], '1 pointage plus tôt ce jour-là (dès 06:00)'],
      ['during the period of the anomaly', [new Date(2026, 8, 14, 10, 0)], '1 pointage pendant cette période'],
      ['later on the day of the anomaly, until when', [new Date(2026, 8, 14, 20, 0)], '1 pointage plus tard ce jour-là (jusqu’à 20:00)'],
      [
        'on the previous days, since which day',
        [new Date(2026, 8, 11, 11, 0), new Date(2026, 8, 10, 9, 0), new Date(2026, 8, 10, 15, 0)],
        '3 pointages les jours précédents, depuis le jeudi 10 septembre',
      ],
      [
        'on the following days, until which day',
        [new Date(2026, 8, 15, 9, 0), new Date(2026, 8, 16, 18, 0)],
        '2 pointages les jours suivants, jusqu’au mercredi 16 septembre',
      ],
      [
        'on other days when they are both before and after, without a day',
        [new Date(2026, 8, 10, 9, 0), new Date(2026, 8, 15, 9, 0)],
        '2 pointages les autres jours',
      ],
    ])('should say how many pointages the operator made %s', async (_groupe, instants, expected) => {
      givenAnAnomalyOnADayWith(
        MATIN,
        SOIR,
        instants.map(instant => ({ instant })),
      );

      await whenRendering();

      thenTheContextReads(`Hors de cette anomalie, Camille Martin compte sur cet élément ${expected}.`);
    });

    it('should join the groups, name the pointages in the first one and tell the earliest and the latest hours', async () => {
      givenAnAnomalyOnADayWith(MATIN, SOIR, [
        { instant: new Date(2026, 8, 14, 7, 0) },
        { instant: new Date(2026, 8, 14, 6, 0) },
        { instant: new Date(2026, 8, 14, 10, 0) },
        { instant: new Date(2026, 8, 14, 20, 0) },
        { instant: new Date(2026, 8, 14, 21, 30) },
        { instant: new Date(2026, 8, 10, 9, 0) },
      ]);

      await whenRendering();

      thenTheContextReads(
        'Hors de cette anomalie, Camille Martin compte sur cet élément 2 pointages plus tôt ce jour-là (dès 06:00), 1 pendant cette période, 2 plus tard ce jour-là (jusqu’à 21:30) et 1 les jours précédents, depuis le jeudi 10 septembre.',
      );
    });

    it('should join two groups with and', async () => {
      givenAnAnomalyOnADayWith(MATIN, SOIR, [{ instant: new Date(2026, 8, 14, 10, 0) }, { instant: new Date(2026, 8, 15, 9, 0) }]);

      await whenRendering();

      thenTheContextReads(
        'Hors de cette anomalie, Camille Martin compte sur cet élément 1 pointage pendant cette période et 1 les jours suivants, jusqu’au mardi 15 septembre.',
      );
    });

    it('should not count the cancelled pointages', async () => {
      givenAnAnomalyOnADayWith(MATIN, SOIR, [
        { instant: new Date(2026, 8, 14, 9, 30), annule: true },
        { instant: new Date(2026, 8, 14, 10, 0) },
      ]);

      await whenRendering();

      thenTheContextReads('Hors de cette anomalie, Camille Martin compte sur cet élément 1 pointage pendant cette période.');
    });

    it('should not count the pointages of another operator', async () => {
      givenAnAnomalyOnADayWith(MATIN, SOIR, [
        { instant: new Date(2026, 8, 14, 9, 0), operateur: 'op-alex' },
        { instant: new Date(2026, 8, 14, 10, 0) },
      ]);

      await whenRendering();

      thenTheContextReads('Hors de cette anomalie, Camille Martin compte sur cet élément 1 pointage pendant cette période.');
    });

    it.each([
      ['holds no pointage beyond the anomaly', []],
      ['holds only cancelled pointages beyond the anomaly', [{ instant: new Date(2026, 8, 14, 10, 0), annule: true as const }]],
      ['holds only pointages of another operator beyond the anomaly', [{ instant: new Date(2026, 8, 14, 10, 0), operateur: 'op-alex' }]],
    ])('should say nothing when the journal %s', async (_cas, horsDeLAnomalie) => {
      givenAnAnomalyOnADayWith(MATIN, SOIR, horsDeLAnomalie);

      await whenRendering();

      thenAbsent('anomalie-frise-contexte');
    });

    it('should say nothing when the anomaly itself shows no pointage and no activity to measure the period from', async () => {
      givenAnAnomalyThatShowsNothing();

      await whenRendering();

      thenAbsent('anomalie-frise-contexte');
    });

    it('should keep the same sentence when the handle widens the scale of the frise', async () => {
      givenALateEndInAJournalBeyondTheAnomaly();
      await whenRendering();
      const avant = theContext();
      await whenClicking('anomalie-choix');

      await whenEnteringTheInstant('15/09/2026', '01:30');

      thenTheHandleReads('01:30');
      thenTheContextIs(avant);
    });

    it('should keep the same sentence when a preview moves a pointage of the anomaly past a later pointage of the operator', async () => {
      const dossier = lateEndInAJournalBeyondTheAnomaly();
      const instantApres = instantLocalWithOffsetFixture(new Date(2026, 8, 15, 1, 30));
      read.result = { kind: 'DOSSIER', dossier };
      givenASuccessfulPreview(
        {
          ...dossier,
          journal: dossier.journal.map(pointage =>
            pointage.id.pointage === 'fin-23' ? { ...pointage, fait: { ...pointage.fait, instant: instantApres } } : pointage,
          ),
        },
        acteFinTardiveFixture(instantApres),
        dossier,
      );
      await whenRendering();
      const avant = theContext();
      await whenClicking('anomalie-choix');
      await whenEnteringTheInstant('15/09/2026', '01:30');
      await whenEntering('anomalie-motif', 'Fin tardive confirmée');

      await whenClicking('anomalie-previsualiser');

      thenTextContains('anomalie-frise-apres-titre', 'Après cet acte');
      thenTheContextIs(avant);
    });

    it('should say the operator when no name is resolved', async () => {
      read.referentielResult = new ReferentielAnomalies([], []);
      givenAnAnomalyOnADayWith(MATIN, SOIR, [{ instant: new Date(2026, 8, 14, 10, 0) }], { ligne: '', journal: '' });

      await whenRendering();

      thenTheContextReads('Hors de cette anomalie, l’opérateur compte sur cet élément 1 pointage pendant cette période.');
    });

    it('should name the operator after the pointages of the journal when the sequence carries no name', async () => {
      read.referentielResult = new ReferentielAnomalies([], []);
      givenAnAnomalyOnADayWith(MATIN, SOIR, [{ instant: new Date(2026, 8, 14, 10, 0) }], { ligne: '', journal: 'Camille Martin' });

      await whenRendering();

      thenTheContextReads('Hors de cette anomalie, Camille Martin compte sur cet élément 1 pointage pendant cette période.');
    });

    it('should name the operator after the referential when neither the sequence nor the journal carries a name', async () => {
      givenAnAnomalyOnADayWith(MATIN, SOIR, [{ instant: new Date(2026, 8, 14, 10, 0) }], { ligne: '', journal: '' });

      await whenRendering();

      thenTheContextReads('Hors de cette anomalie, Camille Martin compte sur cet élément 1 pointage pendant cette période.');
    });

    it('should name the operator after the referential rather than after the journal when the sequence carries no name', async () => {
      givenAnAnomalyOnADayWith(MATIN, SOIR, [{ instant: new Date(2026, 8, 14, 10, 0) }], { ligne: '', journal: 'Camille Journal' });

      await whenRendering();

      thenTheContextReads('Hors de cette anomalie, Camille Martin compte sur cet élément 1 pointage pendant cette période.');
      thenTextContains('anomalie-frise-journee', 'Voir la journée de Camille Martin');
    });

    it('should name the operator after the sequence rather than after the referential or the journal', async () => {
      givenAnAnomalyOnADayWith(MATIN, SOIR, [{ instant: new Date(2026, 8, 14, 10, 0) }], {
        ligne: 'Camille Durand',
        journal: 'Camille Journal',
      });

      await whenRendering();

      thenTheContextReads('Hors de cette anomalie, Camille Durand compte sur cet élément 1 pointage pendant cette période.');
      thenTextContains('anomalie-frise-journee', 'Voir la journée de Camille Durand');
    });

    it('should name the days when the period of the anomaly spans two days', async () => {
      givenAnAnomalyOnADayWith(new Date(2026, 8, 14, 22, 0), new Date(2026, 8, 15, 2, 0), [
        { instant: new Date(2026, 8, 14, 20, 0) },
        { instant: new Date(2026, 8, 15, 4, 0) },
      ]);

      await whenRendering();

      thenTheContextReads(
        'Hors de cette anomalie, Camille Martin compte sur cet élément 1 pointage plus tôt le lundi 14 septembre (dès 20:00) et 1 plus tard le mardi 15 septembre (jusqu’à 04:00).',
      );
    });

    it('should tell apart the days by the local clock near midnight', async () => {
      givenAnAnomalyOnADayWith(new Date(2026, 8, 14, 0, 30), new Date(2026, 8, 14, 23, 30), [
        { instant: new Date(2026, 8, 13, 23, 59) },
        { instant: new Date(2026, 8, 14, 0, 10) },
        { instant: new Date(2026, 8, 14, 23, 50) },
        { instant: new Date(2026, 8, 15, 0, 1) },
      ]);

      await whenRendering();

      thenTheContextReads(
        'Hors de cette anomalie, Camille Martin compte sur cet élément 1 pointage plus tôt ce jour-là (dès 00:10), 1 plus tard ce jour-là (jusqu’à 23:50) et 2 les autres jours.',
      );
    });

    it('should spell the year of a day that is not in the current year', async () => {
      givenAnAnomalyOnADayWith(MATIN, SOIR, [{ instant: new Date(2025, 11, 30, 9, 0) }]);

      await whenRendering();

      thenTheContextReads(
        'Hors de cette anomalie, Camille Martin compte sur cet élément 1 pointage les jours précédents, depuis le mardi 30 décembre 2025.',
      );
    });
  });

  describe('link to the day of the operator', () => {
    it('should name the operator in the link to the day', async () => {
      await whenRendering();

      thenTextContains('anomalie-frise-journee', 'Voir la journée de Camille Martin');
    });

    it('should say the operator in the link to the day when no name is resolved', async () => {
      read.referentielResult = new ReferentielAnomalies([], []);
      givenAnAnomalyOnADayWith(new Date(2026, 8, 14, 8, 0), new Date(2026, 8, 14, 17, 0), [], { ligne: '', journal: '' });

      await whenRendering();

      thenTextContains('anomalie-frise-journee', 'Voir la journée de l’opérateur');
    });

    it('should lead to the day of the operator on the hours of the operator', async () => {
      await whenRendering();

      thenTheLinkTargets('anomalie-frise-journee', '/operateurs/op-camille/heures', { jour: '2026-09-14' });
    });

    it('should lead to the day of the pointage pointed after the deadline when it falls on the following day', async () => {
      givenALateEnd(instantLocalFixture(new Date(2026, 8, 15, 10, 0)));

      await whenRendering();

      thenTheLinkTargets('anomalie-frise-journee', '/operateurs/op-camille/heures', { jour: '2026-09-15' });
    });

    it('should lead to the day of the oldest pointage pointed after the deadline', async () => {
      givenTwoPointagesPointedAfterTheDeadline();

      await whenRendering();

      thenTheLinkTargets('anomalie-frise-journee', '/operateurs/op-camille/heures', { jour: '2026-09-15' });
    });

    it('should lead to the day of the oldest pointage at fault of a conflict', async () => {
      givenAConflictWhoseFaultIsPointedAt(new Date(2026, 8, 16, 9, 0), new Date(2026, 8, 15, 9, 0));

      await whenRendering();

      thenTheLinkTargets('anomalie-frise-journee', '/operateurs/op-camille/heures', { jour: '2026-09-15' });
    });

    it('should tell the day of a pointage at fault by the local clock near midnight', async () => {
      givenAConflictWhoseFaultIsPointedAt(new Date(2026, 8, 15, 0, 10), new Date(2026, 8, 14, 23, 50));

      await whenRendering();

      thenTheLinkTargets('anomalie-frise-journee', '/operateurs/op-camille/heures', { jour: '2026-09-14' });
    });

    it('should tell the day of a pointage pointed after the deadline by the local clock near midnight', async () => {
      givenALateEnd(instantLocalFixture(new Date(2026, 8, 14, 23, 50)));

      await whenRendering();

      thenTheLinkTargets('anomalie-frise-journee', '/operateurs/op-camille/heures', { jour: '2026-09-14' });
    });

    it('should tell the day the period starts by the local clock near midnight', async () => {
      givenAnAnomalyOnADayWith(new Date(2026, 8, 14, 23, 50), new Date(2026, 8, 15, 8, 0), []);

      await whenRendering();

      thenTheLinkTargets('anomalie-frise-journee', '/operateurs/op-camille/heures', { jour: '2026-09-14' });
    });

    it('should offer no link to the day when the anomaly shows no pointage and no activity to tell the day from', async () => {
      givenAnAnomalyThatShowsNothing();

      await whenRendering();

      thenAbsent('anomalie-frise-journee');
    });

    it('should lead to the day of the readable pointage pointed after the deadline when another one has no readable instant', async () => {
      givenTwoPointagesPointedAfterTheDeadline(UN_INSTANT_ILLISIBLE);

      await whenRendering();

      thenTheLinkTargets('anomalie-frise-journee', '/operateurs/op-camille/heures', { jour: '2026-09-15' });
    });

    it('should lead to the day the period starts when the only pointage pointed after the deadline has no readable instant', async () => {
      givenALateEnd(UN_INSTANT_ILLISIBLE);

      await whenRendering();

      thenTheLinkTargets('anomalie-frise-journee', '/operateurs/op-camille/heures', { jour: '2026-09-14' });
    });

    it('should lead to the day the period starts when the pointage at fault of a conflict has no readable instant', async () => {
      givenAConflictWhoseFaultIsPointedAt(UN_INSTANT_ILLISIBLE);

      await whenRendering();

      thenTheLinkTargets('anomalie-frise-journee', '/operateurs/op-camille/heures', { jour: '2026-09-13' });
    });

    it('should lead to the day the period starts when the pointage pointed after the deadline is not in the journal', async () => {
      givenAnAutomaticEndDiagnosedAs({
        cas: 'late pointage missing',
        categorie: 'TRAVAIL',
        regularisation: 'AUCUNE',
        tardif: { code: 'CORRIGER_FIN_TARDIVE', pointage: { geste: 'ARRET', heure: '23:00', absentDuJournal: true } },
        phrase: '',
      });

      await whenRendering();

      thenTheLinkTargets('anomalie-frise-journee', '/operateurs/op-camille/heures', { jour: '2026-09-14' });
    });

    it('should lead to the day the period of an automatic end starts when no pointage was pointed after the deadline', async () => {
      givenAnAutomaticEnd();

      await whenRendering();

      thenTheLinkTargets('anomalie-frise-journee', '/operateurs/op-camille/heures', { jour: '2026-09-14' });
    });
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
      await whenCorrecting('fin-17');

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

    it('should read the handle on the first occurrence of an hour the clock repeats with its summer offset', async () => {
      givenALateEnd('2026-10-25T00:30:00.000Z');
      whenTheClockIs(new Date(2026, 9, 25, 12, 0));
      await whenRendering();

      await whenClicking('anomalie-choix');

      thenTheHandleReads('02:30 UTC+02:00');
    });

    it('should tell the second occurrence of the repeated hour from the first once the handle crosses an hour of the clock', async () => {
      givenALateEnd('2026-10-25T00:30:00.000Z');
      whenTheClockIs(new Date(2026, 9, 25, 12, 0));
      await whenRendering();
      await whenClicking('anomalie-choix');

      await whenPressingOnTheHandleFourTimes('ArrowRight', true);

      thenTheHandleReads('02:30 UTC+01:00');
    });

    it('should take the first occurrence of an hour the clock repeats', async () => {
      givenAnAutomaticEndOverTheAutumnChangeOfHour(acteFinRegulariseeFixture('poste-1', '2025-10-26T02:30:00+02:00'));
      await whenRendering();
      await whenClicking('anomalie-choix');
      await whenEnteringTheInstant('26/10/2025', '02:30');

      await whenClicking('anomalie-previsualiser');

      expect(preview.actes).toEqual([acteFinRegulariseeFixture('poste-1', '2025-10-26T02:30:00+02:00')]);
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

      thenTextContains('anomalie-apercu', 'Après cet acte : anomalie traitée');
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

      thenAbsent('anomalie-probleme');
    },
  );

  it('should not explain a conflict on a dossier read with no conflict nor automatic end left', async () => {
    const dossier = dossierAnomalieFixture();
    read.result = { kind: 'DOSSIER', dossier: { ...dossier, etat: 'SANS_ANOMALIE', enConflit: false } };

    await whenRendering();

    thenAbsent('anomalie-probleme');
  });

  it('should not explain a conflict in the receipt of a conflict that the act resolved', async () => {
    application.result = { kind: 'APPLIQUE', dossier: { ...dossierAnomalieFixture(), version: 2, enConflit: false } };
    givenASuccessfulPreview();
    await whenRendering();
    await whenPreparingTheCorrection();

    await whenClicking('anomalie-confirmer');

    thenTextContains('anomalie-resultat', 'Anomalie traitée');
    thenAbsent('anomalie-probleme');
  });

  const anomalieRestanteFixture = [
    { etat: 'ANCRE_ANNULEE' as const, enConflit: false, finAutomatique: true },
    { etat: 'FIN_AUTOMATIQUE' as const, enConflit: false, finAutomatique: true },
    { etat: 'ANCRE_ANNULEE' as const, enConflit: true, finAutomatique: false },
    { etat: 'EN_CONFLIT' as const, enConflit: true, finAutomatique: true },
  ];

  it.each([
    { enConflit: false, finAutomatique: true, attendu: 'Après cet acte : conflit levé · fin automatique restante' },
    { enConflit: true, finAutomatique: false, attendu: 'Après cet acte : conflit restant' },
    { enConflit: true, finAutomatique: true, attendu: 'Après cet acte : conflit restant' },
  ])(
    'should announce in the preview of a conflict act "$attendu" when the conflict is $enConflit and the automatic end $finAutomatique',
    async ({ enConflit, finAutomatique, attendu }) => {
      givenASuccessfulPreview({ ...dossierAnomalieFixture(), enConflit, finAutomatique });
      await whenRendering();

      await whenPreparingTheCorrection();

      thenTextContains('anomalie-apercu', attendu);
    },
  );

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
    { etat: 'ECHUE' as const, attendu: 'Fin automatique · 13 h' },
    { etat: 'TERMINEE' as const, attendu: 'Terminée · 13 h' },
  ])('should show the selected $etat activity of an automatic end with its received duration', async ({ etat, attendu }) => {
    const dossier = dossierFinAutomatiqueFixture();
    read.result = { kind: 'DOSSIER', dossier: { ...dossier, activites: dossier.activites.map(activite => ({ ...activite, etat })) } };

    await whenRendering();
    await whenSelectingTheActivity('travail-8');

    thenTheSelectionContains(attendu);
  });

  it('should explain the loading of a dossier without calling it a conflict', () => {
    givenTheDossierIsStillLoading();

    whenRenderingWithoutWaiting();

    thenTextContains('anomalie-chargement', 'Chargement du dossier…');
  });

  const givenTheDossierIsStillLoading = (): void => {
    read.pending = new PendingResponseFixture<LectureDossier>();
  };

  const givenALiftedConflictLeavingAnExpiredActivity = (): void => {
    givenALiftedConflictLeavingExpiredActivities(['debut-8']);
  };

  const givenALiftedConflictLeavingExpiredActivities = (ouvrants: readonly string[]): DossierAnomalie => {
    const dossier = dossierAnomalieFixture();
    const modele = requiredFixture(dossier.activites[0], 'conflict fixture activity');
    const echues = ouvrants.map(ouvrant => ({
      ...modele,
      id: new ActiviteAnomalieId(`travail-${ouvrant}`),
      etat: 'ECHUE' as const,
      ouvrant: new PointageAnomalieId(ouvrant),
    }));
    const apres = { ...dossier, version: 2, enConflit: false, finAutomatique: true, activites: echues };
    givenASuccessfulPreview(apres);
    application.result = { kind: 'APPLIQUE', dossier: apres };
    return apres;
  };

  const givenAConflictActLeaving = (resultat: Pick<DossierAnomalie, 'enConflit' | 'finAutomatique'>): void => {
    const apres = { ...dossierAnomalieFixture(), version: 2, ...resultat };
    givenASuccessfulPreview(apres);
    application.result = { kind: 'APPLIQUE', dossier: apres };
  };

  const givenAnEndRegularisationLeaving = (resultat: Pick<DossierAnomalie, 'etat' | 'enConflit' | 'finAutomatique'>): void => {
    givenAnAutomaticEnd();
    const apres = { ...dossierFinAutomatiqueFixture(), ...resultat };
    givenASuccessfulPreview(apres, acteFinRegulariseeFixture('poste-1', '2026-09-14T17:00:00-03:00'), dossierFinAutomatiqueFixture());
    application.result = { kind: 'APPLIQUE', dossier: apres };
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

  const whenAskingTwiceToVerifyTheReceipt = async (): Promise<
    [PendingResponseFixture<ResultatVerification>, PendingResponseFixture<ResultatVerification>]
  > => {
    const premiere = new PendingResponseFixture<ResultatVerification>();
    application.receiptReplies.pending = premiere;
    whenStartingClick('anomalie-verifier');
    await premiere.arrival;
    const seconde = new PendingResponseFixture<ResultatVerification>();
    application.receiptReplies.pending = seconde;
    whenStartingClick('anomalie-verifier');
    await seconde.arrival;
    return [premiere, seconde];
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

  const pointageAilleursFixture = (id: string, instant: string): PointageAnomalie => ({
    ...pointageDeLaFinFixture(),
    id: new PointageAnomalieId(id),
    fait: { ...faitConflitFixture(), activiteVisee: 'travail-ailleurs', instant },
    enregistre: instant,
  });

  const journalBeyondTheAnomaly = (): DossierAnomalie => {
    const dossier = dossierAnomalieFixture();
    return {
      ...dossier,
      journal: [...dossier.journal, pointageAilleursFixture('autre-30', instantLocalFixture(new Date(2026, 8, 16, 9, 0)))],
      perimetre: new PerimetreDuDossier([new PointageAnomalieId('fin-17')]),
      diagnostics: [
        {
          pointage: new PointageAnomalieId('fin-17'),
          raison: 'CIBLE_REMPLACEE',
          cible: { activite: new ActiviteAnomalieId('travail-8') },
        },
      ],
    };
  };

  const givenAJournalBeyondTheAnomaly = (): void => {
    read.result = { kind: 'DOSSIER', dossier: journalBeyondTheAnomaly() };
  };

  const lateEndInAJournalBeyondTheAnomaly = (): DossierAnomalie => {
    const dossier = dossierFinTardiveFixture();
    return {
      ...dossier,
      perimetre: new PerimetreDuDossier(dossier.journal.map(pointage => pointage.id)),
      journal: [...dossier.journal, pointageAilleursFixture('autre-40', instantLocalFixture(new Date(2026, 8, 15, 10, 0)))],
    };
  };

  const givenALateEndInAJournalBeyondTheAnomaly = (): void => {
    read.result = { kind: 'DOSSIER', dossier: lateEndInAJournalBeyondTheAnomaly() };
  };

  const givenTwoPointagesPointedAfterTheDeadline = (instantDuPlusTardif = instantLocalFixture(new Date(2026, 8, 16, 10, 0))): void => {
    const dossier = dossierFinTardiveFixture(instantDuPlusTardif);
    const tardifLe15 = pointageAilleursFixture('fin-15', instantLocalFixture(new Date(2026, 8, 15, 10, 0)));
    const [choixLe16] = dossier.choix;
    read.result = {
      kind: 'DOSSIER',
      dossier: {
        ...dossier,
        journal: [...dossier.journal, tardifLe15],
        choix: [
          ...dossier.choix,
          {
            ...requiredFixture(choixLe16, 'late choice'),
            id: 'CORRIGER_FIN_TARDIVE:fin-15',
            saisie: SaisieActe.correct('fin-15', tardifLe15.fait),
          },
        ],
      },
    };
  };

  const givenAConflictWhoseFaultIsPointedAt = (...instants: readonly (Date | string)[]): void => {
    const dossier = dossierAnomalieFixture();
    const enCause = instants.map((instant, rang) =>
      pointageAilleursFixture(`fin-${rang}`, typeof instant === 'string' ? instant : instantLocalFixture(instant)),
    );
    const journal = [pointageAilleursFixture('ouvrant-13', instantLocalFixture(new Date(2026, 8, 13, 22, 0))), ...enCause];
    read.result = {
      kind: 'DOSSIER',
      dossier: {
        ...dossier,
        journal,
        perimetre: new PerimetreDuDossier(journal.map(pointage => pointage.id)),
        diagnostics: enCause.map(pointage => ({
          pointage: pointage.id,
          raison: 'CIBLE_REMPLACEE',
          cible: { activite: new ActiviteAnomalieId('travail-8') },
        })),
      },
    };
  };

  const givenALateEnd = (instant = INSTANT_FIN_TARDIVE): void => {
    read.result = { kind: 'DOSSIER', dossier: dossierFinTardiveFixture(instant) };
  };

  const givenAPreviewOfTheLateEndCorrection = async (): Promise<void> => {
    givenALateEnd();
    givenASuccessfulPreview(undefined, acteFinTardiveFixture(INSTANT_FIN_TARDIVE));
    await whenRendering();
    await whenClicking('anomalie-choix');
    await whenEntering('anomalie-motif', 'Fin tardive confirmée');
    await whenClicking('anomalie-previsualiser');
  };

  const givenALateGestureCorrectedBy = (code: 'CORRIGER_FIN_TARDIVE' | 'CORRIGER_TRANSITION_TARDIVE'): void => {
    const dossier = dossierFinTardiveFixture();
    read.result = { kind: 'DOSSIER', dossier: { ...dossier, choix: dossier.choix.map(choix => ({ ...choix, code })) } };
  };

  const givenAnAutomaticEndOverTheAutumnChangeOfHour = (acte: ActeResolution): void => {
    const debut = instantLocalFixture(new Date(2025, 9, 25, 20, 0));
    const echeance = instantLocalFixture(new Date(2025, 9, 26, 8, 0));
    const dossier = dossierFinAutomatiqueFixture();
    const ouvrant = requiredFixture(dossier.journal[0], 'automatic end fixture opening');
    const activite = requiredFixture(dossier.activites[0], 'automatic end fixture activity');
    const nuit: DossierAnomalie = {
      ...dossier,
      journal: [{ ...ouvrant, fait: { ...ouvrant.fait, instant: debut }, enregistre: debut }],
      activites: [{ ...activite, periode: { categorie: 'TRAVAIL', debut, fin: echeance, duree: 'PT13H' } }],
    };
    read.result = { kind: 'DOSSIER', dossier: nuit };
    givenASuccessfulPreview(nuit, acte, nuit);
  };

  const givenAnAutomaticEndBesideAnActivityStartedAtNoon = (): void => {
    const dossier = dossierFinAutomatiqueFixture();
    const travail = requiredFixture(dossier.activites[0], 'automatic end fixture activity');
    const nonConformite: ActiviteAnomalie = {
      id: new ActiviteAnomalieId('nc-12'),
      libelle: '',
      etat: 'TERMINEE',
      temps: '',
      ouvrant: new PointageAnomalieId('debut-12'),
      periode: { categorie: 'NON_CONFORMITE', debut: instantLocalFixture(new Date(2026, 8, 14, 12, 0)), fin: INSTANT_ECHEANCE },
    };
    read.result = { kind: 'DOSSIER', dossier: { ...dossier, activites: [travail, nonConformite] } };
  };

  const givenAGuidedCorrectionOf = (fait: Partial<Pick<FaitPropose, 'operateur' | 'poste' | 'type' | 'intention'>>): ActeResolution => {
    const dossier = dossierAnomalieFixture();
    const corrige = { ...faitConflitFixture(), activiteVisee: 'nc-12', ...fait };
    read.result = {
      kind: 'DOSSIER',
      dossier: {
        ...dossier,
        choix: dossier.choix.map(choix => ({ ...choix, saisie: SaisieActe.correct('fin-17', corrige) })),
      },
    };
    const acte: ActeResolution = { kind: 'CORRECTION', pointage: 'fin-17', motif: 'Cible confirmée', fait: corrige };
    givenASuccessfulPreview(undefined, acte);
    return acte;
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

  const givenAPreviewTurningTheEndIntoAnNcPassage = (): void => {
    const dossier = dossierAnomalieFixture();
    const pointage = pointageDeLaFinFixture();
    givenASuccessfulPreview({
      ...dossier,
      enConflit: false,
      journal: [{ ...pointage, fait: { ...pointage.fait, type: 'NON_CONFORMITE', intention: 'TRANSITION' } }],
    });
  };

  const givenAReceivedGesture = (type: FaitPropose['type'], intention: FaitPropose['intention']): void => {
    const dossier = dossierAnomalieFixture();
    read.result = {
      kind: 'DOSSIER',
      dossier: {
        ...dossier,
        journal: dossier.journal.map(pointage => ({ ...pointage, fait: { ...pointage.fait, type, intention } })),
      },
    };
  };

  const givenAPreviewWhoseJournalBeforeTheActIsEmpty = (): void => {
    givenASuccessfulPreview();
    if (preview.result.kind !== 'APERCU') throw new Error('Expected a successful preview.');
    const apercu = preview.result.apercu;
    preview.result = { kind: 'APERCU', apercu: { ...apercu, avant: { ...apercu.avant, journal: [] } } };
  };

  const givenAReplacementOfTheEndRecordedInTheDossier = (): void => {
    const dossier = dossierAnomalieFixture();
    read.result = {
      kind: 'DOSSIER',
      dossier: {
        ...dossier,
        journal: [
          ...dossier.journal,
          { ...pointageDeLaFinFixture(), id: new PointageAnomalieId('fin-18'), remplace: new PointageAnomalieId('fin-17') },
        ],
      },
    };
  };

  const givenAPreviewComparingNamedAndUnnamedOperators = (remplacement: { remplace?: string } = {}): void => {
    const dossier = dossierAnomalieFixture();
    const pointage = pointageDeLaFinFixture();
    givenASuccessfulPreview({
      ...dossier,
      enConflit: false,
      journal: [
        { ...pointage, operateurNom: 'Alex Durand' },
        {
          ...pointage,
          id: new PointageAnomalieId('fin-18'),
          operateurNom: '',
          activiteCreee: new ActiviteAnomalieId('nc-12'),
          ...(remplacement.remplace === undefined ? {} : { remplace: new PointageAnomalieId(remplacement.remplace) }),
        },
        { ...pointage, id: new PointageAnomalieId('fin-19'), fait: { ...pointage.fait, activiteVisee: 'nc-99' } },
      ],
    });
  };

  const givenAPointageCreatingAnActivityAbsentFromTheDossier = (surcharge: Partial<PointageAnomalie> = {}): void => {
    const dossier = dossierAnomalieFixture();
    read.result = {
      kind: 'DOSSIER',
      dossier: {
        ...dossier,
        journal: [
          ...dossier.journal,
          {
            ...pointageDeLaFinFixture(),
            id: new PointageAnomalieId('debut-9'),
            fait: { ...faitConflitFixture(), type: 'DEBUT', intention: 'OUVERTURE', instant: INSTANT_DEBUT },
            activiteCreee: new ActiviteAnomalieId('travail-9'),
            ...surcharge,
          },
        ],
      },
    };
  };

  const givenDiagnosticsOn = (pointages: readonly string[]): void => {
    const dossier = dossierAnomalieFixture();
    read.result = {
      kind: 'DOSSIER',
      dossier: {
        ...dossier,
        diagnostics: pointages.map(pointage => ({
          pointage: new PointageAnomalieId(pointage),
          raison: 'CIBLE_REMPLACEE' as const,
          cible: { activite: new ActiviteAnomalieId('travail-8') },
        })),
      },
    };
  };

  const givenAStructuredDiagnostic = (pointage = 'fin-17'): void => {
    const dossier = dossierAnomalieFixture();
    read.result = {
      kind: 'DOSSIER',
      dossier: {
        ...dossier,
        ligne: { ...dossier.ligne, explication: '' },
        diagnostics: [
          {
            pointage: new PointageAnomalieId(pointage),
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

  const pointageCiteFixture = (id: string, cite: PointageCiteFixture, activiteVisee: string): PointageAnomalie => ({
    ...pointageDeLaFinFixture(),
    id: new PointageAnomalieId(id),
    fait: { ...faitConflitFixture(), ...GESTES_FIXTURE[cite.geste], activiteVisee, instant: instantAt(cite.heure) },
    regularisation: cite.regularisation === true,
  });

  const givenAConflictDiagnosedAs = (cas: CasDeConflitFixture): void => {
    const dossier = dossierAnomalieFixture();
    const cites = [
      { id: 'fin-17', cite: cas.enCause },
      ...(cas.ouvrant === undefined ? [] : [{ id: 'debut-8', cite: cas.ouvrant }]),
      ...(cas.termineePar === undefined ? [] : [{ id: 'nc-12', cite: cas.termineePar }]),
    ];
    read.result = {
      kind: 'DOSSIER',
      dossier: {
        ...dossier,
        ligne: { ...dossier.ligne, explication: '' },
        journal: cites
          .filter(({ cite }) => cite.absentDuJournal !== true)
          .map(({ id, cite }) => pointageCiteFixture(id, cite, 'travail-8')),
        activites: cas.activite === undefined ? [] : [activiteCiteFixture(cas.activite)],
        diagnostics: [
          {
            pointage: new PointageAnomalieId('fin-17'),
            raison: cas.raison,
            cible: {
              activite: new ActiviteAnomalieId('travail-8'),
              ...(cas.ouvrant === undefined ? {} : { ouvrant: new PointageAnomalieId('debut-8') }),
              ...(cas.termineePar === undefined ? {} : { termineePar: new PointageAnomalieId('nc-12') }),
            },
          },
        ],
      },
    };
  };

  const activiteCiteFixture = (cite: ActiviteCiteFixture): ActiviteAnomalie => ({
    id: new ActiviteAnomalieId('travail-8'),
    libelle: 'Travail ouvert à 8 h',
    etat: 'A_RESOUDRE',
    temps: 'À résoudre',
    ouvrant: new PointageAnomalieId('debut-8'),
    ...(cite.categorie === undefined ? {} : { periode: { categorie: cite.categorie, debut: instantAt(cite.debut ?? '08:00') } }),
  });

  const dueActivityFixture = (id: string, categorie: 'TRAVAIL' | 'NON_CONFORMITE', debut: string, fin: string): ActiviteAnomalie => ({
    id: new ActiviteAnomalieId(id),
    libelle: '',
    etat: 'ECHUE',
    temps: '',
    ouvrant: new PointageAnomalieId(`debut-${id}`),
    periode: { categorie, debut: instantAt(debut), fin: instantAt(fin), duree: 'PT10H' },
  });

  const regularisationsFixture = (cas: CasDeFinAutomatiqueFixture, choix: readonly ChoixGuide[]): readonly ChoixGuide[] => {
    if (cas.regularisation === 'AUCUNE') return [];
    if (cas.regularisation === 'AILLEURS') {
      return choix.map(candidat => ({
        ...candidat,
        saisie: SaisieActe.regularise({
          type: 'FIN',
          intention: 'FIN',
          activiteVisee: 'travail-9',
          operateur: 'op-camille',
          poste: 'poste-1',
          instant: '',
        }),
      }));
    }
    return choix;
  };

  const lateChoiceFixture = (tardif: NonNullable<CasDeFinAutomatiqueFixture['tardif']>): ChoixGuide => ({
    id: `${tardif.code}:tardif-30`,
    code: tardif.code,
    libelle: '',
    explication: '',
    saisie:
      tardif.sansCorrection === true
        ? finARegulariserFixture()
        : SaisieActe.correct('tardif-30', {
            ...faitConflitFixture(),
            activiteVisee: tardif.activiteVisee ?? 'travail-8',
            instant: instantAt(tardif.pointage.heure),
          }),
  });

  const givenAnAutomaticEndDiagnosedAs = (cas: CasDeFinAutomatiqueFixture): void => {
    const dossier = dossierFinAutomatiqueFixture();
    const tardif = cas.tardif;
    const dansLeJournal = tardif !== undefined && tardif.pointage.absentDuJournal !== true;
    read.result = {
      kind: 'DOSSIER',
      dossier: {
        ...dossier,
        journal: [...dossier.journal, ...(dansLeJournal ? [pointageCiteFixture('tardif-30', tardif.pointage, 'travail-8')] : [])],
        activites: [dueActivityFixture('travail-8', cas.categorie, '08:00', '18:00')],
        choix: [...regularisationsFixture(cas, dossier.choix), ...(tardif === undefined ? [] : [lateChoiceFixture(tardif)])],
      },
    };
  };

  const givenAnAutomaticEndWithAPointageAtFault = (): void => {
    const dossier = dossierFinAutomatiqueFixture();
    read.result = {
      kind: 'DOSSIER',
      dossier: {
        ...dossier,
        enConflit: true,
        journal: [...dossier.journal, pointageCiteFixture('fin-17', ARRET_17, 'travail-8')],
        diagnostics: [
          {
            pointage: new PointageAnomalieId('fin-17'),
            raison: 'CIBLE_REMPLACEE',
            cible: { activite: new ActiviteAnomalieId('travail-8') },
          },
        ],
      },
    };
  };

  const givenADueActivityOnADossierThatIsNoAutomaticEnd = (): void => {
    read.result = { kind: 'DOSSIER', dossier: { ...dossierFinAutomatiqueFixture(), finAutomatique: false } };
  };

  const givenTwoDueActivities = (): void => {
    const dossier = dossierFinAutomatiqueFixture();
    read.result = {
      kind: 'DOSSIER',
      dossier: {
        ...dossier,
        activites: [
          dueActivityFixture('travail-8', 'TRAVAIL', '08:00', '18:00'),
          dueActivityFixture('nc-9', 'NON_CONFORMITE', '09:00', '19:00'),
        ],
        choix: [
          ...dossier.choix,
          {
            id: 'REGULARISER_FIN:debut-nc-9',
            code: 'REGULARISER_FIN',
            libelle: '',
            explication: '',
            saisie: SaisieActe.regularise({
              type: 'FIN',
              intention: 'FIN',
              activiteVisee: 'nc-9',
              operateur: 'op-camille',
              poste: 'poste-1',
              instant: '',
            }),
          },
        ],
      },
    };
  };

  const givenAnAutomaticEndWhoseActivityIs = (etat: ActiviteAnomalie['etat'], periode?: { fin?: string }): void => {
    const dossier = dossierFinAutomatiqueFixture();
    read.result = {
      kind: 'DOSSIER',
      dossier: {
        ...dossier,
        activites: [
          {
            id: new ActiviteAnomalieId('travail-8'),
            libelle: '',
            temps: '',
            ouvrant: new PointageAnomalieId('debut-8'),
            etat,
            ...(periode === undefined
              ? {}
              : { periode: { categorie: 'TRAVAIL' as const, debut: INSTANT_DEBUT, duree: 'PT9H', ...periode } }),
          },
        ],
      },
    };
  };

  const dossierDiagnosedOn = (pointages: readonly string[]): DossierAnomalie => {
    const dossier = dossierAnomalieFixture();
    return {
      ...dossier,
      ligne: { ...dossier.ligne, explication: '' },
      journal: [pointageCiteFixture('fin-17', ARRET_17, 'travail-8'), pointageCiteFixture('debut-8', DEMARRAGE_8, '')],
      activites: [activiteCiteFixture(TRAVAIL_8)],
      diagnostics: pointages.map(pointage => ({
        pointage: new PointageAnomalieId(pointage),
        raison: 'CIBLE_REMPLACEE' as const,
        cible: { activite: new ActiviteAnomalieId('travail-8') },
      })),
    };
  };

  const givenAnActivityAlreadyStoppedBeforeTheEndAtFault = (): void => {
    const dossier = dossierAnomalieFixture();
    read.result = {
      kind: 'DOSSIER',
      dossier: {
        ...dossier,
        ligne: { ...dossier.ligne, explication: '' },
        journal: [pointageCiteFixture('fin-17', ARRET_17, 'travail-8'), pointageCiteFixture('fin-12', ARRET_12, 'travail-8')],
        activites: [activiteCiteFixture(TRAVAIL_8)],
        diagnostics: [
          {
            pointage: new PointageAnomalieId('fin-17'),
            raison: 'CIBLE_DEJA_TERMINEE',
            cible: { activite: new ActiviteAnomalieId('travail-8'), termineePar: new PointageAnomalieId('fin-12') },
          },
        ],
      },
    };
  };

  const givenARegularisedPassageAtFault = (): void => {
    givenAConflictDiagnosedAs({
      cas: 'a regularised passage at fault',
      raison: 'CONTRADICTION_REGULARISATION',
      enCause: { geste: 'PASSAGE_NC', heure: '18:00', regularisation: true },
      activite: TRAVAIL_8,
      phrase: '',
    });
  };

  const givenAStopBeforeTheOpeningOfItsActivity = (): void => {
    const dossier = dossierAnomalieFixture();
    read.result = {
      kind: 'DOSSIER',
      dossier: {
        ...dossier,
        ligne: { ...dossier.ligne, explication: '' },
        journal: [pointageCiteFixture('fin-7', ARRET_7, 'travail-8'), pointageCiteFixture('debut-8', DEMARRAGE_8, '')],
        activites: [activiteCiteFixture(TRAVAIL_8)],
        diagnostics: [
          {
            pointage: new PointageAnomalieId('fin-7'),
            raison: 'GESTE_AVANT_OUVERTURE',
            cible: { activite: new ActiviteAnomalieId('travail-8'), ouvrant: new PointageAnomalieId('debut-8') },
          },
        ],
      },
    };
  };

  const givenAPassageBeforeTheOpeningOfItsActivity = (): void => {
    const dossier = dossierAnomalieFixture();
    read.result = {
      kind: 'DOSSIER',
      dossier: {
        ...dossier,
        ligne: { ...dossier.ligne, explication: '' },
        journal: [pointageCiteFixture('nc-7', { geste: 'PASSAGE_NC', heure: '07:00' }, 'travail-8')],
        activites: [activiteCiteFixture(TRAVAIL_8)],
        diagnostics: [
          {
            pointage: new PointageAnomalieId('nc-7'),
            raison: 'GESTE_AVANT_OUVERTURE',
            cible: { activite: new ActiviteAnomalieId('travail-8') },
          },
        ],
      },
    };
  };

  const givenAnEndAtFaultAndAnotherPointageAt = (autre: Date): void => {
    const dossier = dossierAnomalieFixture();
    const arret = pointageCiteFixture('fin-17', ARRET_17, 'travail-8');
    const demarrage = pointageCiteFixture('debut-8', DEMARRAGE_8, '');
    read.result = {
      kind: 'DOSSIER',
      dossier: {
        ...dossier,
        ligne: { ...dossier.ligne, explication: '' },
        journal: [
          { ...arret, fait: { ...arret.fait, instant: instantLocalFixture(new Date(2026, 8, 14, 17, 0, 40)) } },
          { ...demarrage, fait: { ...demarrage.fait, instant: instantLocalFixture(autre) } },
        ],
        activites: [activiteCiteFixture(TRAVAIL_8)],
        diagnostics: [
          {
            pointage: new PointageAnomalieId('fin-17'),
            raison: 'CIBLE_REMPLACEE',
            cible: { activite: new ActiviteAnomalieId('travail-8') },
          },
        ],
      },
    };
  };

  const givenAnEndAtFaultInTheSameMinuteAsAnotherPointage = (): void => {
    givenAnEndAtFaultAndAnotherPointageAt(new Date(2026, 8, 14, 17, 0, 10));
  };

  const givenAnEndAtFaultInAnotherMinuteThanAnotherPointage = (): void => {
    givenAnEndAtFaultAndAnotherPointageAt(new Date(2026, 8, 14, 17, 1, 10));
  };

  const givenTwoDiagnostics = (): void => {
    read.result = { kind: 'DOSSIER', dossier: dossierDiagnosedOn(['fin-17', 'debut-8']) };
  };

  const givenAReceiptWhoseOnlyFaultIs = (pointage: string): void => {
    givenASuccessfulPreview();
    application.result = { kind: 'APPLIQUE', dossier: { ...dossierDiagnosedOn([pointage]), version: 2 } };
  };

  const givenAChallengedPointageWithAnUnreadableInstant = (): void => {
    const dossier = dossierAnomalieFixture();
    const [pointage] = dossier.journal;
    if (pointage === undefined) throw new Error('Expected a challenged pointage');
    read.result = {
      kind: 'DOSSIER',
      dossier: {
        ...dossier,
        ligne: { ...dossier.ligne, explication: '' },
        journal: [{ ...pointage, fait: { ...pointage.fait, instant: 'illisible' } }],
        activites: [activiteCiteFixture(TRAVAIL_8)],
        diagnostics: [
          {
            pointage: new PointageAnomalieId('fin-17'),
            raison: 'CIBLE_REMPLACEE',
            cible: { activite: new ActiviteAnomalieId('travail-8') },
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
            ouvrant: new PointageAnomalieId('debut-8'),
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
    await whenCorrecting('fin-17');
    await whenEntering('anomalie-motif', 'Cible confirmée');
  };

  const givenACorrectionReceivedWithAnOffset = (instant: string): void => {
    const dossier = dossierAnomalieFixture();
    read.result = {
      kind: 'DOSSIER',
      dossier: { ...dossier, journal: dossier.journal.map(pointage => ({ ...pointage, fait: { ...pointage.fait, instant } })) },
    };
  };

  const givenAConsultantWhoCannotApplyDecisions = (): void => {
    TestBed.overrideProvider(AnomaliesRightsPort, { useValue: { canApply: () => false } });
  };

  const givenTheReferentielIsStillLoading = (): PendingResponseFixture<ReferentielAnomalies> => {
    const attente = new PendingResponseFixture<ReferentielAnomalies>();
    read.referentielPending = attente;
    return attente;
  };

  const givenAnUnavailableReferentielRetried = async (): Promise<void> => {
    read.referentielFailure = new Error('Référentiel indisponible');
    await whenRendering();
    await whenClicking('anomalie-choix');
    read.referentielFailure = undefined;
    await whenClicking('anomalie-referentiel-retry');
  };

  const thenTheIdentityIsUnfolded = (unfolded: boolean): void => {
    expect(element('anomalie-identite-modifier').getAttribute('aria-expanded')).toBe(String(unfolded));
  };

  const thenTheRetryIsBusy = (): void => {
    expect(element('anomalie-referentiel-retry').getAttribute('aria-busy')).toBe('true');
  };

  const whenRetryingTheReferentielWhileItIsRead = async (): Promise<void> => {
    givenTheReferentielIsStillLoading();
    const retry = element('anomalie-referentiel-retry');
    retry.focus();
    retry.click();
    await roundTripFixture(() => undefined);
    fixture.detectChanges();
  };

  const whenOpeningTheGuidedCorrectionWhileTheReferentielLoads = async (
    attente: PendingResponseFixture<ReferentielAnomalies>,
  ): Promise<void> => {
    whenRenderingWithoutWaiting();
    await attente.arrival;
    await roundTripFixture(() => undefined);
    fixture.detectChanges();
    element('anomalie-choix').click();
    fixture.detectChanges();
  };

  const thenTheOperatorChoiceIsDescribedByItsError = (message: string): void => {
    expect(element('anomalie-operateur').getAttribute('aria-describedby')).toBe('operateur-acte-erreur');
    expect(requiredFixture(document.getElementById('operateur-acte-erreur'), 'operator error').textContent).toContain(message);
  };

  const thenTheOperatorChoiceIsNoLongerDescribedByAnError = (): void => {
    expect(element('anomalie-operateur').hasAttribute('aria-describedby')).toBe(false);
    expect(document.getElementById('operateur-acte-erreur')).toBeNull();
  };

  const whenOpeningTheOperatorChoice = async (): Promise<void> => {
    element('anomalie-operateur').click();
    await fixture.whenStable();
  };

  const whenChoosingTheOperator = async (name: string, search?: string): Promise<void> => {
    await whenOpeningTheOperatorChoice();
    if (search !== undefined) {
      const input = requiredFixture(
        document.querySelector<HTMLInputElement>(dataSelector('anomalie-operateur-recherche')),
        'operator search',
      );
      input.value = search;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await fixture.whenStable();
    }
    const option = operatorOptionElements().find(candidate => candidate.textContent.trim() === name);
    requiredFixture(option, `operator option ${name}`).click();
    await fixture.whenStable();
  };

  const operatorOptionElements = (): HTMLElement[] => [
    ...document.querySelectorAll<HTMLElement>(dataSelector('anomalie-operateur-proposition')),
  ];
  const operatorOptions = (): string[] => operatorOptionElements().map(option => option.textContent.trim());

  const posteSelect = (): HTMLSelectElement => {
    const select = field('anomalie-poste');
    if (!(select instanceof HTMLSelectElement)) throw new Error('Expected a workstation choice');
    return select;
  };

  const gestureSelect = (): HTMLSelectElement => {
    const select = field('anomalie-signal');
    if (!(select instanceof HTMLSelectElement)) throw new Error('Expected a gesture choice');
    return select;
  };

  const gestureChoices = (): string[] => [...gestureSelect().options].map(option => option.textContent.trim());

  const whenChoosingTheGesture = async (libelle: string): Promise<void> => {
    const option = [...gestureSelect().options].find(candidate => candidate.textContent.trim() === libelle);
    await whenEntering('anomalie-signal', requiredFixture(option, `gesture ${libelle}`).value);
  };

  const thenGestureIs = (libelle: string): void => {
    expect(gestureSelect().selectedOptions[0]?.textContent.trim()).toBe(libelle);
  };

  const posteChoices = (): string[] =>
    [...posteSelect().children].map(child =>
      child instanceof HTMLOptGroupElement
        ? `${child.label}: ${[...child.children].map(option => option.textContent.trim()).join(', ')}`
        : child.textContent.trim(),
    );

  const thenTheButtonReads = (selector: string, visibleText: string, accessibleName: string): void => {
    expect(element(selector).textContent.trim()).toBe(visibleText);
    expect(element(selector).getAttribute('aria-label')).toBe(accessibleName);
  };
  const labelOf = (selector: string): string => {
    const label = (fixture.nativeElement as HTMLElement).querySelector<HTMLLabelElement>(`label[for="${element(selector).id}"]`);
    return requiredFixture(label, `label of ${selector}`).textContent.trim();
  };

  const whenEnteringTheInstant = async (date: string, time: string): Promise<void> => {
    await whenEntering('anomalie-instant-date', date);
    await whenEntering('anomalie-instant-heure', time);
  };

  const whenPressingOnTheHandle = async (key: string, shiftKey = false): Promise<void> => {
    element('anomalie-poignee').dispatchEvent(new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true }));
    await fixture.whenStable();
  };

  const whenPressingOnTheHandleFourTimes = async (key: string, shiftKey: boolean): Promise<void> => {
    for (let fois = 0; fois < 4; fois += 1) await whenPressingOnTheHandle(key, shiftKey);
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

  const whenSelecting = async (pointage: string): Promise<void> => {
    marker(pointage).click();
    await fixture.whenStable();
  };

  const whenSelectingTheActivity = async (activite: string): Promise<void> => {
    bar(activite).click();
    await fixture.whenStable();
  };

  const frise = (): HTMLElement => element('anomalie-frise');

  const friseElements = (selector: string): HTMLElement[] => [...frise().querySelectorAll<HTMLElement>(dataSelector(selector))];

  const marker = (pointage: string): HTMLElement =>
    requiredFixture(
      friseElements('anomalie-pointage').find(candidate => candidate.dataset['pointage'] === pointage),
      `marker of ${pointage}`,
    );

  const whenTheFriseIsMeasured = async (width: number): Promise<void> => {
    resizeObserver.announce(width);
    await fixture.whenStable();
  };

  const thenTheFriseGraduationsAre = (expected: readonly string[]): void => {
    expect(friseElements('anomalie-frise-graduation-heure').map(graduation => graduation.textContent.trim())).toEqual(expected);
  };

  const thenTheFriseMarkersAre = (expected: readonly string[]): void => {
    expect(friseElements('anomalie-pointage').map(candidate => candidate.dataset['pointage'])).toEqual(expected);
  };

  const bar = (activite: string): HTMLElement =>
    requiredFixture(
      friseElements('anomalie-activite').find(candidate => candidate.dataset['activite'] === activite),
      `bar of ${activite}`,
    );

  const whenCorrecting = async (pointage: string): Promise<void> => {
    await whenSelecting(pointage);
    await whenClickingInTheSelection('anomalie-corriger');
  };

  const whenCancelling = async (pointage: string): Promise<void> => {
    await whenSelecting(pointage);
    await whenClickingInTheSelection('anomalie-annuler');
  };

  const whenClickingInTheSelection = async (selector: string): Promise<void> => {
    requiredFixture(
      element('anomalie-selection').querySelector<HTMLElement>(dataSelector(selector)),
      `${selector} of the selection`,
    ).click();
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

  interface PointageHorsDeLAnomalieFixture {
    readonly instant: Date;
    readonly operateur?: string;
    readonly annule?: true;
  }

  const givenAnAnomalyOnADayWith = (
    debut: Date,
    fin: Date,
    horsDeLAnomalie: readonly PointageHorsDeLAnomalieFixture[],
    noms: { readonly ligne?: string; readonly journal?: string } = {},
  ): void => {
    const dossier = dossierAnomalieFixture();
    const modele = pointageDeLaFinFixture();
    const pointage = (id: string, instant: Date, options: Partial<PointageHorsDeLAnomalieFixture> = {}): PointageAnomalie => ({
      ...modele,
      id: new PointageAnomalieId(id),
      fait: { ...modele.fait, instant: instantLocalFixture(instant), operateur: options.operateur ?? 'op-camille' },
      enregistre: instantLocalFixture(instant),
      operateurNom: noms.journal ?? 'Camille Martin',
      ...(options.annule === undefined ? {} : { annulation: { motif: 'Erreur', auteur: 'camille', instant: INSTANT_ENREGISTREMENT } }),
    });
    const dansLAnomalie = [pointage('debut-8', debut), pointage('fin-17', fin)];
    read.result = {
      kind: 'DOSSIER',
      dossier: {
        ...dossier,
        ligne: { ...dossier.ligne, operateur: noms.ligne ?? 'Camille Martin' },
        journal: [...dansLAnomalie, ...horsDeLAnomalie.map((hors, rang) => pointage(`hors-${rang}`, hors.instant, hors))],
        perimetre: new PerimetreDuDossier(dansLAnomalie.map(dedans => dedans.id)),
      },
    };
  };

  const givenAnAnomalyThatShowsNothing = (): void => {
    givenAnAnomalyOnADayWith(new Date(2026, 8, 14, 8, 0), new Date(2026, 8, 14, 17, 0), [{ instant: new Date(2026, 8, 14, 10, 0) }]);
    const lecture = read.result;
    if (lecture.kind !== 'DOSSIER') throw new Error('Missing dossier fixture');
    read.result = { kind: 'DOSSIER', dossier: { ...lecture.dossier, perimetre: new PerimetreDuDossier([]), activites: [] } };
  };

  const theContext = (): string => element('anomalie-frise-contexte').textContent;

  const thenTheContextIs = (expected: string): void => {
    expect(theContext()).toBe(expected);
  };

  const thenTheContextReads = (expected: string): void => {
    expect(element('anomalie-frise-contexte').textContent.replace(/\s+/g, ' ').trim()).toBe(expected);
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
  const thenTheSelectionReads = (expected: string): void => {
    expect(element('anomalie-selection-vide').textContent.trim()).toBe(expected);
  };
  const thenOnlyThePointageIsPressed = (pressed: string, others: readonly string[]): void => {
    expect(marker(pressed).getAttribute('aria-pressed')).toBe('true');
    for (const other of others) expect(marker(other).getAttribute('aria-pressed')).toBe('false');
  };
  const thenTheHandleIsLocked = (): void => {
    expect(element('anomalie-poignee').getAttribute('aria-disabled')).toBe('true');
  };
  const thenTheHandleHoldsAt = (expected: Date): void => {
    expect(Number(element('anomalie-poignee').getAttribute('aria-valuenow'))).toBe(expected.getTime());
  };

  const thenTheHandleReads = (expected: string): void => {
    expect(element('anomalie-poignee').getAttribute('aria-valuetext')).toBe(expected);
  };
  const thenTheMarkerIsNamed = (pointage: string, expected: string): void => {
    expect(marker(pointage).getAttribute('aria-label')).toBe(expected);
  };
  const thenTheSelectionContains = (expected: string): void => {
    expect(element('anomalie-selection').textContent.replace(/\s+/g, ' ')).toContain(expected);
  };
  const thenTheSelectionDoesNotContain = (unexpected: string): void => {
    expect(element('anomalie-selection').textContent).not.toContain(unexpected);
  };
  const thenTheSelectionDatetimeIs = (expected: string): void => {
    const time = requiredFixture(element('anomalie-selection').querySelector<HTMLElement>('time'), 'selection time');
    expect(time.getAttribute('datetime')).toBe(expected);
  };
  const thenTheSelectedActivityIs = (expected: string): void => {
    expect(element('anomalie-selection-activite').textContent.trim()).toBe(expected);
  };
  const thenTheActivityIsPressed = (activite: string): void => {
    expect(bar(activite).getAttribute('aria-pressed')).toBe('true');
  };
  const thenNoPointageIsPressed = (pointages: readonly string[]): void => {
    for (const pointage of pointages) expect(marker(pointage).getAttribute('aria-pressed')).toBe('false');
  };
  const thenTheActivityIsNotPressed = (activite: string): void => {
    expect(bar(activite).getAttribute('aria-pressed')).toBe('false');
  };
  const thenTheFriseComesBeforeTheSelectionAndTheDecision = (): void => {
    const following = Node.DOCUMENT_POSITION_FOLLOWING;
    expect(frise().compareDocumentPosition(element('anomalie-selection')) & following).toBe(following);
    expect(element('anomalie-selection').compareDocumentPosition(element('anomalie-decision')) & following).toBe(following);
  };
  const thenThePropositionsComeBeforeTheDirectActionsAndTheOtherCorrections = (): void => {
    const following = Node.DOCUMENT_POSITION_FOLLOWING;
    expect(element('anomalie-choix').compareDocumentPosition(element('anomalie-actions-directes')) & following).toBe(following);
    expect(element('anomalie-actions-directes').compareDocumentPosition(element('anomalie-detail')) & following).toBe(following);
  };
  const thenTheSelectionTimeIs = (expected: string): void => {
    const time = requiredFixture(element('anomalie-selection').querySelector<HTMLElement>('time'), 'selection time');
    expect(time.textContent.replace(/\s+/g, ' ').trim()).toBe(expected);
  };
  const thenTheFriseOffersNoActionNorTraceability = (): void => {
    expect(frise().querySelector(dataSelector('anomalie-corriger'))).toBeNull();
    expect(frise().querySelector(dataSelector('anomalie-annuler'))).toBeNull();
    expect(frise().querySelector(dataSelector('anomalie-pointage-detail'))).toBeNull();
    expect(frise().querySelector('details')).toBeNull();
  };
  const thenTheSelectionOffersNoAction = (): void => {
    expect(element('anomalie-selection').querySelector(dataSelector('anomalie-corriger'))).toBeNull();
    expect(element('anomalie-selection').querySelector(dataSelector('anomalie-annuler'))).toBeNull();
  };
  const thenTheSelectionActionsAreDisabled = (): void => {
    for (const selector of ['anomalie-corriger', 'anomalie-annuler']) {
      const action = element('anomalie-selection').querySelector<HTMLButtonElement>(dataSelector(selector));
      expect(requiredFixture(action, `${selector} of the selection`).disabled).toBe(true);
    }
  };
  const thenTheSelectionShowsTheGesture = (expected: string): void => {
    expect(element('anomalie-selection-geste').textContent.trim()).toBe(expected);
  };
  const thenTheDirectActionsAre = (expected: readonly string[]): void => {
    const actions = [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(dataSelector('anomalie-action-directe'))];
    expect(actions.map(action => action.textContent.replace(/\s+/g, ' ').trim())).toEqual(expected);
  };
  const directActions = (): HTMLElement[] => [
    ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(dataSelector('anomalie-action-directe')),
  ];
  const directAction = (acte: string, pointage: string): HTMLElement =>
    requiredFixture(
      directActions().find(candidate => candidate.dataset['acte'] === acte && candidate.dataset['pointage'] === pointage),
      `direct action ${acte} of ${pointage}`,
    );
  const whenChoosingTheDirectAction = async (acte: string, pointage: string): Promise<void> => {
    directAction(acte, pointage).click();
    await fixture.whenStable();
  };
  const thenTheDirectActionsAreDisabled = (): void => {
    const disabled = directActions().map(action => action instanceof HTMLButtonElement && action.disabled);
    expect(disabled).toEqual([true, true]);
  };
  const thenNoDirectActionIsPressed = (): void => {
    expect(directActions().map(action => action.getAttribute('aria-pressed'))).toEqual(['false', 'false']);
  };
  const thenOnlyTheDirectActionIsPressed = (acte: string, pointage: string): void => {
    expect(directAction(acte, pointage).getAttribute('aria-pressed')).toBe('true');
    expect(directActions().filter(action => action.getAttribute('aria-pressed') === 'true')).toHaveLength(1);
    thenNoInterpretationIsSelected();
  };
  const thenTheProblemReads = (expected: string): void => {
    expect(element('anomalie-probleme').textContent.replace(/\s+/g, ' ').trim()).toBe(expected);
  };
  const thenTheProblemsRead = (expected: readonly string[]): void => {
    const problemes = [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(dataSelector('anomalie-probleme'))];
    expect(problemes.map(probleme => probleme.textContent.replace(/\s+/g, ' ').trim())).toEqual(expected);
  };
  const thenTheActivityAfterTheActIsNamed = (activite: string, expected: string): void => {
    const barre = requiredFixture(
      [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(dataSelector('anomalie-apercu-activite-apres'))].find(
        candidate => candidate.dataset['activite'] === activite,
      ),
      `bar after the act of ${activite}`,
    );
    expect(barre.getAttribute('aria-label')).toBe(expected);
  };
  const afterTheAct = (selector: string, attribut: string, identifiant: string): HTMLElement =>
    requiredFixture(
      [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(dataSelector(selector))].find(
        candidate => candidate.dataset[attribut] === identifiant,
      ),
      `${selector} of ${identifiant}`,
    );

  const thenTheActivityAfterTheActIsFlagged = (activite: string, expected: string): void => {
    expect(afterTheAct('anomalie-apercu-activite-apres', 'activite', activite).getAttribute('data-modifiee')).toBe(expected);
  };

  const thenTheMarkerAfterTheActIs = (pointage: string, expected: Readonly<Record<string, string>>): void => {
    const marker = afterTheAct('anomalie-apres-pointage', 'pointage', pointage);
    expect(Object.fromEntries(Object.keys(expected).map(attribut => [attribut, marker.getAttribute(attribut)]))).toEqual(expected);
  };

  const thenTheTextsAre = (selector: string, expected: readonly string[]): void => {
    const textes = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll(dataSelector(selector)), found =>
      found.textContent.trim(),
    );
    expect(textes).toEqual(expected);
  };
  const thenTheLinkTargets = (selector: string, path: string, params: Record<string, string>): void => {
    const cible = new URL(requiredFixture(element(selector).getAttribute('href'), 'link target'), 'http://glm.test');
    expect(cible.pathname).toBe(path);
    expect(Object.fromEntries(cible.searchParams)).toEqual(params);
  };
  const thenTextContains = (selector: string, expected: string): void => {
    expect(element(selector).textContent).toContain(expected);
  };
  const comparedFact = (cote: 'avant' | 'apres', pointage: string): HTMLElement => element(`anomalie-apercu-fait-${cote}-${pointage}`);
  const thenComparedFactHeaderIs = (cote: 'avant' | 'apres', pointage: string, expected: string): void => {
    const entete = requiredFixture(comparedFact(cote, pointage).querySelector('p'), 'compared fact header');
    expect(entete.textContent.replace(/\s+/g, ' ').trim()).toBe(expected);
  };
  const thenComparedFactContains = (cote: 'avant' | 'apres', pointage: string, expected: string): void => {
    expect(comparedFact(cote, pointage).textContent.replace(/\s+/g, ' ')).toContain(expected);
  };
  const thenComparedFactDoesNotContain = (cote: 'avant' | 'apres', pointage: string, unexpected: string): void => {
    expect(comparedFact(cote, pointage).textContent).not.toContain(unexpected);
  };
  const thenComparedFactsShowNoIdentifier = (identifiers: readonly string[]): void => {
    for (const identifier of identifiers) expect(element('anomalie-apercu-journal').textContent).not.toContain(identifier);
  };
  const thenReceivedFactsShowNoActivityIdentifier = (pointages: readonly string[]): void => {
    for (const pointage of pointages) thenReceivedFactDoesNotContain(pointage, 'travail-');
  };
  const selectionTrace = (): HTMLElement =>
    requiredFixture(element('anomalie-selection').querySelector<HTMLElement>(dataSelector('anomalie-pointage-detail')), 'selection trace');
  const thenTheTraceShowsNoIdentifier = (identifiers: readonly string[]): void => {
    for (const identifier of identifiers) expect(selectionTrace().textContent).not.toContain(identifier);
  };
  const thenTheTraceContains = (expected: string): void => {
    expect(selectionTrace().textContent.replace(/\s+/g, ' ')).toContain(expected);
  };
  const gestureOf = (pointage: string): HTMLElement =>
    requiredFixture(receivedFact(pointage).querySelector<HTMLElement>(dataSelector('anomalie-pointage-geste')), 'received fact gesture');
  const thenReceivedGestureIs = (pointage: string, expected: string): void => {
    expect(gestureOf(pointage).textContent.trim()).toBe(expected);
  };
  const thenTheMarkerDoesNotGiveTheReason = (pointage: string, motif: string): void => {
    expect(marker(pointage).textContent).not.toContain(motif);
  };
  const thenTheMarkerFlagIs = (pointage: string, attribut: string, expected: string): void => {
    expect(marker(pointage).getAttribute(attribut)).toBe(expected);
  };
  const thenTheValidationReads = (expected: readonly string[]): void => {
    const erreurs = [...element('anomalie-validation').querySelectorAll('li')].map(erreur => erreur.textContent.trim());
    expect(erreurs).toEqual(expected);
  };
  const thenSummaryIsEmpty = (): void => {
    expect(element('anomalie-proposition-resume').textContent.trim()).toBe('');
  };
  const thenReceivedFactContains = (pointage: string, expected: string): void => {
    expect(receivedFact(pointage).textContent).toContain(expected);
  };
  const thenReceivedFactDoesNotContain = (pointage: string, expected: string): void => {
    expect(receivedFact(pointage).textContent).not.toContain(expected);
  };
  const thenReceivedFactDatetimeIs = (pointage: string, expected: string): void => {
    expect(receivedFactTime(pointage).getAttribute('datetime')).toBe(expected);
  };
  const receivedFactTime = (pointage: string): HTMLElement =>
    requiredFixture(receivedFact(pointage).querySelector<HTMLElement>('time'), 'received fact time');
  const receivedFact = (pointage: string): HTMLElement => {
    const history = [...element('anomalie-historique').querySelectorAll<HTMLElement>(dataSelector('anomalie-pointage'))];
    return requiredFixture(
      history.find(fact => fact.dataset['pointage'] === pointage),
      'history fact',
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
  const thenOperatorIs = (expected: string): void => {
    expect(element('anomalie-operateur').textContent.replace(/\s+/g, ' ').trim()).toBe(expected);
  };
  const thenPosteChoiceIs = (value: string, libelle: string): void => {
    const select = posteSelect();
    expect(select.value).toBe(value);
    expect(select.selectedOptions[0]?.textContent.trim()).toBe(libelle);
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
  const thenEnabled = (selector: string): void => {
    const button = element(selector);
    if (!(button instanceof HTMLButtonElement)) throw new Error('Expected a button');
    expect(button.disabled).toBe(false);
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
});

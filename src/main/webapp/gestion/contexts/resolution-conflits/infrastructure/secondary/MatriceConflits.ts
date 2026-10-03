import { SaisieActe } from '../../domain/acte/SaisieActe';
import { ActiviteConflitId } from '../../domain/dossier/ActiviteConflitId';
import { ActiviteConflit, ChoixGuide, DossierConflit } from '../../domain/dossier/DossierConflit';
import { ElementConflitId } from '../../domain/dossier/ElementConflitId';
import { PointageConflitId } from '../../domain/dossier/PointageConflitId';
import { SuiviConflitId } from '../../domain/dossier/SuiviConflitId';
import { ScenarioConflits } from './ScenarioConflits';
import { faitDemo, pointageDemo } from './ScenariosConflits';

interface ScenarioGuide {
  readonly suivi: string;
  readonly ancre: string;
  readonly numero: number;
  readonly explication: string;
  readonly journal: DossierConflit['journal'];
  readonly activitesInitiales?: DossierConflit['activites'];
  readonly activites: DossierConflit['activites'];
  readonly choix: ChoixGuide;
  readonly consequences: readonly string[];
  readonly poste?: string;
  readonly cloture?: boolean;
  readonly operateur?: string;
}

export const activite = (id: string, libelle: string, temps: string, etat: ActiviteConflit['etat'] = 'TERMINEE'): ActiviteConflit => ({
  id: new ActiviteConflitId(id),
  libelle,
  temps,
  etat,
});

export const scenarioGuide = (options: ScenarioGuide): ScenarioConflits => ({
  pointages: options.journal.map(pointage => pointage.id.pointage),
  dossier: {
    ligne: {
      adresse: { suivi: new SuiviConflitId(options.suivi), pointage: new PointageConflitId(options.ancre) },
      element: new ElementConflitId(`demo-element-${options.numero}`),
      designation: `Moule · M-0${options.numero} — Démonstration`,
      operateur: options.operateur ?? 'Camille Martin',
      poste: options.poste ?? 'Fraisage · DMU 50',
      date: '2026-09-14',
      explication: options.explication,
      nombrePointages: options.journal.length,
    },
    version: 1,
    cloture: options.cloture ?? false,
    engagement: '2026-09-14T07:00:00+02:00',
    ...(options.cloture === true ? { finCloture: '2026-09-14T18:00:00+02:00' } : {}),
    journal: options.journal,
    activites: options.activitesInitiales ?? options.activites.map(activite => ({ ...activite, etat: 'A_RESOUDRE', temps: 'À résoudre' })),
    choix: [options.choix],
    enConflit: true,
    consequences: [],
    continuations: [],
  },
  resultats: new Map([
    [
      options.choix.id,
      {
        enConflit: false,
        activites: options.activites,
        consequences: options.consequences,
        choix: [],
        continuations: [],
      },
    ],
  ]),
});

const transition = (): ScenarioConflits =>
  scenarioGuide({
    suivi: 'demo-transition',
    ancre: 'transition-14',
    numero: 43,
    explication: 'La reprise à 14 h vise le travail remplacé à 12 h, au lieu de la NC.',
    journal: [
      pointageDemo('debut-8', faitDemo('08:00:00', 'DEBUT', 'OUVERTURE'), 'travail-8'),
      pointageDemo('nc-12', faitDemo('12:00:00', 'NON_CONFORMITE', 'TRANSITION', 'travail-8'), 'nc-12'),
      pointageDemo('transition-14', faitDemo('14:00:00', 'DEBUT', 'TRANSITION', 'travail-8'), 'reprise-14'),
      pointageDemo('fin-17', faitDemo('17:00:00', 'FIN', 'FIN', 'reprise-14')),
    ],
    activitesInitiales: [
      activite('travail-8', 'Travail commencé à 8 h', 'À résoudre', 'A_RESOUDRE'),
      activite('nc-12', 'NC commencée à 12 h', 'À résoudre', 'A_RESOUDRE'),
      activite('reprise-14', 'Reprise commencée à 14 h', 'À résoudre', 'A_RESOUDRE'),
    ],
    activites: [
      activite('travail-8', 'Travail de 8 h à 12 h', '4 h'),
      activite('nc-12', 'NC de 12 h à 14 h', '2 h'),
      activite('reprise-14', 'Reprise de 14 h à 17 h', '3 h'),
    ],
    choix: {
      id: 'rattacher-transition',
      libelle: 'La reprise concernait la NC',
      explication: 'Rattacher explicitement la transition de 14 h à la NC.',
      saisie: SaisieActe.correct('transition-14', faitDemo('14:00:00', 'DEBUT', 'TRANSITION', 'nc-12')),
    },
    consequences: ['Travail de 8 h à 12 h : 4 h.', 'NC de 12 h à 14 h : 2 h.', 'Reprise de 14 h à 17 h : 3 h.'],
  });

const deuxFins = (): ScenarioConflits =>
  scenarioGuide({
    suivi: 'demo-deux-fins',
    ancre: 'fin-17-02',
    numero: 44,
    explication: 'Deux fins visent le même travail à 17 h et 17 h 00 min 02 s.',
    journal: [
      pointageDemo('debut-8', faitDemo('08:00:00', 'DEBUT', 'OUVERTURE'), 'travail-8'),
      pointageDemo('fin-17', faitDemo('17:00:00', 'FIN', 'FIN', 'travail-8')),
      pointageDemo('fin-17-02', faitDemo('17:00:02', 'FIN', 'FIN', 'travail-8')),
    ],
    activitesInitiales: [activite('travail-8', 'Travail commencé à 8 h', 'À résoudre', 'A_RESOUDRE')],
    activites: [activite('travail-8', 'Travail de 8 h à 17 h', '9 h')],
    choix: {
      id: 'annuler-seconde-fin',
      libelle: 'La seconde fin était un double appui',
      explication: 'Annuler la fin à 17 h 00 min 02 s, conserver la première.',
      saisie: SaisieActe.cancel('fin-17-02'),
    },
    consequences: ['Travail de 8 h à 17 h : 9 h.', 'La seconde fin à 17 h 00 min 02 s est annulée.'],
  });

const avantOuverture = (): ScenarioConflits =>
  scenarioGuide({
    suivi: 'demo-avant-ouverture',
    ancre: 'fin-avant',
    numero: 45,
    poste: '',
    explication: 'La fin à 7 h 59 min 59 s précède le travail ouvert à 8 h 00 min 00,123456789 s.',
    journal: [
      pointageDemo('debut-precis', { ...faitDemo('08:00:00.123456789', 'DEBUT', 'OUVERTURE'), poste: '' }, 'travail-precis'),
      pointageDemo('fin-avant', { ...faitDemo('07:59:59', 'FIN', 'FIN', 'travail-precis'), poste: '' }),
    ],
    activites: [activite('travail-precis', 'Travail avec instant précis', '8 h 59 min 59,876543211 s')],
    choix: {
      id: 'corriger-heure-fin',
      libelle: 'La fin était à 17 h',
      explication: 'Corriger l’heure de la fin, conserver l’instant précis de l’ouverture.',
      saisie: SaisieActe.correct('fin-avant', { ...faitDemo('17:00:00', 'FIN', 'FIN', 'travail-precis'), poste: '' }),
    },
    consequences: ['Travail terminé à 17 h.', 'L’ouverture conserve ses neuf chiffres de précision et reste sans poste.'],
  });

const ouvertureAnnulee = (): ScenarioConflits =>
  scenarioGuide({
    suivi: 'demo-ouverture-annulee',
    ancre: 'fin-orpheline',
    numero: 46,
    operateur: 'Opérateur non résolu · op-absent',
    explication: 'La fin vise une ouverture déjà annulée ; aucune activité ne peut être interprétée.',
    journal: [
      {
        ...pointageDemo('debut-annule', { ...faitDemo('08:00:00', 'DEBUT', 'OUVERTURE'), operateur: 'op-absent' }, 'travail-annule'),
        annulation: { motif: 'Ouverture saisie par erreur', auteur: 'Gestionnaire de démonstration', instant: '2026-09-14T10:00:00+02:00' },
      },
      pointageDemo('fin-orpheline', { ...faitDemo('17:00:00', 'FIN', 'FIN', 'travail-annule'), operateur: 'op-absent' }),
    ],
    activites: [],
    choix: {
      id: 'annuler-fin-orpheline',
      libelle: 'La fin était aussi une erreur',
      explication: 'Annuler explicitement le geste visant l’ouverture annulée.',
      saisie: SaisieActe.cancel('fin-orpheline'),
    },
    consequences: ['La fin orpheline est annulée.', 'Aucune activité ni durée n’est créée.'],
  });

const memeCategorie = (): ScenarioConflits =>
  scenarioGuide({
    suivi: 'demo-meme-categorie',
    ancre: 'transition-12',
    numero: 47,
    explication: 'Une transition travail vers travail à 12 h garde une contradiction de catégorie.',
    journal: [
      pointageDemo('debut-8', faitDemo('08:00:00', 'DEBUT', 'OUVERTURE'), 'travail-8'),
      pointageDemo('transition-12', faitDemo('12:00:00', 'DEBUT', 'TRANSITION', 'travail-8'), 'activite-12'),
      pointageDemo('fin-17', faitDemo('17:00:00', 'FIN', 'FIN', 'activite-12')),
    ],
    activitesInitiales: [
      activite('travail-8', 'Travail commencé à 8 h', 'À résoudre', 'A_RESOUDRE'),
      activite('activite-12', 'Travail commencé à 12 h', 'À résoudre', 'A_RESOUDRE'),
    ],
    activites: [activite('travail-8', 'Travail de 8 h à 12 h', '4 h'), activite('activite-12', 'NC de 12 h à 17 h', '5 h')],
    choix: {
      id: 'corriger-categorie',
      libelle: 'Le passage à 12 h était en NC',
      explication: 'Changer explicitement la catégorie en préservant l’identité créée et la cible de la fin.',
      saisie: SaisieActe.correct('transition-12', faitDemo('12:00:00', 'NON_CONFORMITE', 'TRANSITION', 'travail-8')),
    },
    consequences: ['Travail de 8 h à 12 h : 4 h.', 'NC de 12 h à 17 h : 5 h.'],
  });

const cibleEchue = (): ScenarioConflits =>
  scenarioGuide({
    suivi: 'demo-cible-echue',
    ancre: 'nc-23',
    numero: 48,
    explication: 'La NC de 23 h vise le travail A échu à 21 h, alors que le travail B a commencé à 22 h.',
    journal: [
      pointageDemo('debut-8', faitDemo('08:00:00', 'DEBUT', 'OUVERTURE'), 'travail-8'),
      pointageDemo('debut-22', faitDemo('22:00:00', 'DEBUT', 'OUVERTURE'), 'travail-22'),
      pointageDemo('nc-23', faitDemo('23:00:00', 'NON_CONFORMITE', 'TRANSITION', 'travail-8'), 'nc-23'),
    ],
    activites: [
      activite('travail-8', 'Travail A, échu à 21 h', '13 h', 'ECHUE'),
      activite('travail-22', 'Travail B de 22 h à 23 h', '1 h'),
      activite('nc-23', 'NC ouverte à 23 h', '13 h', 'ECHUE'),
    ],
    choix: {
      id: 'rattacher-reprise',
      libelle: 'La NC concernait la reprise de 22 h',
      explication: 'Rattacher la transition au travail B en conservant le trou de 21 h à 22 h.',
      saisie: SaisieActe.correct('nc-23', faitDemo('23:00:00', 'NON_CONFORMITE', 'TRANSITION', 'travail-22')),
    },
    consequences: [
      'Travail A de 8 h à 21 h : 13 h, fin automatique.',
      'Aucune activité de 21 h à 22 h.',
      'Travail B de 22 h à 23 h : 1 h.',
    ],
  });

const regularisation = (): ScenarioConflits =>
  scenarioGuide({
    suivi: 'demo-regularisation',
    ancre: 'nc-22',
    numero: 49,
    explication: 'La NC à 22 h contredit la fin du travail à 23 h régularisée par le gestionnaire.',
    journal: [
      pointageDemo('debut-8', faitDemo('08:00:00', 'DEBUT', 'OUVERTURE'), 'travail-8'),
      pointageDemo('nc-22', faitDemo('22:00:00', 'NON_CONFORMITE', 'TRANSITION', 'travail-8'), 'nc-22'),
      {
        ...pointageDemo('fin-regularisee-23', faitDemo('23:00:00', 'FIN', 'FIN', 'travail-8')),
        regularisation: true,
        auteur: 'Gestionnaire de démonstration',
        enregistre: '2026-09-16T08:00:00+02:00',
      },
    ],
    activitesInitiales: [
      activite('travail-8', 'Travail commencé à 8 h', 'À résoudre', 'A_RESOUDRE'),
      activite('nc-22', 'NC commencée à 22 h', 'À résoudre', 'A_RESOUDRE'),
    ],
    activites: [activite('travail-8', 'Travail de 8 h à 23 h', '15 h'), activite('nc-22', 'NC annulée', 'Annulée', 'ANNULEE')],
    choix: {
      id: 'conserver-fin-regularisee',
      libelle: 'La transition en NC était erronée',
      explication: 'Annuler uniquement la transition et conserver la décision régularisée.',
      saisie: SaisieActe.cancel('nc-22'),
    },
    consequences: ['Travail de 8 h à 23 h : 15 h.', 'La fin régularisée reste conservée ; la transition en NC est annulée.'],
  });

export const matriceConflits = (): readonly ScenarioConflits[] => [
  transition(),
  deuxFins(),
  avantOuverture(),
  ouvertureAnnulee(),
  memeCategorie(),
  cibleEchue(),
  regularisation(),
];

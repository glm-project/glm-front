import { SaisieActe } from '../../domain/acte/SaisieActe';
import { ChoixGuide } from '../../domain/dossier/DossierConflit';
import { ElementConflitId } from '../../domain/dossier/ElementConflitId';
import { SuiviConflitId } from '../../domain/dossier/SuiviConflitId';
import { activite, scenarioGuide } from './MatriceConflits';
import { ScenarioConflits } from './ScenarioConflits';
import { faitDemo, pointageDemo, premierDossier } from './ScenariosConflits';

export const scenarioRetroactif = (): ScenarioConflits => {
  const initial = premierDossier();
  const rattacherFin: ChoixGuide = {
    id: 'rattacher-fin-reprise',
    libelle: 'La fin concernait le travail repris à 14 h',
    explication: 'Corriger explicitement la cible de la fin vers la reprise régularisée.',
    saisie: SaisieActe.correct('fin-17', faitDemo('17:00:00', 'FIN', 'FIN', 'regularisation-fin-17')),
  };
  return {
    pointages: initial.journal.map(pointage => pointage.id.pointage),
    dossier: {
      ...initial,
      ligne: {
        ...initial.ligne,
        adresse: { ...initial.ligne.adresse, suivi: new SuiviConflitId('demo-retroactif') },
        element: new ElementConflitId('demo-element-50'),
        designation: 'Moule · M-050 — Carter clôturé',
        explication: 'Après insertion de la NC à 12 h, la fin vise encore le travail initial ; la reprise de 14 h manque.',
      },
      cloture: true,
      finCloture: '2026-09-14T18:00:00+02:00',
      choix: [
        {
          id: 'regulariser-reprise',
          libelle: 'Le travail a repris à 14 h',
          explication: 'Régulariser la transition de la NC vers le travail, puis préparer un deuxième acte pour la fin.',
          saisie: SaisieActe.regularise(faitDemo('14:00:00', 'DEBUT', 'TRANSITION', 'nc-12')),
        },
      ],
    },
    resultats: new Map([
      [
        'regulariser-reprise',
        {
          enConflit: true,
          activites: [...initial.activites, activite('regularisation-fin-17', 'Reprise régularisée à 14 h', 'À résoudre', 'A_RESOUDRE')],
          consequences: [
            'La reprise à 14 h est régularisée.',
            'La fin de 17 h vise encore le travail initial : le conflit reste à résoudre.',
          ],
          choix: [rattacherFin],
          continuations: [],
        },
      ],
      [
        'rattacher-fin-reprise',
        {
          enConflit: false,
          activites: [
            activite('travail-8', 'Travail de 8 h à 12 h', '4 h'),
            activite('nc-12', 'NC de 12 h à 14 h', '2 h'),
            activite('regularisation-fin-17', 'Reprise de 14 h à 17 h', '3 h'),
          ],
          consequences: [
            'Travail de 8 h à 12 h : 4 h.',
            'NC de 12 h à 14 h : 2 h.',
            'Reprise de 14 h à 17 h : 3 h.',
            'La clôture reste acquise.',
          ],
          choix: [],
          continuations: [],
        },
      ],
    ]),
  };
};

export const scenariosRetroactifs = (): readonly ScenarioConflits[] => {
  const retroactif = scenarioRetroactif();
  const finTour = { ...faitDemo('10:00:00', 'FIN', 'FIN', 'travail-tour'), poste: 'poste-tour' };
  const independant = scenarioGuide({
    suivi: 'demo-retroactif',
    ancre: 'fin-tour-10-bis',
    numero: 50,
    poste: 'Tournage · Haas',
    cloture: true,
    explication: 'Deux fins à la même heure visent un travail indépendant sur le tour.',
    journal: [
      pointageDemo('debut-tour-9', { ...faitDemo('09:00:00', 'DEBUT', 'OUVERTURE'), poste: 'poste-tour' }, 'travail-tour'),
      { ...pointageDemo('fin-tour-10', finTour), enregistre: '2026-09-15T09:00:00+02:00' },
      { ...pointageDemo('fin-tour-10-bis', finTour), enregistre: '2026-09-14T10:05:00+02:00' },
    ],
    activitesInitiales: [activite('travail-tour', 'Travail indépendant commencé à 9 h', 'À résoudre', 'A_RESOUDRE')],
    activites: [activite('travail-tour', 'Travail indépendant de 9 h à 10 h', '1 h')],
    choix: {
      id: 'annuler-fin-tour',
      libelle: 'La seconde fin sur le tour était une erreur',
      explication: 'Annuler explicitement la seconde fin, sans toucher à la première séquence.',
      saisie: SaisieActe.cancel('fin-tour-10-bis'),
    },
    consequences: [
      'Travail indépendant de 9 h à 10 h : 1 h.',
      'Les deux fins ont la même heure métier ; leur réception ne choisit pas la fin conservée.',
    ],
  });
  const journal = [...retroactif.dossier.journal, ...independant.dossier.journal];
  return [
    { ...retroactif, dossier: { ...retroactif.dossier, journal } },
    { ...independant, dossier: { ...independant.dossier, journal } },
  ];
};

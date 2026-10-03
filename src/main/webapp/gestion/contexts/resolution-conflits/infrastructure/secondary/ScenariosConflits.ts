import { FaitPropose } from '../../domain/acte/ActeResolution';
import { SaisieActe } from '../../domain/acte/SaisieActe';
import { ActiviteConflitId } from '../../domain/dossier/ActiviteConflitId';
import { DossierConflit, LigneConflit, PointageConflit } from '../../domain/dossier/DossierConflit';
import { ElementConflitId } from '../../domain/dossier/ElementConflitId';
import { PointageConflitId } from '../../domain/dossier/PointageConflitId';
import { SuiviConflitId } from '../../domain/dossier/SuiviConflitId';
import { ScenarioConflits } from './ScenarioConflits';

export const premiereLigne = (): LigneConflit => ({
  adresse: { suivi: new SuiviConflitId('demo-remplacement'), pointage: new PointageConflitId('fin-17') },
  element: new ElementConflitId('demo-moule-42'),
  designation: 'Moule · M-042 — Carter moteur',
  operateur: 'Camille Martin',
  poste: 'Fraisage · DMU 50',
  date: '2026-09-14',
  explication: 'Fin à 17 h — vise le travail commencé à 8 h, terminé par le passage en NC à 12 h.',
  nombrePointages: 3,
});

export const faitDemo = (heure: string, type: FaitPropose['type'], intention: FaitPropose['intention'], cible = ''): FaitPropose => ({
  type,
  intention,
  activiteVisee: cible,
  operateur: 'op-camille',
  poste: 'poste-dmu',
  instant: `2026-09-14T${heure}+02:00`,
});

export const pointageDemo = (id: string, fait: FaitPropose, activite?: string): PointageConflit => ({
  id: new PointageConflitId(id),
  fait,
  auteur: 'Pupitre atelier',
  enregistre: '2026-09-15T07:00:00+02:00',
  regularisation: false,
  ...(activite === undefined ? {} : { activiteCreee: new ActiviteConflitId(activite) }),
});

export const premierDossier = (): DossierConflit => ({
  ligne: premiereLigne(),
  version: 1,
  cloture: false,
  engagement: '2026-09-14T07:00:00+02:00',
  journal: [
    pointageDemo('debut-8', faitDemo('08:00:00', 'DEBUT', 'OUVERTURE'), 'travail-8'),
    pointageDemo('nc-12', faitDemo('12:00:00', 'NON_CONFORMITE', 'TRANSITION', 'travail-8'), 'nc-12'),
    pointageDemo('fin-17', faitDemo('17:00:00', 'FIN', 'FIN', 'travail-8')),
  ],
  activites: [
    { id: new ActiviteConflitId('travail-8'), libelle: 'Travail commencé à 8 h, remplacé à 12 h', etat: 'A_RESOUDRE', temps: 'À résoudre' },
    { id: new ActiviteConflitId('nc-12'), libelle: 'NC commencée à 12 h', etat: 'A_RESOUDRE', temps: 'À résoudre' },
  ],
  choix: [
    {
      id: 'rattacher-fin',
      libelle: 'La fin concernait la NC',
      explication: 'Corriger la cible de la fin de 17 h vers la NC commencée à 12 h.',
      saisie: SaisieActe.correct('fin-17', faitDemo('17:00:00', 'FIN', 'FIN', 'nc-12')),
    },
    {
      id: 'annuler-transition',
      libelle: 'Le passage en NC était une erreur',
      explication: 'Annuler explicitement le pointage de 12 h et conserver la fin du travail à 17 h.',
      saisie: SaisieActe.cancel('nc-12'),
    },
  ],
  enConflit: true,
  consequences: [],
  continuations: [],
});

export const scenariosConflits = (): readonly ScenarioConflits[] => {
  const dossier = premierDossier();
  return [
    {
      dossier,
      pointages: dossier.journal.map(pointage => pointage.id.pointage),
      resultats: new Map([
        [
          'rattacher-fin',
          {
            enConflit: false,
            activites: dossier.activites.map(activite => ({
              ...activite,
              etat: 'TERMINEE',
              temps: activite.id.activite === 'travail-8' ? '4 h' : '5 h',
            })),
            consequences: ['Travail de 8 h à 12 h : 4 h.', 'NC de 12 h à 17 h : 5 h.'],
            choix: [],
            continuations: [],
          },
        ],
        [
          'annuler-transition',
          {
            enConflit: false,
            activites: dossier.activites.map(activite => ({
              ...activite,
              libelle: activite.id.activite === 'travail-8' ? 'Travail de 8 h à 17 h' : 'NC annulée',
              etat: activite.id.activite === 'travail-8' ? 'TERMINEE' : 'ANNULEE',
              temps: activite.id.activite === 'travail-8' ? '9 h' : 'Annulée',
            })),
            consequences: ['Travail de 8 h à 17 h : 9 h.', 'Le passage en NC est annulé.'],
            choix: [],
            continuations: [],
          },
        ],
      ]),
    },
  ];
};

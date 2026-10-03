import { DossierConflit } from '../../domain/dossier/DossierConflit';
import { ElementConflitId } from '../../domain/dossier/ElementConflitId';
import { PointageConflitId } from '../../domain/dossier/PointageConflitId';
import { SuiviConflitId } from '../../domain/dossier/SuiviConflitId';
import { activite } from './MatriceConflits';
import { faitDemo, pointageDemo, premierDossier } from './ScenariosConflits';

const temoin = (
  suivi: string,
  pointage: string,
  journal: DossierConflit['journal'],
  activites: DossierConflit['activites'],
): DossierConflit => ({
  ...premierDossier(),
  ligne: {
    ...premierDossier().ligne,
    adresse: { suivi: new SuiviConflitId(suivi), pointage: new PointageConflitId(pointage) },
    element: new ElementConflitId(suivi),
    designation: `Témoin · ${suivi}`,
    nombrePointages: journal.length,
    explication: 'Journal cohérent ou anomalie de fin automatique isolée, hors résolution des conflits.',
  },
  journal,
  activites,
  enConflit: false,
  choix: [],
});

export const temoinsConflits = (): readonly DossierConflit[] => [
  temoin(
    'temoin-fin-ciblee',
    'fin-17',
    [
      pointageDemo('debut-8', faitDemo('08:00:00', 'DEBUT', 'OUVERTURE'), 'travail-8'),
      pointageDemo('nc-12', faitDemo('12:00:00', 'NON_CONFORMITE', 'TRANSITION', 'travail-8'), 'nc-12'),
      pointageDemo('fin-17', faitDemo('17:00:00', 'FIN', 'FIN', 'nc-12')),
    ],
    [activite('travail-8', 'Travail de 8 h à 12 h', '4 h'), activite('nc-12', 'NC de 12 h à 17 h', '5 h')],
  ),
  temoin(
    'temoin-fin-differee',
    'fin-17',
    [
      pointageDemo('debut-8', faitDemo('08:00:00', 'DEBUT', 'OUVERTURE'), 'travail-8'),
      { ...pointageDemo('fin-17', faitDemo('17:00:00', 'FIN', 'FIN', 'travail-8')), enregistre: '2026-09-15T23:00:00+02:00' },
    ],
    [activite('travail-8', 'Travail, fin reçue le lendemain', '9 h')],
  ),
  temoin(
    'temoin-transition-echue',
    'nc-23',
    [
      pointageDemo('debut-8', faitDemo('08:00:00', 'DEBUT', 'OUVERTURE'), 'travail-8'),
      pointageDemo('nc-23', faitDemo('23:00:00', 'NON_CONFORMITE', 'TRANSITION', 'travail-8'), 'nc-23'),
    ],
    [
      activite('travail-8', 'Travail échu à 21 h', '13 h', 'ECHUE'),
      activite('nc-23', 'NC commencée à 23 h, trou de 21 h à 23 h conservé', '13 h', 'ECHUE'),
    ],
  ),
  temoin(
    'temoin-fin-automatique',
    'debut-8',
    [pointageDemo('debut-8', faitDemo('08:00:00', 'DEBUT', 'OUVERTURE'), 'travail-8')],
    [activite('travail-8', 'Travail échu à 21 h, fin automatique isolée', '13 h', 'ECHUE')],
  ),
];

import { ActiviteDeSupervision } from '../../../domain/activite/ActiviteDeSupervision';
import { CategorieActivite } from '../../../domain/activite/CategorieActivite';
import { IdentifiantActivite } from '../../../domain/activite/IdentifiantActivite';
import { Instant } from '../../../domain/instant/Instant';
import { IdentifiantOperateur } from '../../../domain/operateur/IdentifiantOperateur';
import { OperateurDeclare } from '../../../domain/operateur/OperateurDeclare';
import { FenetreDePresence } from '../../../domain/presence/FenetreDePresence';
import { JourneeDeTravail } from '../../../domain/presence/JourneeDeTravail';
import { DonneesDeSupervision, DonneesDeSupervisionPort } from '../../../domain/supervision/DonneesDeSupervisionPort';

const TRAVAIL = new CategorieActivite('FABRICATION');
const NON_CONFORMITE = new CategorieActivite('NC');

interface ActiviteDeDemonstration {
  readonly operateur: string;
  readonly element: string;
  readonly poste?: string;
  readonly categorie: CategorieActivite;
  readonly minutes: number;
}

const OPERATEURS: readonly (readonly [string, string, string])[] = [
  ['op-aubert', 'Aubert', 'Lucas'],
  ['op-benali', 'Benali', 'Samir'],
  ['op-chevalier', 'Chevalier', 'Mathis'],
  ['op-dumas', 'Dumas', 'Julien'],
  ['op-fabre', 'Fabre', 'Lucie'],
  ['op-garnier', 'Garnier', 'Thomas'],
  ['op-lefevre', 'Lefèvre', 'Sophie'],
  ['op-marchand', 'Marchand', 'Kevin'],
  ['op-morel', 'Morel', 'Inès'],
  ['op-perrin', 'Perrin', 'Loïc'],
  ['op-roux', 'Roux', 'Nathalie'],
  ['op-schmitt', 'Schmitt', 'Yanis'],
  ['op-vidal', 'Vidal', 'Hugo'],
];

const ACTIVITES: readonly ActiviteDeDemonstration[] = [
  { operateur: 'op-aubert', element: 'Moule 1015', poste: 'Fraiseuse 1', categorie: TRAVAIL, minutes: 125 },
  { operateur: 'op-aubert', element: 'OF 3004', poste: 'Tour 1', categorie: TRAVAIL, minutes: 30 },
  { operateur: 'op-benali', element: 'Moule 1016', poste: 'Erodeuse F', categorie: TRAVAIL, minutes: 115 },
  { operateur: 'op-benali', element: 'Moule 1016', poste: 'Erodeuse G', categorie: TRAVAIL, minutes: 90 },
  { operateur: 'op-chevalier', element: 'OF 3004', poste: 'Tour 3', categorie: TRAVAIL, minutes: 65 },
  { operateur: 'op-dumas', element: 'OF 3002', poste: 'Scie 1', categorie: TRAVAIL, minutes: 120 },
  { operateur: 'op-garnier', element: 'Moule 1017', poste: 'Fraiseuse 2', categorie: NON_CONFORMITE, minutes: 23 },
  { operateur: 'op-marchand', element: 'OF 3001', poste: 'Fraiseuse 2', categorie: TRAVAIL, minutes: 1130 },
  { operateur: 'op-morel', element: 'OF 3005', poste: 'Fil 1', categorie: TRAVAIL, minutes: 150 },
  { operateur: 'op-morel', element: 'Moule 1015', poste: 'Fil 2', categorie: NON_CONFORMITE, minutes: 50 },
  { operateur: 'op-perrin', element: 'OF 3006', poste: 'Tour 1', categorie: TRAVAIL, minutes: 170 },
  { operateur: 'op-vidal', element: 'OF-2026-000048', categorie: TRAVAIL, minutes: 8 },
];

const buildDemonstration = (instantDemonstration: number): DonneesDeSupervision => {
  const instantBefore = (minutes: number): Instant => new Instant(new Date(instantDemonstration - minutes * 60_000).toISOString());
  const fenetre = (debut: number, fin?: number): FenetreDePresence =>
    fin === undefined ? new FenetreDePresence(instantBefore(debut)) : new FenetreDePresence(instantBefore(debut), instantBefore(fin));
  const operateur = (id: string): IdentifiantOperateur => new IdentifiantOperateur(id);
  return {
    operateurs: OPERATEURS.map(([id, nom, prenom]) => new OperateurDeclare({ id: operateur(id), nom, prenom })),
    journees: [
      JourneeDeTravail.open(operateur('op-aubert'), 'PRESENT', [fenetre(132)]),
      JourneeDeTravail.open(operateur('op-benali'), 'PRESENT', [fenetre(128)]),
      JourneeDeTravail.open(operateur('op-chevalier'), 'PRESENT', [fenetre(82)]),
      JourneeDeTravail.open(operateur('op-dumas'), 'EN_PAUSE', [fenetre(145, 10)]),
      JourneeDeTravail.open(operateur('op-garnier'), 'PRESENT', [fenetre(99)]),
      JourneeDeTravail.open(operateur('op-lefevre'), 'PRESENT', [fenetre(75)]),
      JourneeDeTravail.open(operateur('op-marchand'), 'PRESENT', [fenetre(1626, 1270), fenetre(1225)]),
      JourneeDeTravail.open(operateur('op-morel'), 'PRESENT', [fenetre(159)]),
      JourneeDeTravail.closed(operateur('op-perrin'), [fenetre(180, 40)]),
      JourneeDeTravail.open(operateur('op-roux'), 'EN_PAUSE', [fenetre(130, 15)]),
      JourneeDeTravail.open(operateur('op-schmitt'), 'EN_PAUSE'),
      JourneeDeTravail.open(operateur('op-vidal'), 'PRESENT', [fenetre(12)]),
    ],
    activites: ACTIVITES.map(
      (activite, index) =>
        new ActiviteDeSupervision({
          id: new IdentifiantActivite(`act-${String(index + 1)}`),
          operateurId: operateur(activite.operateur),
          nom: activite.element,
          categorie: activite.categorie,
          debut: instantBefore(activite.minutes),
          ...(activite.poste === undefined ? {} : { poste: activite.poste }),
        }),
    ),
  };
};

export class InMemoryDonneesDeSupervision extends DonneesDeSupervisionPort {
  // Pris une seule fois : relire l'horloge à chaque lecture ferait avancer tous les « depuis » à chaque actualisation.
  private readonly donnees = buildDemonstration(Date.now());

  read(): Promise<DonneesDeSupervision> {
    return Promise.resolve(this.donnees);
  }
}

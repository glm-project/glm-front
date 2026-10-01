import { ActiviteDeSupervision } from '../../../domain/activite/ActiviteDeSupervision';
import { CategorieActivite } from '../../../domain/activite/CategorieActivite';
import { ElementTravaille } from '../../../domain/activite/ElementTravaille';
import { IdentifiantActivite } from '../../../domain/activite/IdentifiantActivite';
import { IdentifiantSequence } from '../../../domain/activite/IdentifiantSequence';
import { ObjetDeLActivite } from '../../../domain/activite/ObjetDeLActivite';
import { ReferenceDElement } from '../../../domain/activite/ReferenceDElement';
import { SequenceEnConflit } from '../../../domain/activite/SequenceEnConflit';
import { Instant } from '../../../domain/instant/Instant';
import { IdentifiantOperateur } from '../../../domain/operateur/IdentifiantOperateur';
import { OperateurDeclare } from '../../../domain/operateur/OperateurDeclare';
import { IdentifiantPoste } from '../../../domain/poste/IdentifiantPoste';
import { NatureDeTravail } from '../../../domain/poste/NatureDeTravail';
import { PosteDeSupervision } from '../../../domain/poste/PosteDeSupervision';
import { DonneesDeSupervision, DonneesDeSupervisionPort } from '../../../domain/supervision/DonneesDeSupervisionPort';

const TRAVAIL = new CategorieActivite('TRAVAIL');
const NON_CONFORMITE = new CategorieActivite('NON_CONFORMITE');

const moule = (reference: string, nom: string): ElementTravaille =>
  new ElementTravaille({ type: 'PRODUIT', nom, reference: new ReferenceDElement(reference) });
const ordreDeFabrication = (reference: string, nom: string): ElementTravaille =>
  new ElementTravaille({ type: 'ORDRE_DE_FABRICATION', nom, reference: new ReferenceDElement(reference) });

const MOULE_1015 = moule('1015', 'PRD-2026-000001');
const MOULE_1016 = moule('1016', 'PRD-2026-000002');
const MOULE_1017 = moule('1017', 'PRD-2026-000003');
const OF_3001 = ordreDeFabrication('3001', 'OF-2026-000039');
const OF_3004 = ordreDeFabrication('3004', 'OF-2026-000042');
const OF_3005 = ordreDeFabrication('3005', 'OF-2026-000043');
const OF_3006 = ordreDeFabrication('3006', 'OF-2026-000044');
const OF_PERSO = new ElementTravaille({ type: 'ORDRE_DE_FABRICATION', nom: 'OF Perso' });
const OF_SANS_REFERENCE = new ElementTravaille({ type: 'ORDRE_DE_FABRICATION', nom: 'OF-2026-000048' });

const poste = (id: string, libelle: string, nature: string): PosteDeSupervision =>
  new PosteDeSupervision({ id: new IdentifiantPoste(id), libelle, nature: new NatureDeTravail(nature) });

const FRAISEUSE_1 = poste('poste-fraiseuse-1', 'Fraiseuse 1', 'Fraisage');
const FRAISEUSE_2 = poste('poste-fraiseuse-2', 'Fraiseuse 2', 'Fraisage');
const TOUR_1 = poste('poste-tour-1', 'Tour 1', 'Tournage');
const TOUR_3 = poste('poste-tour-3', 'Tour 3', 'Tournage');
const ERODEUSE_F = poste('poste-erodeuse-f', 'Erodeuse F', 'Érosion');
const ERODEUSE_G = poste('poste-erodeuse-g', 'Erodeuse G', 'Érosion');
const FIL_1 = poste('poste-fil-1', 'Fil 1', 'Découpe à fil');
const FIL_2 = poste('poste-fil-2', 'Fil 2', 'Découpe à fil');

interface ActiviteDeDemonstration {
  readonly operateur: string;
  readonly objet: ObjetDeLActivite;
  readonly poste?: PosteDeSupervision;
  readonly categorie: CategorieActivite;
  readonly minutes: number;
}

const OPERATEURS: readonly (readonly [string, string, string, readonly string[]])[] = [
  ['op-aubert', 'Aubert', 'Lucas', ['Fraisage', 'Tournage', 'Érosion']],
  ['op-benali', 'Benali', 'Samir', ['Érosion', 'Découpe à fil']],
  ['op-chevalier', 'Chevalier', 'Mathis', ['Tournage']],
  ['op-dumas', 'Dumas', 'Julien', ['Sciage', 'Tournage']],
  ['op-fabre', 'Fabre', 'Lucie', ['Fraisage']],
  ['op-garnier', 'Garnier', 'Thomas', ['Fraisage']],
  ['op-lefevre', 'Lefèvre', 'Sophie', ['Dessin']],
  ['op-marchand', 'Marchand', 'Kevin', ['Fraisage']],
  ['op-morel', 'Morel', 'Inès', ['Découpe à fil', 'Érosion']],
  ['op-perrin', 'Perrin', 'Loïc', ['Tournage']],
  ['op-roux', 'Roux', 'Nathalie', ['Soudage']],
  ['op-schmitt', 'Schmitt', 'Yanis', ['Fraisage']],
  ['op-vidal', 'Vidal', 'Hugo', []],
];

const ACTIVITES: readonly ActiviteDeDemonstration[] = [
  { operateur: 'op-aubert', objet: MOULE_1015, poste: FRAISEUSE_1, categorie: TRAVAIL, minutes: 125 },
  { operateur: 'op-aubert', objet: OF_3004, poste: TOUR_1, categorie: TRAVAIL, minutes: 30 },
  { operateur: 'op-benali', objet: MOULE_1016, poste: ERODEUSE_F, categorie: TRAVAIL, minutes: 115 },
  { operateur: 'op-benali', objet: MOULE_1016, poste: ERODEUSE_G, categorie: TRAVAIL, minutes: 90 },
  { operateur: 'op-chevalier', objet: OF_PERSO, poste: TOUR_3, categorie: TRAVAIL, minutes: 65 },
  { operateur: 'op-garnier', objet: MOULE_1017, poste: FRAISEUSE_2, categorie: NON_CONFORMITE, minutes: 23 },
  { operateur: 'op-marchand', objet: OF_3001, poste: FRAISEUSE_2, categorie: TRAVAIL, minutes: 1130 },
  { operateur: 'op-morel', objet: OF_3005, poste: FIL_1, categorie: TRAVAIL, minutes: 150 },
  { operateur: 'op-morel', objet: MOULE_1015, poste: FIL_2, categorie: NON_CONFORMITE, minutes: 50 },
  { operateur: 'op-vidal', objet: OF_SANS_REFERENCE, categorie: TRAVAIL, minutes: 8 },
];

const buildDemonstration = (instantDemonstration: number): DonneesDeSupervision => {
  const instantBefore = (minutes: number): Instant => new Instant(new Date(instantDemonstration - minutes * 60_000).toISOString());
  const operateur = (id: string): IdentifiantOperateur => new IdentifiantOperateur(id);
  return {
    evaluation: new Instant(new Date(instantDemonstration).toISOString()),
    sequencesEnConflit: [
      new SequenceEnConflit({
        id: new IdentifiantSequence('sequence-perrin'),
        operateurId: operateur('op-perrin'),
        poste: TOUR_1,
        activites: [
          new ActiviteDeSupervision({
            id: new IdentifiantActivite('act-perrin-a-resoudre'),
            operateurId: operateur('op-perrin'),
            objet: OF_3006,
            categorie: TRAVAIL,
            debut: instantBefore(170),
            etat: 'A_RESOUDRE',
            poste: TOUR_1,
          }),
        ],
      }),
      new SequenceEnConflit({
        id: new IdentifiantSequence('sequence-morel'),
        operateurId: operateur('op-morel'),
        poste: ERODEUSE_F,
        activites: [
          new ActiviteDeSupervision({
            id: new IdentifiantActivite('act-morel-a-resoudre'),
            operateurId: operateur('op-morel'),
            objet: OF_PERSO,
            categorie: NON_CONFORMITE,
            debut: instantBefore(840),
            etat: 'A_RESOUDRE',
            poste: ERODEUSE_F,
          }),
        ],
      }),
      new SequenceEnConflit({ id: new IdentifiantSequence('sequence-schmitt'), operateurId: operateur('op-schmitt'), activites: [] }),
    ],
    operateurs: OPERATEURS.map(
      ([id, nom, prenom, metiers]) =>
        new OperateurDeclare({ id: operateur(id), nom, prenom, metiers: metiers.map(metier => new NatureDeTravail(metier)) }),
    ),
    activites: ACTIVITES.map(
      (activite, index) =>
        new ActiviteDeSupervision({
          id: new IdentifiantActivite(`act-${String(index + 1)}`),
          operateurId: operateur(activite.operateur),
          objet: activite.objet,
          categorie: activite.categorie,
          debut: instantBefore(activite.minutes),
          etat: 'EN_COURS',
          ...(activite.poste === undefined ? {} : { poste: activite.poste }),
        }),
    ),
  };
};

export class InMemoryDonneesDeSupervision extends DonneesDeSupervisionPort {
  private readonly donnees: DonneesDeSupervision;

  constructor(donnees = buildDemonstration(Date.now())) {
    super();
    this.donnees = donnees;
  }

  read(): Promise<DonneesDeSupervision> {
    return Promise.resolve({ ...this.donnees, evaluation: new Instant(new Date().toISOString()) });
  }
}

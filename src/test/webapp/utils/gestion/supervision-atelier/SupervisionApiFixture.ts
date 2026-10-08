import { components } from '@/app/generated/schema';

type RestSupervision = components['schemas']['RestSupervisionDAtelier'];
type RestActivite = components['schemas']['RestActiviteDeSupervision'];
type RestDescription = components['schemas']['RestDescriptionDActiviteDeSupervision'];
type RestElement = components['schemas']['RestElementDeSupervision'];
type RestPoste = components['schemas']['RestPosteDeSupervision'];
type RestOperateur = components['schemas']['RestOperateurDeSupervision'];

const instantFixture = (heure: number, minute = 0, jour = 24): string => new Date(2026, 8, jour, heure, minute).toISOString();

export const EVALUATION_SUPERVISION = instantFixture(9, 10);

const moule = (reference: string, nom: string): RestElement => ({
  id: `moule-${reference}`,
  categorie: 'MOULE',
  type: 'PRODUIT',
  nom,
  reference,
});
const of = (reference: string, nom: string): RestElement => ({
  id: `of-${reference}`,
  categorie: 'OF',
  type: 'ORDRE_DE_FABRICATION',
  nom,
  reference,
});
const poste = (id: string, libelle: string, nature: string): RestPoste => ({ id, libelle, nature });

const MOULE_1015 = moule('1015', 'PRD-2026-000001');
const MOULE_1016 = moule('1016', 'PRD-2026-000002');
const MOULE_1017 = moule('1017', 'PRD-2026-000003');
const OF_3001 = of('3001', 'OF-2026-000039');
const OF_3004 = of('3004', 'OF-2026-000042');
const OF_3005 = of('3005', 'OF-2026-000043');
const OF_3006 = of('3006', 'OF-2026-000044');
const OF_PERSO: RestElement = { id: 'of-perso', categorie: 'OF', type: 'ORDRE_DE_FABRICATION', nom: 'OF Perso' };
const OF_SANS_REFERENCE: RestElement = { id: 'of-sans-reference', categorie: 'OF', type: 'ORDRE_DE_FABRICATION', nom: 'OF-2026-000048' };

const FRAISEUSE_1 = poste('poste-fraiseuse-1', 'Fraiseuse 1', 'Fraisage');
const FRAISEUSE_2 = poste('poste-fraiseuse-2', 'Fraiseuse 2', 'Fraisage');
const TOUR_1 = poste('poste-tour-1', 'Tour 1', 'Tournage');
const TOUR_3 = poste('poste-tour-3', 'Tour 3', 'Tournage');
const ERODEUSE_F = poste('poste-erodeuse-f', 'Erodeuse F', 'Érosion');
const ERODEUSE_G = poste('poste-erodeuse-g', 'Erodeuse G', 'Érosion');
const FIL_1 = poste('poste-fil-1', 'Fil 1', 'Découpe à fil');
const FIL_2 = poste('poste-fil-2', 'Fil 2', 'Découpe à fil');

const operateur = (id: string, nom: string, prenom: string, metiers: string[]): RestOperateur => ({ id, nom, prenom, metiers });

const description = (
  id: string,
  operateurId: string,
  element: RestElement,
  debut: string,
  echeance: string,
  poste?: RestPoste,
): RestDescription => ({
  id,
  operateurId,
  element,
  debut,
  echeance,
  ...(poste === undefined ? {} : { poste }),
  categorie: 'TRAVAIL',
});

const activite = (
  id: string,
  operateurId: string,
  element: RestElement,
  debut: string,
  echeance: string,
  poste?: RestPoste,
): RestActivite => ({
  ...description(id, operateurId, element, debut, echeance, poste),
  etat: 'EN_COURS',
});

export const supervisionFixture = (): RestSupervision => ({
  evaluation: EVALUATION_SUPERVISION,
  operateurs: [
    operateur('op-aubert', 'Aubert', 'Lucas', ['Fraisage', 'Tournage', 'Érosion']),
    operateur('op-benali', 'Benali', 'Samir', ['Érosion', 'Découpe à fil']),
    operateur('op-chevalier', 'Chevalier', 'Mathis', ['Tournage']),
    operateur('op-dumas', 'Dumas', 'Julien', ['Sciage', 'Tournage']),
    operateur('op-fabre', 'Fabre', 'Lucie', ['Fraisage']),
    operateur('op-garnier', 'Garnier', 'Thomas', ['Fraisage']),
    operateur('op-lefevre', 'Lefèvre', 'Sophie', ['Dessin']),
    operateur('op-marchand', 'Marchand', 'Kevin', ['Fraisage']),
    operateur('op-morel', 'Morel', 'Inès', ['Découpe à fil', 'Érosion']),
    operateur('op-perrin', 'Perrin', 'Loïc', ['Tournage']),
    operateur('op-roux', 'Roux', 'Nathalie', ['Soudage']),
    operateur('op-schmitt', 'Schmitt', 'Yanis', ['Fraisage']),
    operateur('op-vidal', 'Vidal', 'Hugo', []),
  ],
  activites: [
    activite('act-aubert-1015', 'op-aubert', MOULE_1015, instantFixture(7, 5), instantFixture(20, 5), FRAISEUSE_1),
    activite('act-aubert-3004', 'op-aubert', OF_3004, instantFixture(8, 40), instantFixture(21, 40), TOUR_1),
    activite('act-benali-f', 'op-benali', MOULE_1016, instantFixture(7, 15), instantFixture(20, 15), ERODEUSE_F),
    activite('act-benali-g', 'op-benali', MOULE_1016, instantFixture(7, 40), instantFixture(20, 40), ERODEUSE_G),
    activite('act-chevalier', 'op-chevalier', OF_PERSO, instantFixture(8, 5), instantFixture(21, 5), TOUR_3),
    {
      ...activite('act-garnier', 'op-garnier', MOULE_1017, instantFixture(8, 47), instantFixture(21, 47), FRAISEUSE_2),
      categorie: 'NON_CONFORMITE',
    },
    {
      ...activite('act-marchand', 'op-marchand', OF_3001, instantFixture(14, 20, 23), instantFixture(3, 20), FRAISEUSE_2),
      etat: 'TERMINEE_AUTOMATIQUEMENT',
      finRetenue: instantFixture(3, 20),
    },
    activite('act-morel-3005', 'op-morel', OF_3005, instantFixture(6, 40), instantFixture(19, 40), FIL_1),
    {
      ...activite('act-morel-1015', 'op-morel', MOULE_1015, instantFixture(8, 20), instantFixture(21, 20), FIL_2),
      categorie: 'NON_CONFORMITE',
    },
    activite('act-vidal', 'op-vidal', OF_SANS_REFERENCE, instantFixture(9, 2), instantFixture(22, 2)),
  ],
  sequencesEnConflit: [
    {
      id: 'sequence-perrin',
      operateurId: 'op-perrin',
      poste: TOUR_1,
      activites: [description('act-perrin-a-resoudre', 'op-perrin', OF_3006, instantFixture(6, 20), instantFixture(19, 20), TOUR_1)],
    },
    {
      id: 'sequence-morel',
      operateurId: 'op-morel',
      poste: ERODEUSE_F,
      activites: [
        {
          ...description('act-morel-a-resoudre', 'op-morel', OF_PERSO, instantFixture(19, 10, 23), instantFixture(8, 10), ERODEUSE_F),
          categorie: 'NON_CONFORMITE',
        },
      ],
    },
    { id: 'sequence-schmitt', operateurId: 'op-schmitt', activites: [] },
  ],
});

export const updatedSupervisionFixture = (): RestSupervision => ({
  ...supervisionFixture(),
  evaluation: instantFixture(20, 5),
  activites: supervisionFixture().activites.map(activite => {
    if (activite.id === 'act-aubert-1015') {
      return { ...activite, etat: 'TERMINEE_AUTOMATIQUEMENT', finRetenue: instantFixture(20, 5) };
    }
    if (activite.id === 'act-morel-3005') {
      return { ...activite, etat: 'TERMINEE_AUTOMATIQUEMENT', finRetenue: instantFixture(19, 40) };
    }
    return activite;
  }),
});

export class SupervisionApiFixture {
  private response: { statusCode: number; body: RestSupervision | undefined };

  constructor(donnees = supervisionFixture()) {
    this.response = { statusCode: 200, body: donnees };
  }

  intercept(): void {
    cy.intercept('GET', '/api/atelier/supervision', request => request.reply(this.response)).as('supervisionRead');
  }

  replace(donnees: RestSupervision): void {
    this.response = { statusCode: 200, body: donnees };
  }

  fail(): void {
    this.response = { statusCode: 503, body: undefined };
  }
}

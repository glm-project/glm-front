const INSTANT_FIXTURE = new Date(2026, 8, 24, 9, 10).getTime();

const instantFixture = (minutes: number): string => new Date(INSTANT_FIXTURE - minutes * 60_000).toISOString();

const operatorsFixture = [
  { id: 'op-aubert', nom: 'Aubert', prenom: 'Lucas', natures: ['Fraisage', 'Tournage', 'Érosion'], postes: [] },
  { id: 'op-benali', nom: 'Benali', prenom: 'Samir', natures: ['Érosion', 'Découpe à fil'], postes: [] },
  { id: 'op-chevalier', nom: 'Chevalier', prenom: 'Mathis', natures: ['Tournage'], postes: [] },
  { id: 'op-dumas', nom: 'Dumas', prenom: 'Julien', natures: ['Sciage', 'Tournage'], postes: [] },
  { id: 'op-fabre', nom: 'Fabre', prenom: 'Lucie', natures: ['Fraisage'], postes: [] },
  { id: 'op-garnier', nom: 'Garnier', prenom: 'Thomas', natures: ['Fraisage'], postes: [] },
  { id: 'op-lefevre', nom: 'Lefèvre', prenom: 'Sophie', natures: ['Dessin'], postes: [] },
  { id: 'op-marchand', nom: 'Marchand', prenom: 'Kevin', natures: ['Fraisage'], postes: [] },
  { id: 'op-morel', nom: 'Morel', prenom: 'Inès', natures: ['Découpe à fil', 'Érosion'], postes: [] },
  { id: 'op-perrin', nom: 'Perrin', prenom: 'Loïc', natures: ['Tournage'], postes: [] },
  { id: 'op-roux', nom: 'Roux', prenom: 'Nathalie', natures: ['Soudage'], postes: [] },
  { id: 'op-schmitt', nom: 'Schmitt', prenom: 'Yanis', natures: ['Fraisage'], postes: [] },
  { id: 'op-vidal', nom: 'Vidal', prenom: 'Hugo', natures: [], postes: [] },
];

const postesFixture = [
  { id: 'poste-fraiseuse-1', libelle: 'Fraiseuse 1', nature: 'Fraisage' },
  { id: 'poste-fraiseuse-2', libelle: 'Fraiseuse 2', nature: 'Fraisage' },
  { id: 'poste-tour-1', libelle: 'Tour 1', nature: 'Tournage' },
  { id: 'poste-tour-3', libelle: 'Tour 3', nature: 'Tournage' },
  { id: 'poste-erodeuse-f', libelle: 'Erodeuse F', nature: 'Érosion' },
  { id: 'poste-erodeuse-g', libelle: 'Erodeuse G', nature: 'Érosion' },
  { id: 'poste-fil-1', libelle: 'Fil 1', nature: 'Découpe à fil' },
  { id: 'poste-fil-2', libelle: 'Fil 2', nature: 'Découpe à fil' },
];

const operateurFixture = (id: string) => operatorsFixture.find(operateur => operateur.id === id);
const posteFixture = (id: string | undefined) => postesFixture.find(poste => poste.id === id);

interface ActiviteFixture {
  readonly operateur: string;
  readonly reference?: string;
  readonly poste?: string;
  readonly minutes: number;
  readonly categorie?: 'TRAVAIL' | 'NON_CONFORMITE';
  readonly type?: 'PRODUIT' | 'ORDRE_DE_FABRICATION';
  readonly nom?: string;
}

const activitesFixture: readonly ActiviteFixture[] = [
  { operateur: 'op-aubert', reference: '1015', poste: 'poste-fraiseuse-1', minutes: 125 },
  { operateur: 'op-aubert', reference: '3004', poste: 'poste-tour-1', minutes: 30, type: 'ORDRE_DE_FABRICATION' },
  { operateur: 'op-benali', reference: '1016', poste: 'poste-erodeuse-f', minutes: 115 },
  { operateur: 'op-benali', reference: '1016', poste: 'poste-erodeuse-g', minutes: 90 },
  { operateur: 'op-chevalier', nom: 'Travail interne', poste: 'poste-tour-3', minutes: 65 },
  { operateur: 'op-garnier', reference: '1017', poste: 'poste-fraiseuse-2', minutes: 23, categorie: 'NON_CONFORMITE' },
  { operateur: 'op-morel', reference: '3005', poste: 'poste-fil-1', minutes: 150, type: 'ORDRE_DE_FABRICATION' },
  { operateur: 'op-morel', reference: '1015', poste: 'poste-fil-2', minutes: 50, categorie: 'NON_CONFORMITE' },
  { operateur: 'op-perrin', reference: '3006', poste: 'poste-tour-1', minutes: 170, type: 'ORDRE_DE_FABRICATION' },
  { operateur: 'op-vidal', nom: 'OF-2026-000048', minutes: 8, type: 'ORDRE_DE_FABRICATION' },
];

const pageFixture = (content: readonly unknown[]) => ({ content, currentPage: 0, pageSize: 100, totalElementsCount: content.length });

const suivisFixture = activitesFixture.map((activite, index) => ({
  id: `suivi-${String(index)}`,
  element: `element-${String(index)}`,
  nom: activite.nom ?? `Élément ${String(index)}`,
  reference: activite.reference,
  type: activite.type ?? 'PRODUIT',
  etat: 'EN_COURS',
  engageLe: instantFixture(2000),
  engagePar: 'gestionnaire',
  evaluation: new Date(INSTANT_FIXTURE).toISOString(),
  conflits: [],
  activitesEnCours: [
    {
      ouverture: `activite-${String(index)}`,
      depuis: instantFixture(activite.minutes),
      echeance: instantFixture(activite.minutes - 780),
      categorie: activite.categorie ?? 'TRAVAIL',
      operateur: operateurFixture(activite.operateur),
      poste: posteFixture(activite.poste),
    },
  ],
}));

const venuesFixture = [
  ['op-aubert', 132],
  ['op-benali', 128],
  ['op-chevalier', 82],
  ['op-dumas', 145],
  ['op-garnier', 99],
  ['op-lefevre', 75],
  ['op-marchand', 1626],
  ['op-morel', 159],
  ['op-roux', 130],
  ['op-schmitt', undefined],
  ['op-vidal', 12],
] as const;

export const givenWorkshopSupervision = (): void => {
  cy.intercept('GET', '/api/operateurs?*', { body: pageFixture(operatorsFixture) }).as('supervisionOperators');
  cy.intercept('GET', '/api/postes-de-travail?*', { body: pageFixture(postesFixture) }).as('supervisionWorkstations');
  cy.intercept('GET', '/api/atelier/journees?*', {
    body: pageFixture(
      venuesFixture.map(([id, minutes]) => ({
        id: `venue-${id}`,
        operateur: operateurFixture(id),
        etat: 'PRESENT',
        journal: [],
        fenetres: minutes === undefined ? [] : [{ debut: instantFixture(minutes) }],
      })),
    ),
  }).as('supervisionVisits');
  cy.intercept('GET', '/api/atelier/suivis?*', {
    body: pageFixture([
      ...suivisFixture,
      {
        id: 'suivi-conflit',
        element: 'element-conflit',
        nom: 'Moule à vérifier',
        type: 'PRODUIT',
        etat: 'EN_ATTENTE',
        engageLe: instantFixture(2000),
        engagePar: 'gestionnaire',
        evaluation: new Date(INSTANT_FIXTURE).toISOString(),
        activitesEnCours: [],
        conflits: [{ operateur: operateurFixture('op-dumas'), activites: [], pointages: ['pointage-ouverture-annulee'] }],
      },
    ]),
  }).as('supervisionActivities');
};

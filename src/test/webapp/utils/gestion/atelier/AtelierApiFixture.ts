import { components } from '@/app/generated/schema';
type RestSuivi = components['schemas']['RestSuiviDAtelierEnGrille'];
type Engagement = components['schemas']['RestEngagement'];

export interface SuiviEnregistre {
  id: string;
  element: string;
  nom: string;
  type: NonNullable<RestSuivi['type']>;
  etat: NonNullable<RestSuivi['etat']>;
  clotureLe?: string;
  cloturePar?: string;
}

export interface EngageableEnregistre {
  id: string;
  nom: string;
  type: NonNullable<RestSuivi['type']>;
}

const ROUTE = '/api/atelier/suivis';
const URN = 'urn:glm:erreur:atelier:';
const AUTEUR = 'gestionnaire.impeccmold';
const ENGAGE_LE = '2026-09-14T08:30:00Z';
const CLOTURE_LE = '2026-09-15T16:00:00Z';

export class AtelierApiFixture {
  suivis: SuiviEnregistre[];
  engageables: EngageableEnregistre[] = [];
  failRead = false;
  failWrite = false;
  readonly engagements: Engagement[] = [];
  readonly clotures: string[] = [];
  readonly reouvertures: string[] = [];
  private suivant = 0;

  constructor(suivis: SuiviEnregistre[] = []) {
    this.suivis = suivis;
  }

  install(): void {
    this.installCloture();
    this.installRead();
    this.installEngagement();
  }

  private installRead(): void {
    cy.intercept({ method: 'GET', pathname: ROUTE }, request => {
      if (this.failRead) {
        request.reply({ statusCode: 500, body: {} });
        return;
      }
      const etats = etatsDemandes(request.url);
      const page = Number(request.query['page'] ?? 0);
      const size = Number(request.query['size'] ?? 20);
      const retenus = this.suivis.filter(suivi => etats.indexOf(suivi.etat) !== -1);
      request.reply({
        content: retenus.slice(page * size, (page + 1) * size).map(suivi => corpsDe(suivi)),
        currentPage: page,
        pageSize: size,
        totalElementsCount: retenus.length,
      });
    }).as('atelierRead');
  }

  private installEngagement(): void {
    cy.intercept('POST', ROUTE, request => {
      const commande = request.body as Engagement;
      this.engagements.push(commande);
      if (this.failWrite) {
        request.reply({ statusCode: 500, body: {} });
        return;
      }
      if (this.suivis.some(suivi => suivi.element === commande.element && suivi.etat !== 'CLOTURE')) {
        request.reply({ statusCode: 409, body: { type: `${URN}element-deja-engage` } });
        return;
      }
      const engageable = this.engageables.find(candidat => candidat.id === commande.element);
      if (engageable === undefined) {
        request.reply({ statusCode: 404, body: { type: `${URN}element-de-fabrication-introuvable` } });
        return;
      }
      this.suivant += 1;
      const suivi: SuiviEnregistre = {
        id: `suivi-cree-${String(this.suivant)}`,
        element: engageable.id,
        nom: engageable.nom,
        type: engageable.type,
        etat: 'EN_ATTENTE',
      };
      this.suivis.push(suivi);
      request.reply({ statusCode: 201, body: corpsDe(suivi) });
    }).as('atelierEngage');
  }

  private installCloture(): void {
    cy.intercept('PUT', `${ROUTE}/*/cloture`, request => {
      const id = identifiantDans(request.url);
      this.clotures.push(id);
      this.remplace(id, suivi => ({ ...suivi, etat: 'CLOTURE', clotureLe: CLOTURE_LE, cloturePar: 'dupont' }));
      request.reply({ statusCode: 200, body: {} });
    }).as('atelierCloture');

    cy.intercept('DELETE', `${ROUTE}/*/cloture`, request => {
      const id = identifiantDans(request.url);
      this.reouvertures.push(id);
      if (this.failWrite) {
        request.reply({ statusCode: 404, body: { type: `${URN}suivi-d-atelier-introuvable` } });
        return;
      }
      this.remplace(id, suivi => ({ id: suivi.id, element: suivi.element, nom: suivi.nom, type: suivi.type, etat: 'EN_ATTENTE' }));
      request.reply({ statusCode: 200, body: {} });
    }).as('atelierReouverture');
  }

  private remplace(id: string, transforme: (suivi: SuiviEnregistre) => SuiviEnregistre): void {
    this.suivis = this.suivis.map(suivi => (suivi.id === id ? transforme(suivi) : suivi));
  }
}

const PARAMETRE_ETAT = 'etats=';

/** `request.query` ne rend qu'une valeur par clé : les états répétés se lisent sur l'URL. */
const etatsDemandes = (url: string): string[] => {
  const debut = url.indexOf('?');
  if (debut === -1) return [];
  return url
    .substring(debut + 1)
    .split('&')
    .filter(parametre => parametre.indexOf(PARAMETRE_ETAT) === 0)
    .map(parametre => decodeURIComponent(parametre.substring(PARAMETRE_ETAT.length)));
};

const identifiantDans = (url: string): string => url.split('/').slice(-2)[0] ?? '';

const corpsDe = (suivi: SuiviEnregistre): RestSuivi => ({
  activitesEnCours: [],
  element: suivi.element,
  engageLe: ENGAGE_LE,
  engagePar: AUTEUR,
  etat: suivi.etat,
  id: suivi.id,
  nom: suivi.nom,
  type: suivi.type,
  ...(suivi.clotureLe === undefined ? {} : { clotureLe: suivi.clotureLe }),
  ...(suivi.cloturePar === undefined ? {} : { cloturePar: suivi.cloturePar }),
});

export const suivisFixture = (nombre: number): SuiviEnregistre[] =>
  Array.from({ length: nombre }, (_, index) => ({
    id: 'suivi-' + String(index + 1),
    element: 'element-' + String(index + 1),
    nom: 'PRD-2026-' + numeroteSur6(index + 1),
    type: index % 2 === 0 ? ('PRODUIT' as const) : ('ORDRE_DE_FABRICATION' as const),
    etat: 'EN_COURS' as const,
  }));

export const engageablesFixture = (nombre: number): EngageableEnregistre[] =>
  Array.from({ length: nombre }, (_, index) => ({
    id: 'element-' + String(index + 1),
    nom: 'PRD-2026-' + numeroteSur6(index + 1),
    type: index % 2 === 0 ? ('PRODUIT' as const) : ('ORDRE_DE_FABRICATION' as const),
  }));

const numeroteSur6 = (rang: number): string => ('000000' + String(rang)).slice(-6);

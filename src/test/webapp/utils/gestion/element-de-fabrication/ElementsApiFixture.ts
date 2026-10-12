import { components } from '@/app/generated/schema';
type RestElement = components['schemas']['RestElementDeFabrication'];
type Creation = components['schemas']['RestCreationElementDeFabrication'];
type Modification = components['schemas']['RestModificationElementDeFabrication'];

type ElementEnregistre = RestElement & { id: string; categorie: string; nom: string };

const CREE_LE = '2026-10-01T08:00:00Z';
const MIS_A_L_ATELIER_LE = '2026-10-02T08:00:00Z';
const CLOTURE_LE = '2026-10-05T16:00:00Z';

const sansCasse = (texte: string | undefined): string => (texte ?? '').toLocaleLowerCase('fr-FR');

const accepte = (query: Record<string, string | number>, cle: string, valeur: string | undefined): boolean =>
  !(cle in query) || String(query[cle]) === valeur;

const trouve = (element: ElementEnregistre, query: Record<string, string | number>): boolean =>
  !('recherche' in query)
  || [element.nom, element.reference, element.description].some(texte => sansCasse(texte).includes(sansCasse(String(query['recherche']))));

const correspond = (element: ElementEnregistre, query: Record<string, string | number>): boolean =>
  accepte(query, 'cycle', element.cycle) && accepte(query, 'categorie', element.categorie) && trouve(element, query);

const ROUTE = '/api/elements-de-fabrication';
const CATEGORIES = '/api/categories-de-produit';
const URN = 'urn:glm:erreur:element-de-fabrication:';

export class ElementsApiFixture {
  elements: ElementEnregistre[];
  categories: string[] = ['MOULE', 'OF'];
  failRead = false;
  failWrite = false;
  readonly writes: (Creation | Modification)[] = [];

  constructor(elements: ElementEnregistre[] = []) {
    this.elements = elements;
  }

  install(): void {
    this.installCategories();
    this.installSingleRead();
    cy.intercept({ method: 'GET', pathname: ROUTE }, request => {
      if (this.failRead) {
        request.reply({ statusCode: 500, body: {} });
        return;
      }
      const page = Number(request.query['page'] ?? 0);
      const size = Number(request.query['size'] ?? 20);
      const trouves = this.elements.filter(element => correspond(element, request.query));
      request.reply({
        content: trouves.slice(page * size, (page + 1) * size).map(corpsDe),
        currentPage: page,
        pageSize: size,
        totalElementsCount: trouves.length,
      });
    }).as('elementsRead');
    this.installCompteurs();
    this.installCreation();
    this.installModification();
  }

  installActesDAtelier(): void {
    cy.intercept('POST', '/api/atelier/suivis', request => {
      const { element } = request.body as { element: string };
      this.elements = this.elements.map(candidat =>
        candidat.id === element
          ? { ...candidat, cycle: 'EN_ATELIER', etatDAtelier: 'EN_ATTENTE', misALAtelierLe: MIS_A_L_ATELIER_LE }
          : candidat,
      );
      request.reply({ statusCode: 201, body: {} });
    }).as('miseALAtelier');
    cy.intercept('PUT', '/api/atelier/suivis/*/cloture', request => {
      const suivi = request.url.split('/').slice(-2)[0];
      this.elements = this.elements.map(candidat =>
        candidat.suivi === suivi ? { ...candidat, cycle: 'CLOTURE', clotureLe: CLOTURE_LE, clotureePar: 'Claire' } : candidat,
      );
      request.reply({ statusCode: 204 });
    }).as('cloture');
  }

  private installCompteurs(): void {
    cy.intercept({ method: 'GET', pathname: `${ROUTE}/compteurs` }, request => {
      const compter = (cycle: string): number => this.elements.filter(element => correspond(element, { ...request.query, cycle })).length;
      request.reply({ enPreparation: compter('EN_PREPARATION'), enAtelier: compter('EN_ATELIER'), clotures: compter('CLOTURE') });
    }).as('compteursRead');
  }

  private installCategories(): void {
    cy.intercept({ method: 'GET', pathname: CATEGORIES }, request => {
      if (this.failRead) {
        request.reply({ statusCode: 500, body: {} });
        return;
      }
      const page = Number(request.query['page'] ?? 0);
      const size = Number(request.query['size'] ?? 20);
      request.reply({
        content: this.categories.slice(page * size, (page + 1) * size).map(code => ({ code, utilisee: this.estUtilisee(code) })),
        currentPage: page,
        pageSize: size,
        totalElementsCount: this.categories.length,
      });
    }).as('categoriesRead');
    cy.intercept('POST', CATEGORIES, request => {
      const { code } = request.body as { code: string };
      if (this.categories.includes(code)) {
        request.reply({ statusCode: 409, body: { type: 'urn:glm:erreur:categorie-de-produit:categorie-deja-existante' } });
        return;
      }
      this.categories.push(code);
      request.reply({ statusCode: 201, body: { code, utilisee: false } });
    }).as('categorieDeclare');
    cy.intercept('PUT', `${CATEGORIES}/ordre`, request => {
      this.categories = [...(request.body as { codes: string[] }).codes];
      request.reply({ statusCode: 204 });
    }).as('categoriesReorder');
    cy.intercept('DELETE', `${CATEGORIES}/*`, request => {
      const code = request.url.split('/').slice(-1)[0] ?? '';
      if (this.estUtilisee(code)) {
        request.reply({ statusCode: 409, body: { type: 'urn:glm:erreur:categorie-de-produit:categorie-utilisee' } });
        return;
      }
      this.categories = this.categories.filter(candidate => candidate !== code);
      request.reply({ statusCode: 204 });
    }).as('categorieDelete');
  }

  private estUtilisee(code: string): boolean {
    return this.elements.some(element => element.categorie === code);
  }

  private installSingleRead(): void {
    cy.intercept('GET', `${ROUTE}/*`, request => {
      const id = request.url.split('/').slice(-1)[0];
      const element = this.elements.find(candidat => candidat.id === id);
      if (element === undefined) {
        request.reply({ statusCode: 404, body: { type: `${URN}element-de-fabrication-introuvable` } });
        return;
      }
      request.reply({ statusCode: 200, body: corpsDe(element) });
    }).as('elementRead');
  }

  private installCreation(): void {
    cy.intercept('POST', ROUTE, request => {
      const commande = request.body as Creation;
      this.writes.push(commande);
      if (this.failWrite) {
        request.reply({ statusCode: 500, body: {} });
        return;
      }
      if (this.referenceDejaPrise(commande.reference)) {
        request.reply({ statusCode: 409, body: { type: `${URN}reference-deja-utilisee` } });
        return;
      }
      const element: ElementEnregistre = {
        id: 'created-element',
        nom: 'PRD-2026-000009',
        categorie: commande.categorie ?? 'MOULE',
        dateDeCreation: CREE_LE,
        cycle: 'EN_PREPARATION',
        ...(commande.reference === undefined ? {} : { reference: commande.reference }),
        ...(commande.description === undefined ? {} : { description: commande.description }),
      };
      this.elements.unshift(element);
      request.reply({ statusCode: 201, body: corpsDe(element) });
    }).as('elementCreate');
  }

  private installModification(): void {
    cy.intercept('PUT', `${ROUTE}/*`, request => {
      const commande = request.body as Modification;
      const id = request.url.split('/').slice(-1)[0];
      this.writes.push(commande);
      if (this.referenceDejaPrise(commande.reference, id)) {
        request.reply({ statusCode: 409, body: { type: `${URN}reference-deja-utilisee` } });
        return;
      }
      this.elements = this.elements.map(element => (element.id === id ? { ...sansFiche(element), ...commande } : element));
      request.reply({ statusCode: 200, body: this.elements.filter(element => element.id === id).map(corpsDe)[0] });
    }).as('elementUpdate');
  }

  private referenceDejaPrise(reference: string | undefined, id?: string): boolean {
    if (reference === undefined) {
      return false;
    }
    return this.elements.some(element => element.reference === reference && element.id !== id);
  }
}

const sansFiche = (element: ElementEnregistre): ElementEnregistre => ({
  id: element.id,
  categorie: element.categorie,
  nom: element.nom,
  ...Object.fromEntries(Object.entries(element).filter(([cle]) => !['reference', 'description'].includes(cle))),
});

const corpsDe = (element: ElementEnregistre): RestElement => ({ ...element });

const numeroteSur6 = (rang: number): string => ('000000' + String(rang)).slice(-6);

const passageDuFixture = (cycle: 'EN_PREPARATION' | 'EN_ATELIER', rang: number): Partial<RestElement> =>
  cycle === 'EN_PREPARATION'
    ? { cycle }
    : { cycle, etatDAtelier: 'EN_COURS', misALAtelierLe: MIS_A_L_ATELIER_LE, suivi: 'suivi-' + String(rang) };

export const elementsFixture = (nombre: number, cycle: 'EN_PREPARATION' | 'EN_ATELIER' = 'EN_ATELIER'): ElementEnregistre[] =>
  Array.from({ length: nombre }, (_, index) => ({
    id: 'element-' + String(index + 1),
    categorie: index % 2 === 0 ? 'MOULE' : 'OF',
    nom: 'PRD-2026-' + numeroteSur6(index + 1),
    reference: String(1015 + index),
    description: 'Moule ' + String(index + 1),
    dateDeCreation: CREE_LE,
    ...passageDuFixture(cycle, index + 1),
  }));

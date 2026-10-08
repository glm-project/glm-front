import { components } from '@/app/generated/schema';
type RestElement = components['schemas']['RestElementDeFabrication'];
type Creation = components['schemas']['RestCreationElementDeFabrication'];
type Modification = components['schemas']['RestModificationElementDeFabrication'];

interface ElementEnregistre {
  id: string;
  categorie: string;
  nom: string;
  reference?: string;
  description?: string;
}

const ROUTE = '/api/elements-de-fabrication';
const CATEGORIES = '/api/categories-de-produit';
const URN = 'urn:glm:erreur:element-de-fabrication:';

export class ElementsApiFixture {
  elements: ElementEnregistre[];
  categories: string[] = ['MOULE', 'OF'];
  categoriesUtilisees: string[] = [];
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
      request.reply({
        content: this.elements.slice(page * size, (page + 1) * size).map(corpsDe),
        currentPage: page,
        pageSize: size,
        totalElementsCount: this.elements.length,
      });
    }).as('elementsRead');
    this.installCreation();
    this.installModification();
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
        content: this.categories.slice(page * size, (page + 1) * size).map(code => ({ code })),
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
      request.reply({ statusCode: 201, body: { code } });
    }).as('categorieDeclare');
    cy.intercept('PUT', `${CATEGORIES}/ordre`, request => {
      this.categories = [...(request.body as { codes: string[] }).codes];
      request.reply({ statusCode: 204 });
    }).as('categoriesReorder');
    cy.intercept('DELETE', `${CATEGORIES}/*`, request => {
      const code = request.url.split('/').slice(-1)[0] ?? '';
      if (this.categoriesUtilisees.includes(code)) {
        request.reply({ statusCode: 409, body: { type: 'urn:glm:erreur:categorie-de-produit:categorie-utilisee' } });
        return;
      }
      this.categories = this.categories.filter(candidate => candidate !== code);
      request.reply({ statusCode: 204 });
    }).as('categorieDelete');
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
        ...(commande.reference === undefined ? {} : { reference: commande.reference }),
        ...(commande.description === undefined ? {} : { description: commande.description }),
      };
      this.elements.push(element);
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
      this.elements = this.elements.map(element =>
        element.id === id ? { id: element.id, categorie: element.categorie, nom: element.nom, ...commande } : element,
      );
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

const corpsDe = (element: ElementEnregistre): RestElement => ({ ...element });

const numeroteSur6 = (rang: number): string => ('000000' + String(rang)).slice(-6);

export const elementsFixture = (nombre: number): ElementEnregistre[] =>
  Array.from({ length: nombre }, (_, index) => ({
    id: 'element-' + String(index + 1),
    categorie: index % 2 === 0 ? 'MOULE' : 'OF',
    nom: 'PRD-2026-' + numeroteSur6(index + 1),
    reference: String(1015 + index),
    description: 'Moule ' + String(index + 1),
  }));

import { components } from '@/app/generated/schema';
type RestElement = components['schemas']['RestElementDeFabrication'];
type Creation = components['schemas']['RestCreationElementDeFabrication'];
type Modification = components['schemas']['RestModificationElementDeFabrication'];

interface ElementEnregistre {
  id: string;
  type: NonNullable<RestElement['type']>;
  nom: string;
  reference?: string;
  description?: string;
}

const ROUTE = '/api/elements-de-fabrication';
const URN = 'urn:glm:erreur:element-de-fabrication:';

export class ElementsApiFixture {
  elements: ElementEnregistre[];
  failRead = false;
  failWrite = false;
  readonly writes: (Creation | Modification)[] = [];

  constructor(elements: ElementEnregistre[] = []) {
    this.elements = elements;
  }

  install(): void {
    this.installSingleRead();
    cy.intercept({ method: 'GET', pathname: ROUTE }, request => {
      if (this.failRead) {
        request.reply({ statusCode: 500, body: {} });
        return;
      }
      const page = Number(request.query['page'] ?? 0);
      const size = Number(request.query['size'] ?? 20);
      request.reply({
        content: this.elements.slice(page * size, (page + 1) * size),
        currentPage: page,
        pageSize: size,
        totalElementsCount: this.elements.length,
      });
    }).as('elementsRead');
    this.installCreation();
    this.installModification();
  }

  private installSingleRead(): void {
    cy.intercept('GET', `${ROUTE}/*`, request => {
      const id = request.url.split('/').slice(-1)[0];
      const element = this.elements.find(candidat => candidat.id === id);
      if (element === undefined) {
        request.reply({ statusCode: 404, body: { type: `${URN}element-de-fabrication-introuvable` } });
        return;
      }
      request.reply({ statusCode: 200, body: element });
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
      const element: ElementEnregistre = { id: 'created-element', nom: 'PRD-2026-000009', ...commande };
      this.elements.push(element);
      request.reply({ statusCode: 201, body: element });
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
        element.id === id ? { id: element.id, type: element.type, nom: element.nom, ...commande } : element,
      );
      request.reply({ statusCode: 200, body: this.elements.find(element => element.id === id) });
    }).as('elementUpdate');
  }

  private referenceDejaPrise(reference: string | undefined, id?: string): boolean {
    if (reference === undefined) {
      return false;
    }
    return this.elements.some(element => element.reference === reference && element.id !== id);
  }
}

const numeroteSur6 = (rang: number): string => ('000000' + String(rang)).slice(-6);

export const elementsFixture = (nombre: number): ElementEnregistre[] =>
  Array.from({ length: nombre }, (_, index) => ({
    id: 'element-' + String(index + 1),
    type: index % 2 === 0 ? ('PRODUIT' as const) : ('ORDRE_DE_FABRICATION' as const),
    nom: 'PRD-2026-' + numeroteSur6(index + 1),
    reference: String(1015 + index),
    description: 'Moule ' + String(index + 1),
  }));

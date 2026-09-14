import { components } from '@/app/generated/schema';
type RestPoste = components['schemas']['RestPosteDeTravail'];
type Commande = components['schemas']['RestCreationPosteDeTravail'];

export class PostesApiFixture {
  postes: RestPoste[];
  failRead = false;
  failWrite = false;
  protectedCode: string | undefined;
  readonly writes: Commande[] = [];
  readonly deletions: string[] = [];

  constructor(postes: RestPoste[] = []) {
    this.postes = postes;
  }

  install(): void {
    cy.intercept({ method: 'GET', pathname: '/api/postes-de-travail' }, request => {
      if (this.failRead) {
        request.reply({ statusCode: 500, body: {} });
        return;
      }
      const page = Number(request.query['page'] ?? 0);
      const size = Number(request.query['size'] ?? 20);
      request.reply({
        content: this.postes.slice(page * size, (page + 1) * size),
        currentPage: page,
        pageSize: size,
        totalElementsCount: this.postes.length,
      });
    }).as('postesRead');
    this.installCreation();
    this.installModification();
    this.installDeletion();
  }

  private installCreation(): void {
    cy.intercept('POST', '/api/postes-de-travail', request => {
      const commande = request.body as Commande;
      this.writes.push(commande);
      if (this.failWrite) {
        request.reply({ statusCode: 500, body: {} });
        return;
      }
      if (this.postes.some(poste => poste.libelle === commande.libelle)) {
        request.reply({ statusCode: 409, body: { type: 'urn:glm:erreur:poste-de-travail:libelle-deja-utilise' } });
        return;
      }
      const poste = { id: 'created-poste', ...commande };
      this.postes.push(poste);
      request.reply({ statusCode: 201, body: poste });
    }).as('posteCreate');
  }

  private installModification(): void {
    cy.intercept('PUT', '/api/postes-de-travail/*', request => {
      const commande = request.body as Commande;
      const id = request.url.split('/').slice(-1)[0];
      this.writes.push(commande);
      this.postes = this.postes.map(poste => (poste.id === id ? { id, ...commande } : poste));
      request.reply({ statusCode: 200, body: this.postes.find(poste => poste.id === id) });
    }).as('posteUpdate');
  }

  private installDeletion(): void {
    cy.intercept('DELETE', '/api/postes-de-travail/*', request => {
      this.deletions.push(request.url);
      const id = request.url.split('/').slice(-1)[0];
      if (this.protectedCode !== undefined) {
        request.reply({ statusCode: 409, body: { type: 'urn:glm:erreur:poste-de-travail:' + this.protectedCode } });
        return;
      }
      this.postes = this.postes.filter(poste => poste.id !== id);
      request.reply({ statusCode: 204 });
    }).as('posteDelete');
  }
}

export const postesFixture = (nombre: number): RestPoste[] =>
  Array.from({ length: nombre }, (_, index) => ({
    id: 'poste-' + String(index + 1),
    libelle: 'Poste ' + (index < 9 ? '0' + String(index + 1) : String(index + 1)),
    nature: index === nombre - 1 ? 'ponçage' : 'tournage',
    coutHoraire: 45.5,
  }));

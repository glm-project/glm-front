import { components } from '@/app/generated/schema';

type RestOperateur = components['schemas']['RestOperateur'];
type RestPoste = components['schemas']['RestPosteDeTravail'];
type Commande = components['schemas']['RestCreationOperateur'];

const memeIdentite = (operateur: RestOperateur, commande: Commande): boolean => {
  const memeNom = operateur.nom === commande.nom;
  const memePrenom = operateur.prenom === commande.prenom;
  return memeNom && memePrenom;
};

const naturesDe = (postes: readonly RestPoste[]): string[] =>
  [...new Set(postes.map(poste => poste.nature))].sort((left, right) => left.localeCompare(right, 'fr'));

export class OperateursApiFixture {
  operateurs: RestOperateur[];
  postes: RestPoste[];
  failRead = false;
  failWrite = false;
  deletionRefusalCode: string | undefined;
  readonly writes: Commande[] = [];
  readonly deletions: string[] = [];

  constructor(operateurs: RestOperateur[] = [], postes: RestPoste[] = []) {
    this.operateurs = operateurs;
    this.postes = postes;
  }

  install(): void {
    this.installOperateursRead();
    this.installPostesRead();
    this.installCreation();
    this.installModification();
    this.installDeletion();
  }

  private installOperateursRead(): void {
    cy.intercept({ method: 'GET', pathname: '/api/operateurs' }, request => {
      if (this.failRead) {
        request.reply({ statusCode: 500, body: {} });
        return;
      }
      const page = Number(request.query['page'] ?? 0);
      const size = Number(request.query['size'] ?? 20);
      request.reply({
        content: this.operateurs.slice(page * size, (page + 1) * size),
        currentPage: page,
        pageSize: size,
        totalElementsCount: this.operateurs.length,
      });
    }).as('operateursRead');
  }

  private installPostesRead(): void {
    cy.intercept({ method: 'GET', pathname: '/api/postes-de-travail' }, request => {
      const page = Number(request.query['page'] ?? 0);
      const size = Number(request.query['size'] ?? 100);
      request.reply({
        content: this.postes.slice(page * size, (page + 1) * size),
        currentPage: page,
        pageSize: size,
        totalElementsCount: this.postes.length,
      });
    }).as('postesRead');
  }

  private installCreation(): void {
    cy.intercept('POST', '/api/operateurs', request => {
      const commande = request.body as Commande;
      this.writes.push(commande);
      if (this.failWrite) {
        request.reply({ statusCode: 500, body: {} });
        return;
      }
      const conflit = this.conflitDe(commande);
      if (conflit !== undefined) {
        request.reply({ statusCode: 409, body: { type: 'urn:glm:erreur:operateur:' + conflit } });
        return;
      }
      const operateur = this.resolve('created-operateur', commande);
      this.operateurs.push(operateur);
      request.reply({ statusCode: 201, body: operateur });
    }).as('operateurCreate');
  }

  private installModification(): void {
    cy.intercept('PUT', '/api/operateurs/*', request => {
      const commande = request.body as Commande;
      const id = request.url.split('/').slice(-1)[0] ?? '';
      this.writes.push(commande);
      this.operateurs = this.operateurs.map(operateur => (operateur.id === id ? this.resolve(id, commande) : operateur));
      request.reply({ statusCode: 200, body: this.operateurs.find(operateur => operateur.id === id) });
    }).as('operateurUpdate');
  }

  private installDeletion(): void {
    cy.intercept('DELETE', '/api/operateurs/*', request => {
      this.deletions.push(request.url);
      const id = request.url.split('/').slice(-1)[0];
      if (this.deletionRefusalCode !== undefined) {
        request.reply({ statusCode: 409, body: { type: 'urn:glm:erreur:operateur:' + this.deletionRefusalCode } });
        return;
      }
      this.operateurs = this.operateurs.filter(operateur => operateur.id !== id);
      request.reply({ statusCode: 204 });
    }).as('operateurDelete');
  }

  private conflitDe(commande: Commande): string | undefined {
    if (this.identiteEstPrise(commande)) {
      return 'identite-deja-utilisee';
    }
    if (this.matriculeEstPris(commande.matricule)) {
      return 'matricule-deja-utilise';
    }
    return undefined;
  }

  private identiteEstPrise(commande: Commande): boolean {
    return this.operateurs.some(operateur => memeIdentite(operateur, commande));
  }

  private matriculeEstPris(matricule: string | undefined): boolean {
    if (matricule === undefined) {
      return false;
    }
    return this.operateurs.some(operateur => operateur.matricule === matricule);
  }

  private resolve(id: string, commande: Commande): RestOperateur {
    const postes = this.postes
      .filter(poste => (commande.postes ?? []).some(id => id === poste.id))
      .sort((left, right) => left.libelle.localeCompare(right.libelle, 'fr'));
    return {
      id,
      nom: commande.nom,
      prenom: commande.prenom,
      postes,
      natures: naturesDe(postes),
      ...(commande.matricule === undefined || commande.matricule === '' ? {} : { matricule: commande.matricule }),
      ...(commande.tauxHoraire === undefined ? {} : { tauxHoraire: commande.tauxHoraire }),
    };
  }
}

export const postesFixture = (nombre: number): RestPoste[] =>
  Array.from({ length: nombre }, (_, index) => ({
    id: 'poste-' + String(index + 1),
    libelle: 'Poste ' + (index < 9 ? '0' + String(index + 1) : String(index + 1)),
    nature: index === nombre - 1 ? 'ponçage' : 'tournage',
  }));

export const operateursFixture = (nombre: number): RestOperateur[] =>
  Array.from({ length: nombre }, (_, index) => ({
    id: 'operateur-' + String(index + 1),
    nom: 'Nom ' + (index < 9 ? '0' + String(index + 1) : String(index + 1)),
    prenom: 'Prenom ' + String(index + 1),
    matricule: '0' + String(index + 1),
    tauxHoraire: 22,
    postes: [{ id: 'poste-1', libelle: 'Poste 01', nature: 'tournage' }],
    natures: ['tournage'],
  }));

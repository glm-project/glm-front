import { components } from '@/app/generated/schema';

type RestOperateur = components['schemas']['RestOperateur'];

export const identitesOperateursFixture = (): RestOperateur[] => [
  { id: 'op-2', nom: 'Évrard', prenom: 'Zoé', postes: [], natures: [] },
  { id: 'op-1', nom: 'Dupont', prenom: 'Jean', postes: [], natures: [] },
  { id: 'op-3', nom: 'Évrard', prenom: 'Alice', postes: [], natures: [] },
];

export class OperateursDuReleveApiFixture {
  failRead = false;
  readonly lectures: number[] = [];
  private attente: Promise<void> | undefined;

  constructor(readonly operateurs: readonly RestOperateur[] = identitesOperateursFixture()) {}

  suspend(): () => void {
    let release = (): void => {};
    this.attente = new Promise(resolve => {
      release = resolve;
    });
    return release;
  }

  install(): void {
    cy.intercept({ method: 'GET', pathname: '/api/operateurs' }, request => {
      const page = Number(request.query['page']);
      const size = Number(request.query['size']);
      this.lectures.push(page);
      const response = this.failRead
        ? { statusCode: 500, body: {} }
        : {
            body: {
              content: this.operateurs.slice(page * size, (page + 1) * size),
              currentPage: page,
              pageSize: size,
              totalElementsCount: this.operateurs.length,
            },
          };
      if (this.attente !== undefined) {
        return this.attente.then(() => request.reply(response));
      }
      return request.reply(response);
    }).as('operateursDuReleveRead');
  }
}

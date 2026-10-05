import { components } from '@/app/generated/schema';

type RestOperateur = components['schemas']['RestOperateur'];
type RestPosteDeTravail = components['schemas']['RestPosteDeTravail'];

export const interceptReferentiel = (operateurs: RestOperateur[], postes: RestPosteDeTravail[]): void => {
  cy.intercept('GET', '/api/operateurs*', {
    body: {
      content: operateurs,
      currentPage: 0,
      pageSize: 100,
      totalElementsCount: operateurs.length,
    } satisfies components['schemas']['PageRestOperateur'],
  }).as('operateurs');
  cy.intercept('GET', '/api/postes-de-travail*', {
    body: {
      content: postes,
      currentPage: 0,
      pageSize: 100,
      totalElementsCount: postes.length,
    } satisfies components['schemas']['PageRestPosteDeTravail'],
  }).as('postes');
};

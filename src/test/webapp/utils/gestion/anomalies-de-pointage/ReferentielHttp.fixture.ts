import { components } from '@/app/generated/schema';

type RestOperateur = components['schemas']['RestOperateur'];
type RestElementDeFabrication = components['schemas']['RestElementDeFabrication'];

export const interceptOperateurs = (operateurs: RestOperateur[]): void => {
  cy.intercept('GET', '/api/operateurs*', {
    body: {
      content: operateurs,
      currentPage: 0,
      pageSize: 100,
      totalElementsCount: operateurs.length,
    } satisfies components['schemas']['PageRestOperateur'],
  }).as('operateurs');
};

export const interceptElements = (elements: RestElementDeFabrication[]): void => {
  cy.intercept('GET', '/api/elements-de-fabrication*', {
    body: {
      content: elements,
      currentPage: 0,
      pageSize: 100,
      totalElementsCount: elements.length,
    } satisfies components['schemas']['PageRestElementDeFabrication'],
  }).as('elements');
};

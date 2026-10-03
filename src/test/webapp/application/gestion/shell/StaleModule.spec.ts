import { dataSelector } from '../../../utils/DataSelector';
import { SupervisionApiFixture } from '../../../utils/gestion/supervision-atelier/SupervisionApiFixture';

describe('Gestion after a deployment', () => {
  it('should reload the front when a lazy route can no longer be fetched', () => {
    givenThePreviousVersionOfTheModuleIsMissing();

    whenOpeningTheUnavailableRoute();

    thenTheFrontHasReloadedAndDisplaysThePreviousPage();
  });
});

const givenThePreviousVersionOfTheModuleIsMissing = (): void => {
  new SupervisionApiFixture().intercept();
  cy.intercept(
    { method: 'GET', pathname: '/Operateurs-*.js' },
    {
      statusCode: 404,
      headers: { 'Cache-Control': 'no-store' },
    },
  ).as('missingModule');
  cy.intercept({ method: 'GET', pathname: /^\/(operateurs)?$/ }).as('frontDocument');
};

const whenOpeningTheUnavailableRoute = (): void => {
  cy.visit('/operateurs');
  cy.wait('@missingModule').as('moduleFailure', { type: 'static' });
};

const thenTheFrontHasReloadedAndDisplaysThePreviousPage = (): void => {
  cy.get('@moduleFailure').its('response.statusCode').should('eq', 404);
  cy.wait(['@frontDocument', '@frontDocument']);
  cy.location('pathname').should('eq', '/');
  cy.get(dataSelector('supervision-plateau')).should('be.visible');
};

import { referentielApiFixture } from '@test/utils/pupitre/ReferentielApiFixture';
import { dataSelector } from '../DataSelector';

const OPENID_CONNECT = '**/protocol/openid-connect';
const SECONDES_DANS_UNE_SEMAINE = 604_800;

export const pupitreTokenFixture = (entreprise: string): string => `header.${btoa(JSON.stringify({ tenant: entreprise }))}.signature`;

export const givenAPupitreEnrolledThroughItsDeviceFlowFixture = (entreprise: string): void => {
  cy.intercept('POST', `${OPENID_CONNECT}/auth/device`, {
    statusCode: 200,
    body: {
      device_code: 'enrolement-fixture',
      user_code: 'ENRO-LEME',
      verification_uri: 'http://localhost:9080/realms/glmproject/device',
      expires_in: 600,
      interval: 0,
    },
  }).as('enrolementAuthorizationFixture');
  cy.intercept('POST', `${OPENID_CONNECT}/token`, {
    statusCode: 200,
    body: { access_token: pupitreTokenFixture(entreprise), refresh_token: 'refresh-fixture', expires_in: SECONDES_DANS_UNE_SEMAINE },
  }).as('enrolementTokensFixture');
  cy.intercept('GET', '/api/pupitre/referentiel', { body: referentielApiFixture() }).as('enrolementReferentielFixture');
  cy.visit('/');
  cy.wait('@enrolementTokensFixture');
  cy.wait('@enrolementReferentielFixture');
  cy.get(dataSelector('designation')).should('be.visible');
};

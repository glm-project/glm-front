import type { StaticResponse } from 'cypress/types/net-stubbing';

const OPENID_CONNECT = '**/realms/glmproject/protocol/openid-connect';
const DEVICE_CODE = 'a-device-code';
const DEVICE_CODE_GRANT = 'urn:ietf:params:oauth:grant-type:device_code';
const ONE_SECOND_BETWEEN_CLAIMS = 1;

describe('Pupitre enrolment', () => {
  it('should keep claiming its tokens until someone has typed the code', () => {
    givenAnAuthorizationServerWaitingForTheCode();

    whenVisitingTheRoot();

    thenThePupitreAsksToBeEnrolledOffline();
    thenThePupitreClaimsOnItsDeviceCodeTwice();
  });
});

const givenAnAuthorizationServerWaitingForTheCode = (): void => {
  cy.intercept('POST', `${OPENID_CONNECT}/auth/device`, theDeviceAuthorizationFixture()).as('deviceAuthorization');

  let claims = 0;

  cy.intercept('POST', `${OPENID_CONNECT}/token`, request => {
    claims += 1;

    request.reply(claims === 1 ? aPendingAuthorizationFixture() : theGrantedTokensFixture());
  }).as('tokenClaim');
};

const theDeviceAuthorizationFixture = (): StaticResponse => ({
  statusCode: 200,
  body: {
    device_code: DEVICE_CODE,
    user_code: 'WXYZ-ABCD',
    verification_uri: 'http://localhost:9080/realms/glmproject/device',
    expires_in: 600,
    interval: ONE_SECOND_BETWEEN_CLAIMS,
  },
});

const aPendingAuthorizationFixture = (): StaticResponse => ({ statusCode: 400, body: { error: 'authorization_pending' } });

const theGrantedTokensFixture = (): StaticResponse => ({
  statusCode: 200,
  body: { access_token: 'an-access-token', refresh_token: 'an-offline-refresh-token', expires_in: 300 },
});

const whenVisitingTheRoot = (): void => {
  cy.visit('/');
};

const thenThePupitreAsksToBeEnrolledOffline = (): void => {
  cy.wait('@deviceAuthorization').its('request.body').should('contain', 'offline_access');
};

const thenThePupitreClaimsOnItsDeviceCodeTwice = (): void => {
  cy.wait('@tokenClaim').its('request.body').should('contain', DEVICE_CODE);
  cy.wait('@tokenClaim').its('request.body').should('contain', DEVICE_CODE_GRANT);
};

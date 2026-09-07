import type { StaticResponse } from 'cypress/types/net-stubbing';
import { dataSelector } from '../../../utils/DataSelector';
import { clearPupitreStorageFixture, givenEnrolledPupitreFixture, pupitreTokenFixture } from '../../../utils/PupitreStorageFixture';
import { requiredFixture } from '../../../utils/RequiredFixture';

const OPENID_CONNECT = '**/realms/glmproject/protocol/openid-connect';
const DEVICE_CODE = 'a-device-code';
const DEVICE_CODE_GRANT = 'urn:ietf:params:oauth:grant-type:device_code';
const ONE_SECOND_BETWEEN_CLAIMS = 1;
const VERIFICATION_URI = 'http://localhost:9080/realms/glmproject/device';
const USER_CODE = 'WXYZ-ABCD';
const ENTREPRISE = 'entreprise-a';
const OPERATEUR = { id: 'jean', nom: 'Dupont', prenom: 'Jean', matricule: '049', postes: [] };

let authorizationsBeforeTheRecovery = 0;

describe('Pupitre enrolment', () => {
  beforeEach(() => {
    givenAWorkshopBehindTheAuthorizationServer();
  });

  afterEach(() => clearPupitreStorageFixture());

  it('should keep claiming its tokens until someone has typed the code', () => {
    givenAnAuthorizationServerWaitingForTheCode();

    whenVisitingTheRoot();

    thenThePupitreAsksToBeEnrolledOffline();
    thenThePupitreClaimsOnItsDeviceCodeTwice();
  });

  it('should show the code to approve, then hand the pupitre over to the workshop once it is granted', () => {
    givenAnAuthorizationServerWaitingForTheCode();

    whenVisitingTheRoot();

    thenTheCodeToApproveIsVisible();
    thenTheValidationLinkIsScannable();
    thenTheCountdownRunsDown();

    thenTheWorkshopLoadsAndTheKeypadAppears();
  });

  it('should ask for a new code once the previous one expired, rather than rotating it silently', () => {
    givenAnAuthorizationServerAnswering('expired_token');

    whenVisitingTheRoot();

    thenTheScreenSays("Le code d'autorisation a expiré");
    thenTheCodeIsNoLongerOffered();

    whenPressingTheRecovery('Demander un nouveau code');

    thenAnotherCodeWasRequested();
  });

  it('should let the pupitre start over after an administrator refused it', () => {
    givenAnAuthorizationServerAnswering('access_denied');

    whenVisitingTheRoot();

    thenTheScreenSays("Autorisation refusée par l'administrateur");

    whenPressingTheRecovery('Recommencer');

    thenAnotherCodeWasRequested();
  });

  it('should ask to retry when no network is available for the first enrolment', () => {
    givenAnUnreachableAuthorizationServer();

    whenVisitingTheRoot();

    thenTheScreenSays("Connexion Internet requise pour enrôler l'appareil");

    whenPressingTheRecovery('Réessayer');

    thenAnotherCodeWasRequested();
  });

  it('should return to enrolment when an administrator holds the logo and confirms the reset', () => {
    givenAnEnrolledPupitre();

    whenHoldingTheLogo();

    thenTheResetIsExplainedBeforeItHappens();

    whenConfirmingTheReset();

    thenThePupitreAsksForANewCodeAgain();
  });
});

const givenAWorkshopBehindTheAuthorizationServer = (): void => {
  cy.intercept('GET', '/api/operateurs*', {
    body: { content: [{ ...OPERATEUR, natures: [] }], currentPage: 0, pageSize: 100, totalElementsCount: 1 },
  }).as('operators');
  cy.intercept('GET', '/api/atelier/suivis*', {
    body: { content: [], currentPage: 0, pageSize: 100, totalElementsCount: 0 },
  }).as('workshop');
  cy.intercept('POST', `${OPENID_CONNECT}/logout`, { statusCode: 204, body: {} }).as('logout');
};

const givenAnAuthorizationServerWaitingForTheCode = (): void => {
  cy.intercept('POST', `${OPENID_CONNECT}/auth/device`, theDeviceAuthorizationFixture()).as('deviceAuthorization');

  let claims = 0;

  cy.intercept('POST', `${OPENID_CONNECT}/token`, request => {
    claims += 1;

    request.reply(claims === 1 ? aPendingAuthorizationFixture() : theGrantedTokensFixture());
  }).as('tokenClaim');
};

const givenAnAuthorizationServerAnswering = (refusal: string): void => {
  cy.intercept('POST', `${OPENID_CONNECT}/auth/device`, theDeviceAuthorizationFixture()).as('deviceAuthorization');
  cy.intercept('POST', `${OPENID_CONNECT}/token`, { statusCode: 400, body: { error: refusal } }).as('tokenClaim');
};

const givenAnUnreachableAuthorizationServer = (): void => {
  cy.intercept('POST', `${OPENID_CONNECT}/auth/device`, { forceNetworkError: true }).as('deviceAuthorization');
};

const givenAnEnrolledPupitre = (): void => {
  cy.clock(Date.UTC(2026, 8, 6, 12));
  givenAnAuthorizationServerAnswering('authorization_pending');
  cy.visit('/');
  cy.wait('@deviceAuthorization');
  givenEnrolledPupitreFixture({ entreprise: ENTREPRISE, referentiel: { operateurs: [OPERATEUR], suivis: [] } });
  cy.reload();
  cy.wait(['@operators', '@workshop']);
  cy.tick(0);
  cy.get(dataSelector('designation')).should('be.visible');
};

const theDeviceAuthorizationFixture = (): StaticResponse => ({
  statusCode: 200,
  body: {
    device_code: DEVICE_CODE,
    user_code: USER_CODE,
    verification_uri: VERIFICATION_URI,
    expires_in: 600,
    interval: ONE_SECOND_BETWEEN_CLAIMS,
  },
});

const aPendingAuthorizationFixture = (): StaticResponse => ({ statusCode: 400, body: { error: 'authorization_pending' } });

const theGrantedTokensFixture = (): StaticResponse => ({
  statusCode: 200,
  body: { access_token: pupitreTokenFixture(ENTREPRISE), refresh_token: 'an-offline-refresh-token', expires_in: 300 },
});

const whenVisitingTheRoot = (): void => {
  cy.visit('/');
};

const whenPressingTheRecovery = (action: string): void => {
  cy.get<unknown[]>('@deviceAuthorization.all').then(requests => {
    authorizationsBeforeTheRecovery = requests.length;
  });
  cy.get(dataSelector('enrolement-action')).should('contain.text', action).click();
};

const whenHoldingTheLogo = (): void => {
  cy.get(dataSelector('header-heading')).trigger('pointerdown');
  cy.tick(3_000);
  cy.tick(0);
};

const whenConfirmingTheReset = (): void => {
  cy.get(dataSelector('reset-confirm')).click();
  cy.tick(0);
};

const thenThePupitreAsksToBeEnrolledOffline = (): void => {
  cy.wait('@deviceAuthorization').its('request.body').should('contain', 'offline_access');
};

const thenThePupitreClaimsOnItsDeviceCodeTwice = (): void => {
  cy.wait('@tokenClaim').its('request.body').should('contain', DEVICE_CODE);
  cy.wait('@tokenClaim').its('request.body').should('contain', DEVICE_CODE_GRANT);
};

const thenTheCodeToApproveIsVisible = (): void => {
  cy.get(dataSelector('user-code')).should('have.text', USER_CODE);
  cy.get(dataSelector('verification-uri')).should('contain.text', VERIFICATION_URI);
};

const thenTheValidationLinkIsScannable = (): void => {
  cy.get(dataSelector('qr-code')).find('svg').should('have.attr', 'role', 'img');
  cy.get(dataSelector('qr-modules'))
    .invoke('attr', 'd')
    .should(drawing => {
      expect(requiredFixture(drawing, 'qr drawing').length).to.be.greaterThan(0);
    });
};

const thenTheCountdownRunsDown = (): void => {
  cy.get(dataSelector('countdown'))
    .invoke('text')
    .should('match', /^Expire dans \d{2}:\d{2}$/);
  cy.get(dataSelector('countdown'))
    .invoke('text')
    .then(first => {
      cy.get(dataSelector('countdown')).should(elements => {
        expect(elements.text()).not.to.equal(first);
      });
    });
};

const thenTheWorkshopLoadsAndTheKeypadAppears = (): void => {
  cy.wait(['@operators', '@workshop']);
  cy.get(dataSelector('designation')).should('be.visible');
  cy.get(dataSelector('enrolement')).should('not.exist');
};

const thenTheScreenSays = (message: string): void => {
  cy.get(dataSelector('enrolement-status')).should('have.text', message);
};

const thenTheCodeIsNoLongerOffered = (): void => {
  cy.get(dataSelector('user-code')).should('not.exist');
};

const thenAnotherCodeWasRequested = (): void => {
  cy.get<unknown[]>('@deviceAuthorization.all').should(requests => {
    expect(requests.length).to.be.greaterThan(authorizationsBeforeTheRecovery);
  });
};

const thenTheResetIsExplainedBeforeItHappens = (): void => {
  cy.get(dataSelector('reset-title')).should('have.text', "Réinitialiser l'enrôlement ?");
  cy.get(dataSelector('reset-message')).should('contain.text', 'révoqué sur le serveur');
  cy.get(dataSelector('designation')).should('be.visible');
};

const thenThePupitreAsksForANewCodeAgain = (): void => {
  cy.wait('@logout');
  cy.get(dataSelector('enrolement')).should('be.visible');
  cy.get(dataSelector('designation')).should('not.exist');
};

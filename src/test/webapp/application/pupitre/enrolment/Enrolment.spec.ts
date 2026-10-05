import type { StaticResponse } from 'cypress/types/net-stubbing';
import { dataSelector } from '../../../utils/DataSelector';
import {
  clearPupitreStorageFixture,
  givenDurablePupitreFixture,
  givenEnrolledPupitreFixture,
  givenRetiredPupitreSessionFixture,
  pupitreTokenFixture,
} from '../../../utils/PupitreStorageFixture';
import { requiredFixture } from '../../../utils/RequiredFixture';

const OPENID_CONNECT = '**/realms/glmproject/protocol/openid-connect';
const DEVICE_CODE = 'a-device-code';
const DEVICE_CODE_GRANT = 'urn:ietf:params:oauth:grant-type:device_code';
const ONE_SECOND_BETWEEN_CLAIMS = 1;
const VERIFICATION_URI = 'http://localhost:9080/realms/glmproject/device';
const USER_CODE = 'WXYZ-ABCD';
const ENTREPRISE = 'entreprise-a';
const PENDING_GESTURE = {
  id: '59ef737b-c3dd-47f8-8e63-4d5526a17df3',
  dateDeSurvenue: '2026-09-05T00:00:00Z',
  operateurId: 'jean',
} as const;
const OPERATEUR = {
  id: 'jean',
  nom: 'Dupont',
  prenom: 'Jean',
  identifiant: '049',
  postes: [],
} as const;

let authorizationsBeforeTheRecovery = 0;
let pushesBeforeTheReset = 0;
let pupitreClock: Cypress.Clock | undefined;

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

  it('should offer a workshop retry after the first timeout while scheduled refreshes keep running', () => {
    givenAnApprovedPupitreWithAnUnresponsiveWorkshop();

    whenVisitingTheRoot();
    whenTheWorkshopRequestTimesOutWhileTheNextRefreshStarts();

    thenTheWorkshopCanBeRetried();
  });

  it('should explain a granted token without a tenant before loading the workshop', () => {
    givenAnAuthorizationServerGrantingTokensWithoutATenant();

    whenVisitingTheRoot();

    thenTheScreenSays("Appareil validé — Aucun tenant dans le jeton d'accès");
    thenNoWorkshopRequestWasMade();
  });

  it('should display expiration without silently rotating the code', () => {
    givenAnAuthorizationServerAnswering('expired_token');
    whenVisitingTheRoot();

    thenTheScreenSays("Le code d'autorisation a expiré");
    thenTheCodeIsNoLongerOffered();
  });

  it('should request a new code after recovery from expiration', () => {
    givenAnAuthorizationServerAnswering('expired_token');
    whenVisitingTheRoot();
    whenPressingTheRecovery('Demander un nouveau code');

    thenAnotherCodeWasRequested();
  });

  it('should display an administrator refusal', () => {
    givenAnAuthorizationServerAnswering('access_denied');
    whenVisitingTheRoot();

    thenTheScreenSays("Autorisation refusée par l'administrateur");
  });

  it('should restart enrolment after an administrator refusal', () => {
    givenAnAuthorizationServerAnswering('access_denied');
    whenVisitingTheRoot();
    whenPressingTheRecovery('Recommencer');

    thenAnotherCodeWasRequested();
  });

  it('should explain the missing network during first enrolment', () => {
    givenAnUnreachableAuthorizationServer();
    whenVisitingTheRoot();

    thenTheScreenSays("Connexion Internet requise pour enrôler l'appareil");
  });

  it('should retry first enrolment on request', () => {
    givenAnUnreachableAuthorizationServer();
    whenVisitingTheRoot();
    whenPressingTheRecovery('Réessayer');

    thenAnotherCodeWasRequested();
  });

  it('should explain reset before administrator confirmation', () => {
    givenAnEnrolledPupitre();
    whenHoldingTheLogo();

    thenTheResetIsExplainedBeforeItHappens();
  });

  it('should show a new approval code when the refresh credential is definitively revoked', () => {
    givenAnEnrolledPupitre();
    givenARevokedRefreshCredential();

    whenTheRestoredCredentialRenews();

    thenTheCodeToApproveIsVisible();
    thenTheValidationLinkIsScannable();
    thenOnlyEnrolmentIsAvailable();
  });

  it('should show a new approval code when synchronization discovers a session retired in another tab', () => {
    givenAnEnrolledPupitre();
    givenRetiredPupitreSessionFixture(ENTREPRISE);

    whenSynchronizingAfterAnotherTabRetiredTheSession();

    thenTheCodeToApproveIsVisible();
    thenTheValidationLinkIsScannable();
    thenOnlyEnrolmentIsAvailable();
  });

  it('should show a new approval code when renewal discovers a session retired in another tab', () => {
    givenAnEnrolledPupitre();
    givenRetiredPupitreSessionFixture(ENTREPRISE);

    whenRenewalDiscoversAnotherTabRetiredTheSession();

    thenTheCodeToApproveIsVisible();
    thenTheValidationLinkIsScannable();
    thenOnlyEnrolmentIsAvailable();
  });

  [401, 403].forEach(status => {
    it(`should show a new approval code when the current device authorization is refused (${status})`, () => {
      givenAnEnrolledPupitre();
      givenARefusedWorkshopAuthorization(status);

      whenTheNetworkReturns();

      thenTheCodeToApproveIsVisible();
      thenTheValidationLinkIsScannable();
      thenOnlyEnrolmentIsAvailable();
    });
  });

  it('should return to the workshop after the replacement device authorization is approved', () => {
    givenAnEnrolledPupitre();
    givenARevokedRefreshCredential();

    whenTheRestoredCredentialRenews();
    whenTheReplacementAuthorizationIsApproved();

    thenTheKeypadIsAvailable();
  });

  it('should return to enrolment after administrator confirmation', () => {
    givenAnEnrolledPupitre();
    whenHoldingTheLogo();
    whenConfirmingTheReset();

    thenThePupitreAsksForANewCodeAgain();
  });

  it('should warn about the gestures that were not published before an explicit reset', () => {
    givenAnEnrolledPupitreWithAnUnpublishedGesture();

    whenHoldingTheLogo();

    thenTheResetWarnsAboutTheUnpublishedGesture();
  });

  it('should not publish a gesture of the former enrolment after an explicit reset and a new enrolment', () => {
    givenAnEnrolledPupitreWithAnUnpublishedGesture();

    whenHoldingTheLogo();
    whenConfirmingTheReset();
    whenTheJournalsAreErasedAndTheNewCodeIsShown();
    whenTheReplacementAuthorizationIsApproved();
    whenTheKeypadReturns();

    thenNoGestureWasPublishedAgain();
  });

  it('should offer only reset actions while confirmation is pending', () => {
    givenAnEnrolledPupitre();
    whenHoldingTheLogo();

    thenOnlyTheResetActionsAreActive();
  });

  it('should ignore operator entry while reset confirmation is pending', () => {
    givenAnEnrolledPupitre();
    whenHoldingTheLogo();
    whenTypingAValidIdentifiantOnThePhysicalKeyboard();

    thenNoOperatorIsDesignated();
  });
});

const givenAWorkshopBehindTheAuthorizationServer = (): void => {
  cy.intercept('GET', '/api/pupitre/referentiel', {
    body: { genereLe: '2026-09-05T08:05:00Z', operateurs: [OPERATEUR], suivis: [] },
  }).as('workshop');
  cy.intercept('POST', `${OPENID_CONNECT}/logout`, { statusCode: 204, body: {} }).as('logout');
};

const givenAnApprovedPupitreWithAnUnresponsiveWorkshop = (): void => {
  cy.clock(Date.now(), ['setInterval', 'clearInterval']);
  cy.intercept('POST', `${OPENID_CONNECT}/auth/device`, theDeviceAuthorizationFixture()).as('deviceAuthorization');
  cy.intercept('POST', `${OPENID_CONNECT}/token`, theGrantedTokensFixture()).as('tokenClaim');
  cy.intercept('GET', '/api/pupitre/referentiel', {
    delay: 60_000,
    body: { genereLe: '2026-09-05T08:05:00Z', operateurs: [OPERATEUR], suivis: [] },
  }).as('workshop');
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

const givenAnAuthorizationServerGrantingTokensWithoutATenant = (): void => {
  cy.intercept('POST', `${OPENID_CONNECT}/auth/device`, theDeviceAuthorizationFixture()).as('deviceAuthorization');
  cy.intercept('POST', `${OPENID_CONNECT}/token`, {
    statusCode: 200,
    body: {
      access_token: `header.${btoa(JSON.stringify({}))}.signature`,
      refresh_token: 'an-offline-refresh-token',
      expires_in: 300,
    },
  }).as('tokenClaim');
};

const givenAnUnreachableAuthorizationServer = (): void => {
  cy.intercept('POST', `${OPENID_CONNECT}/auth/device`, { forceNetworkError: true }).as('deviceAuthorization');
};

const givenAFrozenClock = (): void => {
  cy.clock(Date.now()).then(clock => {
    pupitreClock = clock;
  });
};

const givenAnEnrolledPupitre = (): void => {
  givenAFrozenClock();
  givenAnAuthorizationServerAnswering('authorization_pending');
  cy.visit('/');
  cy.wait('@deviceAuthorization');
  givenEnrolledPupitreFixture({ entreprise: ENTREPRISE, referentiel: { operateurs: [OPERATEUR], suivis: [] } });
  cy.reload();
  cy.wait('@workshop');
  cy.tick(0);
  cy.get(dataSelector('designation')).should('be.visible');
};

const givenAnEnrolledPupitreWithAnUnpublishedGesture = (): void => {
  givenAFrozenClock();
  cy.intercept('POST', '/api/atelier/suivis/*/pointages', { forceNetworkError: true }).as('push');
  givenAnAuthorizationServerAnswering('authorization_pending');
  cy.visit('/');
  cy.wait('@deviceAuthorization');
  givenDurablePupitreFixture({ entreprise: ENTREPRISE, geste: PENDING_GESTURE });
  cy.reload();
  cy.wait('@push');
  cy.tick(0);
  cy.get(dataSelector('designation')).should('be.visible');
};

const whenTheKeypadReturns = (): void => {
  cy.get(dataSelector('designation')).should($keypad => {
    requiredFixture(pupitreClock, 'frozen clock').tick(0);
    expect($keypad.is(':visible')).to.equal(true);
  });
};

const whenTheJournalsAreErasedAndTheNewCodeIsShown = (): void => {
  cy.get(dataSelector('user-code')).should($code => {
    requiredFixture(pupitreClock, 'frozen clock').tick(0);
    expect($code.is(':visible')).to.equal(true);
  });
  cy.get<unknown[]>('@push.all').then(requests => {
    pushesBeforeTheReset = requests.length;
  });
};

const givenARevokedRefreshCredential = (): void => {
  cy.intercept('POST', `${OPENID_CONNECT}/token`, { statusCode: 400, body: { error: 'invalid_grant' } }).as('revokedRefresh');
};

const givenARefusedWorkshopAuthorization = (statusCode: number): void => {
  cy.intercept('GET', '/api/pupitre/referentiel', { statusCode, body: {} }).as('refusedWorkshop');
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

const whenTheWorkshopRequestTimesOutWhileTheNextRefreshStarts = (): void => {
  cy.get<unknown[]>('@workshop.all').should('have.length', 1);
  cy.tick(30_000);
  cy.get<unknown[]>('@workshop.all').should('have.length', 2);
};

const whenTheRestoredCredentialRenews = (): void => {
  cy.tick(5_000);
  cy.wait('@revokedRefresh');
  cy.wait('@deviceAuthorization');
  cy.tick(0);
};

const whenTheNetworkReturns = (): void => {
  cy.window().then(window => window.dispatchEvent(new Event('online')));
  cy.wait('@refusedWorkshop');
  cy.wait('@deviceAuthorization');
  cy.tick(0);
};

const whenSynchronizingAfterAnotherTabRetiredTheSession = (): void => {
  cy.window().then(window => window.dispatchEvent(new Event('online')));
  cy.wait('@deviceAuthorization');
  cy.tick(0);
};

const whenRenewalDiscoversAnotherTabRetiredTheSession = (): void => {
  cy.tick(5_000);
  cy.wait('@deviceAuthorization');
  cy.tick(0);
};

const whenTheReplacementAuthorizationIsApproved = (): void => {
  cy.get(dataSelector('user-code')).should('be.visible');
  cy.intercept('POST', `${OPENID_CONNECT}/token`, theGrantedTokensFixture()).as('replacementTokens');
  cy.tick(1_000);
  cy.wait('@replacementTokens');
  cy.wait('@workshop');
  cy.tick(1);
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
  cy.get(dataSelector('reset-confirm')).should($confirm => {
    requiredFixture(pupitreClock, 'frozen clock').tick(0);
    expect($confirm.prop('disabled')).to.equal(false);
  });
};

const whenConfirmingTheReset = (): void => {
  cy.get(dataSelector('reset-confirm')).click();
  cy.tick(0);
};

const whenTypingAValidIdentifiantOnThePhysicalKeyboard = (): void => {
  cy.press('0');
  cy.press('4');
  cy.press('9');
  cy.press(Cypress.Keyboard.Keys.ENTER);
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
  cy.wait('@workshop');
  thenTheKeypadIsAvailable();
};

const thenTheKeypadIsAvailable = (): void => {
  cy.get(dataSelector('designation')).should('be.visible');
  cy.get(dataSelector('enrolement')).should('not.exist');
};

const thenTheScreenSays = (message: string): void => {
  cy.get(dataSelector('enrolement-status')).should('have.text', message);
};

const thenTheWorkshopCanBeRetried = (): void => {
  cy.get(dataSelector('enrolement-action')).should('be.visible').and('contain.text', 'Réessayer').and('not.be.disabled');
  cy.get(dataSelector('designation')).should('not.exist');
};

const thenNoWorkshopRequestWasMade = (): void => {
  cy.get<unknown[]>('@workshop.all').should('have.length', 0);
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

const thenTheResetWarnsAboutTheUnpublishedGesture = (): void => {
  cy.get(dataSelector('reset-pending-warning')).should(
    'have.text',
    "1 geste n'a pas encore été envoyé au serveur. Il sera définitivement perdu.",
  );
  cy.get(dataSelector('reset-confirm')).should('contain.text', 'Réinitialiser quand même').and('not.be.disabled');
};

const thenNoGestureWasPublishedAgain = (): void => {
  cy.get<unknown[]>('@push.all').should(requests => {
    expect(requests.length).to.equal(pushesBeforeTheReset);
  });
};

const thenOnlyEnrolmentIsAvailable = (): void => {
  cy.get(dataSelector('enrolement')).should('be.visible');
  cy.get(dataSelector('designation')).should('not.exist');
  cy.get(dataSelector('pointage')).should('not.exist');
};

const thenOnlyTheResetActionsAreActive = (): void => {
  cy.get(dataSelector('reset-cancel')).should('be.focused').and('not.be.disabled');
  cy.get(dataSelector('reset-confirm')).should('not.be.disabled');
  cy.get(dataSelector('digit-0')).should('be.disabled');
  cy.get(dataSelector('validate')).should('be.disabled');
};

const thenNoOperatorIsDesignated = (): void => {
  cy.get(dataSelector('header-operator')).should('not.exist');
  cy.get(dataSelector('pointage')).should('not.exist');
};

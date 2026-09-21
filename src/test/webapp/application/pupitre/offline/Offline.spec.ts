import { dataSelector } from '../../../utils/DataSelector';
import { clearPupitreStorageFixture, givenDurablePupitreFixture, pupitreTokenFixture } from '../../../utils/PupitreStorageFixture';

const entrepriseFixture = 'entreprise-a';
const dateFixture = '2026-09-05T00:00:00Z';
const idFixture = '59ef737b-c3dd-47f8-8e63-4d5526a17df3';
const operateurFixture = '65f4ed5c-e9ba-41c6-9de9-735ef26ed559';
const bodyFixture = { id: idFixture, dateDeSurvenue: dateFixture, operateur: operateurFixture };

describe('Pupitre offline restart', () => {
  let online: boolean;

  it('should restore its enrolment and retry the same durable gesture after restarting without a network', () => {
    givenAnEnrolledPupitreWithAPendingGesture();

    whenRestartingAndReadingFailedPush('first-restart');
    whenRestartingAndReadingFailedPush('second-restart');
    whenTheNetworkReturns();
    whenReadingAcceptedPush();
    whenRestartingPupitre();

    thenFailedPushRetainedItsIdentityAndCredential('first-restart');
    thenFailedPushRetainedItsIdentityAndCredential('second-restart');
    thenTheSameGestureWasAcceptedWithoutEnrollingAgain();
    thenItDoesNotReplayAnAcknowledgedGesture();
  });

  afterEach(() => clearPupitreStorageFixture());

  const givenAnEnrolledPupitreWithAPendingGesture = (): void => {
    online = false;
    cy.intercept('POST', '**/protocol/openid-connect/auth/device', { statusCode: 503, body: {} }).as('enrolment');
    cy.intercept('POST', '**/protocol/openid-connect/token', { forceNetworkError: true });
    cy.intercept('GET', '/api/pupitre/referentiel', {
      body: { genereLe: '2026-09-05T08:05:00Z', operateurs: [], suivis: [] },
    }).as('reference');
    cy.intercept('POST', '/api/atelier/journees', request => {
      if (online) {
        request.reply({ statusCode: 200, body: {} });
      } else {
        request.reply({ forceNetworkError: true });
      }
    }).as('push');
    cy.visit('/');
    cy.wait('@enrolment');
    givenDurablePupitreFixture({
      entreprise: entrepriseFixture,
      geste: { id: idFixture, dateDeSurvenue: dateFixture, operateurId: operateurFixture },
    });
  };

  const whenRestartingPupitre = (): void => {
    cy.reload();
  };
  const whenTheNetworkReturns = (): void => {
    cy.then(() => {
      online = true;
    });
    cy.window().then(window => window.dispatchEvent(new Event('online')));
  };
  const whenRestartingAndReadingFailedPush = (alias: string): void => {
    whenRestartingPupitre();
    cy.wait('@push').its('request').as(`${alias}-request`, { type: 'static' });
    cy.get(dataSelector('pupitre-disconnected')).should('be.visible').invoke('text').as(`${alias}-status`, { type: 'static' });
    cy.get('@reference.all').its('length').as(`${alias}-reference`, { type: 'static' });
  };
  const whenReadingAcceptedPush = (): void => {
    cy.wait('@push').its('request').as('accepted-request', { type: 'static' });
    cy.get(dataSelector('pupitre-connected')).should('be.visible');
    cy.wait('@reference');
    cy.get('@push.all').its('length').as('accepted-push-count', { type: 'static' });
    cy.get('@enrolment.all').its('length').as('accepted-enrolment-count', { type: 'static' });
  };
  const thenFailedPushRetainedItsIdentityAndCredential = (alias: string): void => {
    thenOriginalSignedGestureWasSent(`${alias}-request`);
    cy.get(`@${alias}-status`).should('contain', 'Hors ligne');
    cy.get(`@${alias}-reference`).should('equal', 0);
  };
  const thenTheSameGestureWasAcceptedWithoutEnrollingAgain = (): void => {
    thenOriginalSignedGestureWasSent('accepted-request');
    cy.get('@accepted-enrolment-count').should('equal', 1);
  };
  const thenItDoesNotReplayAnAcknowledgedGesture = (): void => {
    cy.wait('@reference');
    cy.get<number>('@accepted-push-count').then(completedPushes => {
      cy.get('@push.all').should('have.length', completedPushes);
    });
    cy.get('@enrolment.all').should('have.length', 1);
    cy.get(dataSelector('pupitre-connected')).should('be.visible');
  };
  const thenOriginalSignedGestureWasSent = (alias: string): void => {
    cy.get(`@${alias}`).its('body').should('deep.equal', bodyFixture);
    cy.get(`@${alias}`)
      .its('headers.authorization')
      .should('equal', `Bearer ${pupitreTokenFixture(entrepriseFixture)}`);
  };
});

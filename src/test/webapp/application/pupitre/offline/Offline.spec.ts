import { dataSelector } from '../../../utils/DataSelector';
import { clearPupitreStorageFixture, givenDurablePupitreFixture } from '../../../utils/PupitreStorageFixture';

const entrepriseFixture = 'entreprise-a';
const dateFixture = '2026-09-05T00:00:00Z';
const idFixture = '59ef737b-c3dd-47f8-8e63-4d5526a17df3';
const operateurFixture = '65f4ed5c-e9ba-41c6-9de9-735ef26ed559';
const bodyFixture = { id: idFixture, dateDeSurvenue: dateFixture, operateur: operateurFixture };

describe('Pupitre offline restart', () => {
  let online: boolean;
  let completedPushes: number;

  it('should restore its enrolment and retry the same durable gesture after restarting without a network', () => {
    givenAnEnrolledPupitreWithAPendingGesture();

    whenRestartingPupitre();
    thenItKeepsTheGestureAndSignsTheFailedPush();
    whenRestartingPupitre();
    thenItKeepsTheGestureAndSignsTheFailedPush();
    whenTheNetworkReturns();

    thenItAcknowledgesTheSameGestureWithoutEnrollingAgain();
    whenRestartingPupitre();

    thenItDoesNotReplayAnAcknowledgedGesture();
  });

  afterEach(() => clearPupitreStorageFixture());

  const givenAnEnrolledPupitreWithAPendingGesture = (): void => {
    online = false;
    cy.intercept('POST', '**/protocol/openid-connect/auth/device', { statusCode: 503, body: {} }).as('enrolment');
    cy.intercept('POST', '**/protocol/openid-connect/token', { forceNetworkError: true });
    cy.intercept('GET', '/api/operateurs*', { body: { content: [], totalElementsCount: 0 } });
    cy.intercept('GET', '/api/atelier/suivis*', { body: { content: [], totalElementsCount: 0 } }).as('reference');
    cy.intercept('POST', '/api/atelier/journees', request => {
      expect(request.body).to.deep.equal(bodyFixture);
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
  const thenItKeepsTheGestureAndSignsTheFailedPush = (): void => {
    cy.wait('@push');
    cy.get(dataSelector('pupitre-disconnected')).should('be.visible');
    cy.wait('@reference');
  };
  const thenItDoesNotReplayAnAcknowledgedGesture = (): void => {
    cy.wait('@reference');
    cy.get<unknown[]>('@push.all').should(pushes => expect(pushes).to.have.length(completedPushes));
    cy.get('@enrolment.all').should('have.length', 1);
    cy.get(dataSelector('pupitre-connected')).should('be.visible');
  };
  const thenItAcknowledgesTheSameGestureWithoutEnrollingAgain = (): void => {
    cy.wait('@push');
    cy.get(dataSelector('pupitre-connected')).should('be.visible');
    cy.wait('@reference');
    cy.get<unknown[]>('@push.all').then(pushes => {
      completedPushes = pushes.length;
    });
    cy.get('@enrolment.all').should('have.length', 1);
  };
});

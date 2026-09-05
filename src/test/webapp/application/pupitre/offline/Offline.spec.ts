import { dataSelector } from '../../../utils/DataSelector';

const entrepriseFixture = 'entreprise-a';
const dateFixture = '2026-09-05T00:00:00Z';
const idFixture = '59ef737b-c3dd-47f8-8e63-4d5526a17df3';
const operateurFixture = '65f4ed5c-e9ba-41c6-9de9-735ef26ed559';
const bodyFixture = { id: idFixture, dateDeSurvenue: dateFixture, operateur: operateurFixture };

interface StoredQueueFixture {
  connecte: boolean;
  evenements: { etat: string; geste: { id: string; dateDeSurvenue: string } }[];
}

describe('Pupitre offline restart', () => {
  let online: boolean;

  it('should restore its enrolment and retry the same durable gesture after restarting without a network', () => {
    givenAnEnrolledPupitreWithAPendingGesture();

    whenRestartingWithoutNetwork();
    thenItKeepsTheGestureAndSignsTheFailedPush();
    whenRestartingWithoutNetwork();
    thenItKeepsTheGestureAndSignsTheFailedPush();
    whenTheNetworkReturns();

    thenItAcknowledgesTheSameGestureWithoutEnrollingAgain();
  });

  afterEach(() => {
    cy.window().then(
      window =>
        new Cypress.Promise<void>((resolve, reject) => {
          const request = window.indexedDB.deleteDatabase('glm-pupitre');
          request.onsuccess = () => resolve();
          request.onerror = () => reject(new Error('Impossible de nettoyer le stockage fixture'));
        }),
    );
  });

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
    cy.window().then(
      window =>
        new Cypress.Promise<void>((resolve, reject) => {
          const request = window.indexedDB.open('glm-pupitre', 1);
          request.onsuccess = () => {
            const database = request.result;
            const transaction = database.transaction('documents', 'readwrite');
            const token = `header.${window.btoa(JSON.stringify({ tenant: entrepriseFixture }))}.signature`;
            transaction.objectStore('documents').put(
              {
                tenant: entrepriseFixture,
                session: {
                  tenant: entrepriseFixture,
                  accessToken: token,
                  refreshToken: 'refresh-fixture',
                  expiresAt: Date.now() + 300_000,
                },
              },
              'enrolement',
            );
            transaction.objectStore('documents').put(
              {
                connecte: true,
                referentiel: { operateurs: [], suivis: [] },
                evenements: [
                  {
                    etat: 'EN_ATTENTE',
                    geste: { id: idFixture, dateDeSurvenue: dateFixture, operateurId: operateurFixture, nature: 'ARRIVEE' },
                  },
                ],
              },
              `atelier:${entrepriseFixture}`,
            );
            transaction.oncomplete = () => {
              database.close();
              resolve();
            };
            transaction.onabort = () => {
              database.close();
              reject(new Error('Fixture non conservee'));
            };
          };
          request.onerror = () => reject(new Error('Stockage fixture inaccessible'));
        }),
    );
  };

  const whenRestartingWithoutNetwork = (): void => {
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
    thenStoredOutcomeIs('EN_ATTENTE', false);
    cy.wait('@reference');
  };
  const thenItAcknowledgesTheSameGestureWithoutEnrollingAgain = (): void => {
    cy.wait('@push');
    cy.get(dataSelector('pupitre-connected')).should('be.visible');
    cy.wait('@reference');
    thenStoredOutcomeIs('ACCEPTE', true);
    cy.get('@enrolment.all').should('have.length', 1);
  };
  const thenStoredOutcomeIs = (etat: string, connecte: boolean): void => {
    cy.window()
      .then(
        window =>
          new Cypress.Promise<StoredQueueFixture>((resolve, reject) => {
            const opening = window.indexedDB.open('glm-pupitre', 1);
            opening.onsuccess = () => {
              const database = opening.result;
              const transaction = database.transaction('documents', 'readonly');
              const request = transaction.objectStore('documents').get(`atelier:${entrepriseFixture}`);
              transaction.oncomplete = () => {
                database.close();
                resolve(request.result as StoredQueueFixture);
              };
              transaction.onabort = () => {
                database.close();
                reject(new Error('Lecture fixture interrompue'));
              };
            };
            opening.onerror = () => reject(new Error('Stockage fixture inaccessible'));
          }),
      )
      .then(queue => {
        expect(queue.connecte).to.equal(connecte);
        expect(queue.evenements).to.have.length(1);
        expect(queue.evenements[0].etat).to.equal(etat);
        expect(queue.evenements[0].geste).to.include({ id: idFixture, dateDeSurvenue: dateFixture });
      });
  };
});

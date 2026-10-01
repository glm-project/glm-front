import { dataSelector } from '../../../utils/DataSelector';
import { interceptForever } from '../../../utils/Interceptor';
import { givenWorkshopSupervision } from '../../../utils/SupervisionApiFixture';

describe('Supervision atelier in back office', () => {
  afterEach(() => {
    cy.then(() =>
      Cypress.automation('remote:debugger:protocol', { command: 'Network.setCacheDisabled', params: { cacheDisabled: false } }),
    );
  });

  it('should acquire the connected workshop through the real HTTP adapter on the root route', () => {
    givenWorkshopSupervision();

    whenVisitingTheRoot();

    thenTheWorkshopWasAcquiredOverHttp();
  });

  it('should display the three supervision lanes on the root path', () => {
    whenVisitingTheRoot();

    thenTheThreeLanesAreDisplayed();
  });

  it('should replace a failed refresh with an error and recover on the next acquisition', () => {
    whenVisitingTheRoot();

    whenRefreshingDuringAnOutage();
    whenRestoringTheWorkshop();

    thenTheFailureHidTheCardsAndTheWorkshopRecovered();
  });

  it('should acquire a fresh view after remount while an obsolete acquisition is still pending', { defaultCommandTimeout: 15000 }, () => {
    givenIndependentNetworkRequests();
    whenVisitingTheRoot();

    whenRemountingDuringAnObsoleteRead();

    thenTheLateReadCannotReplaceTheRemountedWorkshop();
  });

  it('should retain activities and anomalies after refreshing supervision', () => {
    whenVisitingTheRoot();
    whenRefreshingTheWorkshop();

    thenTheActivityAndAnomaliesRemainVisible();
  });
});

const whenVisitingTheRoot = (): void => {
  givenWorkshopSupervision();
  cy.viewport(1440, 900);
  cy.clock(new Date(2026, 8, 24, 9, 10).getTime(), ['Date']);
  cy.visit('/');
};

const whenRefreshingTheWorkshop = (): void => {
  cy.get(dataSelector('supervision-refresh')).should('not.be.disabled').click();
  cy.get(dataSelector('supervision-refresh')).should('not.be.disabled');
};

const thenTheThreeLanesAreDisplayed = (): void => {
  [
    { couloir: 'supervision-couloir-au-travail', nombre: '6' },
    { couloir: 'supervision-couloir-sans-affectation', nombre: '5' },
    { couloir: 'supervision-couloir-absents', nombre: '2' },
  ].forEach(({ couloir, nombre }) => {
    cy.get(dataSelector(couloir)).find(dataSelector('supervision-couloir-nombre')).should('have.text', nombre);
  });
  cy.get(dataSelector('supervision-presents')).should('contain.text', 'Présents').and('contain.text', '11');
  cy.get(dataSelector('supervision-derniere-lecture')).should(
    'contain.text',
    '13 opérateurs · d’après les pointages reçus jusqu’à 09:10 · actualisé toutes les 30 s',
  );
};

const thenTheActivityAndAnomaliesRemainVisible = (): void => {
  cy.get(dataSelector('supervision-anomalie')).should('have.length', 4).and('be.visible');
  cy.get(dataSelector('supervision-couloir-absents'))
    .find(dataSelector('supervision-carte'))
    .filter('[data-operateur-id="op-perrin"]')
    .within(() => {
      cy.get(dataSelector('supervision-activite-element')).should('contain.text', 'OF').and('contain.text', '3006');
      cy.get(dataSelector('supervision-anomalie')).should('contain.text', 'Activité d’un opérateur absent');
    });
  cy.get(dataSelector('supervision-signal-nc')).should('contain.text', '2 en NC').and('contain.text', 'Garnier Thomas, Morel Inès');
  cy.get(dataSelector('supervision-signal-a-verifier'))
    .should('contain.text', '4 à vérifier')
    .and('contain.text', 'Dumas Julien, Marchand Kevin, Perrin Loïc, Schmitt Yanis');
  cy.screenshot('supervision-desktop', { capture: 'fullPage' });
};

const thenTheWorkshopWasAcquiredOverHttp = (): void => {
  cy.wait(['@supervisionOperators', '@supervisionVisits', '@supervisionActivities', '@supervisionWorkstations']);
  cy.get(dataSelector('supervision-carte')).should('have.length', 13);
  cy.get(dataSelector('supervision-couloir-sans-affectation'))
    .find(dataSelector('supervision-carte'))
    .filter('[data-operateur-id="op-dumas"]')
    .find(dataSelector('supervision-anomalie'))
    .should('contain.text', 'Pointages en conflit');
};

const whenRefreshingDuringAnOutage = (): void => {
  cy.get(dataSelector('supervision-refresh')).should('not.be.disabled');
  cy.intercept('GET', '/api/atelier/journees?*', { statusCode: 503, body: {} });
  whenRefreshingTheWorkshop();
  cy.get(dataSelector('supervision-error')).should('be.visible').invoke('text').as('outageMessage', { type: 'static' });
  cy.get('body')
    .then(body => body.find(dataSelector('supervision-carte')).length)
    .as('outageCardCount', { type: 'static' });
};

const whenRestoringTheWorkshop = (): void => {
  givenWorkshopSupervision();
  whenRefreshingTheWorkshop();
};

const thenTheFailureHidTheCardsAndTheWorkshopRecovered = (): void => {
  cy.get('@outageMessage').should('contain', 'Impossible de charger');
  cy.get('@outageCardCount').should('equal', 0);
  cy.get(dataSelector('supervision-carte')).should('have.length', 13);
  cy.get(dataSelector('supervision-error')).should('not.exist');
};

const givenIndependentNetworkRequests = (): void => {
  cy.then(() => Cypress.automation('remote:debugger:protocol', { command: 'Network.setCacheDisabled', params: { cacheDisabled: true } }));
};

const whenRemountingDuringAnObsoleteRead = (): void => {
  cy.get(dataSelector('supervision-refresh')).should('not.be.disabled');
  const obsolete = interceptForever({ method: 'GET', pathname: '/api/atelier/suivis' }, { statusCode: 503, body: {} }, 'obsoleteRead');
  cy.get(dataSelector('supervision-refresh')).click();
  cy.get(dataSelector('supervision-refresh')).should('be.disabled');
  cy.get(dataSelector('gestion-navigation-postes')).click();
  cy.get(dataSelector('supervision-atelier')).should('not.exist');
  givenWorkshopSupervision();
  cy.get(dataSelector('gestion-navigation-supervision')).click();
  cy.get(dataSelector('supervision-carte'))
    .should('have.length', 13)
    .then(() => obsolete.send());
  cy.wait('@obsoleteRead');
};

const thenTheLateReadCannotReplaceTheRemountedWorkshop = (): void => {
  cy.get(dataSelector('supervision-carte')).should('have.length', 13);
  cy.get(dataSelector('supervision-error')).should('not.exist');
};

import { components } from '@/app/generated/schema';
import { dataSelector } from '../../../utils/DataSelector';
import { AuthenticationFixture } from '../../../utils/gestion/authentication/AuthenticationFixture';
import { SupervisionApiFixture } from '../../../utils/gestion/supervision-atelier/SupervisionApiFixture';

let apiFixture: SupervisionApiFixture;

type RestSupervision = components['schemas']['RestSupervisionDAtelier'];
const connectedWorkshopFixture: RestSupervision = {
  evaluation: new Date(2026, 8, 24, 9, 57).toISOString(),
  operateurs: [{ id: 'op-connected-serin', nom: 'Sérin', prenom: 'Maya', metiers: ['Rectification'] }],
  activites: [
    {
      id: 'opening-connected-of',
      operateurId: 'op-connected-serin',
      element: { id: 'connected-of', categorie: 'OF', nom: 'OF connecté', reference: 'AT-42' },
      categorie: 'TRAVAIL',
      debut: new Date(2026, 8, 23, 21).toISOString(),
      echeance: new Date(2026, 8, 24, 10).toISOString(),
      etat: 'EN_COURS',
    },
  ],
  sequencesEnConflit: [],
};

const idleConnectedWorkshopFixture: RestSupervision = { ...connectedWorkshopFixture, activites: [] };

const renamedConnectedWorkshopFixture: RestSupervision = {
  ...idleConnectedWorkshopFixture,
  evaluation: new Date(2026, 8, 24, 9, 58).toISOString(),
  operateurs: [{ id: 'op-connected-serin', nom: 'Vallot', prenom: 'Maya', metiers: ['Fraisage', 'Tournage'] }],
};

const workshopWithWarningsFixture: RestSupervision = {
  ...idleConnectedWorkshopFixture,
  activites: [
    {
      id: 'opening-to-correct',
      operateurId: 'op-connected-serin',
      element: { id: 'of-to-correct', categorie: 'OF', nom: 'OF à corriger' },
      categorie: 'TRAVAIL',
      debut: new Date(2026, 8, 23, 8).toISOString(),
      echeance: new Date(2026, 8, 23, 21).toISOString(),
      etat: 'TERMINEE_AUTOMATIQUEMENT',
      finRetenue: new Date(2026, 8, 23, 21).toISOString(),
    },
  ],
  sequencesEnConflit: [{ id: 'sequence-to-correct', operateurId: 'op-connected-serin', activites: [] }],
};

describe('Supervision atelier in back office', () => {
  beforeEach(() => {
    apiFixture = new SupervisionApiFixture();
    apiFixture.intercept();
  });

  it('should open supervision after authentication completes without a premature session read', () => {
    const authenticationFixture = new AuthenticationFixture();
    givenConnectedWorkshop();

    whenOpeningAndCompletingAuthentication(authenticationFixture);

    thenSupervisionOpensAfterAuthentication();
  });

  it('should keep supervision closed when authentication is refused', () => {
    const authenticationFixture = new AuthenticationFixture();
    givenConnectedWorkshop();

    whenOpeningAndRefusingAuthentication(authenticationFixture);

    thenSupervisionStaysClosedAfterRefusal();
  });

  it('should display the connected workshop on the root path using the server evaluation before the browser deadline', () => {
    givenConnectedWorkshop();

    whenVisitingAtTheActivityDeadline();

    thenTheConnectedOperatorIsWorking();
  });
  it('should display the two supervision lanes on the root path', () => {
    whenVisitingTheRoot();

    thenTheTwoLanesAreDisplayed();
  });

  it('should retain activities and anomalies after refreshing supervision', () => {
    whenVisitingTheRoot();
    whenRefreshingTheWorkshop();

    thenTheActivityAndAnomaliesRemainVisible();
  });

  it('should replace the operator name and trades from the workshop referential after refreshing', () => {
    givenAnIdleConnectedWorkshop();

    whenVisitingTheRoot();
    whenRefreshingAfterReferentialChanges();

    thenTheUpdatedNameAndTradesAreDisplayed();
  });

  it('should replace the automatic finish and conflict warnings after a backend correction', () => {
    givenAWorkshopWithWarnings();

    whenVisitingTheRoot();
    whenRefreshingAfterBackendCorrection();

    thenTheCorrectedWorkshopHasNoWarnings();
  });

  it('should display a loading error without demonstration cards when the initial workshop read fails', () => {
    givenAnUnavailableWorkshop();

    whenVisitingTheRoot();

    thenTheWorkshopLoadingErrorIsDisplayed();
  });

  it('should replace cards with an error and recover from a later workshop read', () => {
    givenConnectedWorkshop();

    whenVisitingTheRoot();
    whenRereadingAnUnavailableWorkshopAndRecovering();

    thenTheErrorWasDisplayedAndFreshCardsAreVisible();
  });
});

const givenConnectedWorkshop = (): void => {
  apiFixture.replace(connectedWorkshopFixture);
};

const whenOpeningAndCompletingAuthentication = (authenticationFixture: AuthenticationFixture): void => {
  whenOpeningWithRetainedAuthentication(authenticationFixture);
  cy.then(() => authenticationFixture.release());
};

const whenOpeningAndRefusingAuthentication = (authenticationFixture: AuthenticationFixture): void => {
  whenOpeningWithRetainedAuthentication(authenticationFixture);
  cy.then(() => authenticationFixture.refuse());
};

const whenOpeningWithRetainedAuthentication = (authenticationFixture: AuthenticationFixture): void => {
  cy.viewport(1440, 900);
  cy.clock(new Date(2026, 8, 24, 9, 10).getTime(), ['Date']);
  cy.visit('/', {
    onBeforeLoad: window => {
      window.gestionAuthenticationFixture = authenticationFixture;
    },
  });
  cy.then(() => authenticationFixture.started);
  cy.get(dataSelector('gestion-header')).should('be.visible');
  cy.get(dataSelector('gestion-shell'))
    .then(shell => shell.find(dataSelector('supervision-atelier')).length)
    .as('screensBeforeAuthentication', { type: 'static' });
};

const thenSupervisionOpensAfterAuthentication = (): void => {
  cy.get('@screensBeforeAuthentication').should('eq', 0);
  thenTheConnectedOperatorIsWorking();
  cy.get(dataSelector('supervision-error')).should('not.exist');
};

const thenSupervisionStaysClosedAfterRefusal = (): void => {
  cy.get('@screensBeforeAuthentication').should('eq', 0);
  cy.get(dataSelector('gestion-header')).should('be.visible');
  cy.get(dataSelector('supervision-atelier')).should('not.exist');
};

const givenAnIdleConnectedWorkshop = (): void => {
  apiFixture.replace(idleConnectedWorkshopFixture);
};

const givenAWorkshopWithWarnings = (): void => {
  apiFixture.replace(workshopWithWarningsFixture);
};

const givenAnUnavailableWorkshop = (): void => {
  apiFixture.fail();
};

const thenTheWorkshopLoadingErrorIsDisplayed = (): void => {
  cy.get(dataSelector('supervision-error'))
    .should('be.visible')
    .and('contain.text', 'Impossible de charger les données de supervision. Réessayez avec « Actualiser ».');
  cy.get(dataSelector('supervision-carte')).should('not.exist');
  cy.get(dataSelector('supervision-derniere-lecture')).should('not.exist');
  cy.get(dataSelector('supervision-refresh')).should('not.be.disabled');
};

const whenRereadingAnUnavailableWorkshopAndRecovering = (): void => {
  cy.wait('@supervisionRead');
  cy.get(dataSelector('supervision-operateur-nom')).invoke('text').as('operatorBeforeFailure', { type: 'static' });
  cy.then(() => apiFixture.fail());
  cy.get(dataSelector('supervision-refresh')).should('not.be.disabled').click();
  cy.wait('@supervisionRead');
  cy.get(dataSelector('supervision-error')).should('be.visible').invoke('text').as('readError', { type: 'static' });
  cy.get(dataSelector('supervision-atelier'))
    .then(atelier => atelier.find(dataSelector('supervision-carte')).length)
    .as('cardsDuringFailure', { type: 'static' });
  cy.then(() => apiFixture.replace(renamedConnectedWorkshopFixture));
  cy.get(dataSelector('supervision-refresh')).should('not.be.disabled').click();
};

const thenTheErrorWasDisplayedAndFreshCardsAreVisible = (): void => {
  cy.get('@operatorBeforeFailure').should('eq', 'Sérin Maya');
  cy.get('@readError').should('contain', 'Impossible de charger les données de supervision.');
  cy.get('@cardsDuringFailure').should('eq', 0);
  thenTheUpdatedNameAndTradesAreDisplayed();
  cy.get(dataSelector('supervision-error')).should('not.exist');
  cy.get(dataSelector('supervision-activite')).should('not.exist');
};

const whenRefreshingAfterBackendCorrection = (): void => {
  cy.wait('@supervisionRead');
  cy.get(dataSelector('supervision-anomalie')).invoke('text').as('automaticWarningBeforeCorrection', { type: 'static' });
  cy.get(dataSelector('supervision-sequence-en-conflit')).invoke('text').as('conflictBeforeCorrection', { type: 'static' });
  cy.then(() => apiFixture.replace(idleConnectedWorkshopFixture));
  whenRefreshingTheWorkshop();
};

const thenTheCorrectedWorkshopHasNoWarnings = (): void => {
  cy.get('@automaticWarningBeforeCorrection').should('contain', 'Activité terminée automatiquement');
  cy.get('@conflictBeforeCorrection').should('contain', 'Séquence en conflit');
  cy.get(dataSelector('supervision-anomalie')).should('not.exist');
  cy.get(dataSelector('supervision-sequence-en-conflit')).should('not.exist');
  cy.get(dataSelector('supervision-signal-a-verifier')).should('have.text', '0 à vérifier');
  cy.get(dataSelector('supervision-couloir-sans-activite'))
    .find(dataSelector('supervision-operateur-nom'))
    .should('have.text', 'Sérin Maya');
};

const whenRefreshingAfterReferentialChanges = (): void => {
  cy.wait('@supervisionRead');
  cy.then(() => apiFixture.replace(renamedConnectedWorkshopFixture));
  whenRefreshingTheWorkshop();
};

const thenTheUpdatedNameAndTradesAreDisplayed = (): void => {
  cy.get(dataSelector('supervision-carte')).should('have.length', 1).and('have.attr', 'data-operateur-id', 'op-connected-serin');
  cy.get(dataSelector('supervision-operateur-nom')).should('have.text', 'Vallot Maya');
  cy.get(dataSelector('supervision-metiers')).should('have.text', 'Métiers : Fraisage, Tournage');
  cy.get(dataSelector('supervision-derniere-lecture')).should('contain.text', '09:58');
};

const whenVisitingAtTheActivityDeadline = (): void => {
  cy.viewport(1440, 900);
  cy.clock(new Date(2026, 8, 24, 10).getTime(), ['Date']);
  cy.visit('/');
};

const thenTheConnectedOperatorIsWorking = (): void => {
  cy.get(dataSelector('supervision-couloir-au-travail')).find(dataSelector('supervision-operateur-nom')).should('have.text', 'Sérin Maya');
  cy.get(dataSelector('supervision-carte')).should('have.length', 1);
  cy.get(dataSelector('supervision-activite-element')).should('contain.text', 'AT-42');
  cy.get(dataSelector('supervision-derniere-lecture')).should('contain.text', '09:57');
};

const whenVisitingTheRoot = (): void => {
  cy.viewport(1440, 900);
  cy.clock(new Date(2026, 8, 24, 9, 10).getTime(), ['Date']);
  cy.visit('/');
};

const whenRefreshingTheWorkshop = (): void => {
  cy.get(dataSelector('supervision-refresh')).should('not.be.disabled').click();
  cy.get(dataSelector('supervision-refresh')).should('not.be.disabled');
  cy.get(dataSelector('supervision-plateau')).should('not.have.attr', 'aria-busy');
};

const thenTheTwoLanesAreDisplayed = (): void => {
  [
    { couloir: 'supervision-couloir-au-travail', nombre: '6' },
    { couloir: 'supervision-couloir-sans-activite', nombre: '7' },
  ].forEach(({ couloir, nombre }) => {
    cy.get(dataSelector(couloir)).find(dataSelector('supervision-couloir-nombre')).should('have.text', nombre);
  });
  cy.get(dataSelector('supervision-derniere-lecture')).should(
    'contain.text',
    '13 opérateurs · d’après les pointages reçus jusqu’à 09:10 · actualisé toutes les 30 s',
  );
};

const thenTheActivityAndAnomaliesRemainVisible = (): void => {
  cy.get(dataSelector('supervision-anomalie')).should('have.length', 1).and('be.visible');
  cy.get(dataSelector('supervision-couloir-sans-activite'))
    .find(dataSelector('supervision-carte'))
    .filter('[data-operateur-id="op-perrin"]')
    .within(() => {
      cy.get(dataSelector('supervision-sequence-en-conflit')).should('contain.text', 'Séquence en conflit').and('contain.text', 'OF 3006');
      cy.get(dataSelector('supervision-activite')).should('not.exist');
    });
  cy.get(dataSelector('supervision-signal-nc')).should('contain.text', '2 en NC').and('contain.text', 'Garnier Thomas, Morel Inès');
  cy.get(dataSelector('supervision-signal-a-verifier'))
    .should('contain.text', '4 à vérifier')
    .and('contain.text', 'Marchand Kevin, Morel Inès, Perrin Loïc, Schmitt Yanis');
};

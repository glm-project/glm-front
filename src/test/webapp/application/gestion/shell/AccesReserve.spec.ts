import { dataSelector } from '../../../utils/DataSelector';
import {
  dossierFinAutomatiqueFixture,
  givenTheReferentielFinAutomatique,
  ouvrantFinAutomatiqueFixture,
  suiviFinAutomatiqueFixture,
} from '../../../utils/gestion/anomalies-de-pointage/FinAutomatiqueHttp.fixture';
import { givenTheElementsFinsAutomatiques } from '../../../utils/gestion/anomalies-de-pointage/FinsAutomatiquesHttp.fixture';
import { AuthenticationFixture } from '../../../utils/gestion/authentication/AuthenticationFixture';
import type {} from '../../../utils/gestion/authentication/RolesFixture';
import { ElementsApiFixture } from '../../../utils/gestion/element-de-fabrication/ElementsApiFixture';
import { SupervisionApiFixture } from '../../../utils/gestion/supervision-atelier/SupervisionApiFixture';

const ROLES_WITHOUT_GESTIONNAIRE = ['ROLE_USER'];
const LATE_REQUEST_HORIZON_FIXTURE_MS = 500;
const DOSSIER_ADDRESS = `/anomalies/${suiviFinAutomatiqueFixture}?pointage=${ouvrantFinAutomatiqueFixture}`;

describe('Gestion shell, opened to the gestionnaire alone', () => {
  beforeEach(() => {
    new SupervisionApiFixture().intercept();
    new ElementsApiFixture().install();
    givenTheReferentielFinAutomatique();
    givenTheElementsFinsAutomatiques();
    givenAnAddressedDossier();
  });

  it('should show the header, without navigation or screen, while authentication is in progress', () => {
    const authenticationFixture = new AuthenticationFixture();

    whenOpeningTheDossierWithRetainedAuthentication(authenticationFixture);

    thenOnlyTheBareHeaderIsVisible();
  });

  it('should open the dossier for a gestionnaire once authentication completes', () => {
    const authenticationFixture = new AuthenticationFixture();

    whenOpeningTheDossierWithRetainedAuthentication(authenticationFixture);
    whenAuthenticationCompletes(authenticationFixture);

    thenTheDossierIsDisplayed();
  });

  it('should keep the address, show no reserved access screen and report only the refusal when authentication is refused', () => {
    const authenticationFixture = new AuthenticationFixture();
    const reportedErrors: string[] = [];

    whenOpeningTheDossierWithRetainedAuthentication(authenticationFixture, reportedErrors);
    whenAuthenticationIsRefused(authenticationFixture);

    thenTheAddressIsUnchangedAndOnlyTheRefusalIsReported(reportedErrors);
  });
});

describe('Gestion shell, for an account without the gestionnaire role', () => {
  beforeEach(() => {
    cy.intercept('/api/**').as('api');
  });

  [
    { screen: 'a dossier of anomalies', address: DOSSIER_ADDRESS, routedScreen: 'anomalie-retour' },
    { screen: 'the settings', address: '/parametres', routedScreen: 'parametres' },
    { screen: 'the cost of an element', address: '/couts-de-revient/element-1', routedScreen: 'cout-de-revient-page' },
    { screen: 'the supervision', address: '/', routedScreen: 'supervision-atelier' },
  ].forEach(({ screen, address, routedScreen }) => {
    it(`should reserve the access when opening ${screen}, and send no request to the API`, () => {
      whenOpeningWithoutTheGestionnaireRole(address, new AuthenticationFixture());
      whenALateRequestHadTimeToLeave();

      thenOnlyTheReservedAccessScreenIsShown(routedScreen);
      thenNoRequestWasSentToTheApi();
    });
  });

  it('should end the session from the reserved access screen', () => {
    const authenticationFixture = new AuthenticationFixture();
    whenOpeningWithoutTheGestionnaireRole('/', authenticationFixture);

    whenLeavingFromTheReservedAccessScreen();

    thenTheSessionIsOver(authenticationFixture);
  });
});

const givenAnAddressedDossier = (): void => {
  cy.intercept('GET', `/api/atelier/suivis/${suiviFinAutomatiqueFixture}/anomalies/${ouvrantFinAutomatiqueFixture}`, {
    body: dossierFinAutomatiqueFixture(),
  });
};

const opening =
  (authenticationFixture: AuthenticationFixture, roles?: readonly string[], errors?: string[]) =>
  (window: Cypress.AUTWindow): void => {
    window.gestionAuthenticationFixture = authenticationFixture;
    if (roles !== undefined) window.gestionRolesFixture = roles;
    if (errors !== undefined) {
      cy.stub(window.console, 'error').callsFake((failure: unknown) => {
        errors.push(String(failure));
      });
    }
  };

const whenOpeningTheDossierWithRetainedAuthentication = (authenticationFixture: AuthenticationFixture, errors?: string[]): void => {
  cy.viewport(1440, 900);
  cy.visit(DOSSIER_ADDRESS, { onBeforeLoad: opening(authenticationFixture, undefined, errors) });
  cy.then(() => authenticationFixture.started);
  cy.get(dataSelector('gestion-header')).should('be.visible');
};

const whenOpeningWithoutTheGestionnaireRole = (address: string, authenticationFixture: AuthenticationFixture): void => {
  cy.viewport(1440, 900);
  cy.visit(address, { onBeforeLoad: opening(authenticationFixture, ROLES_WITHOUT_GESTIONNAIRE) });
  cy.then(() => authenticationFixture.started);
  cy.then(() => authenticationFixture.release());
  cy.get(dataSelector('gestion-acces-reserve')).should('be.visible');
};

const elapse = (milliseconds: number): void => {
  cy.wait(milliseconds);
};

const whenALateRequestHadTimeToLeave = (): void => {
  elapse(LATE_REQUEST_HORIZON_FIXTURE_MS);
};

const whenAuthenticationCompletes = (authenticationFixture: AuthenticationFixture): void => {
  cy.then(() => authenticationFixture.release());
};

const whenAuthenticationIsRefused = (authenticationFixture: AuthenticationFixture): void => {
  cy.then(() => authenticationFixture.refuse());
};

const whenLeavingFromTheReservedAccessScreen = (): void => {
  cy.get(dataSelector('gestion-acces-reserve-deconnexion')).click();
};

const thenOnlyTheBareHeaderIsVisible = (): void => {
  cy.get(dataSelector('gestion-header')).should('be.visible');
  cy.get(dataSelector('gestion-logout')).should('be.visible');
  cy.get(dataSelector('gestion-navigation')).should('not.exist');
  cy.get(dataSelector('gestion-parametres')).should('not.exist');
  cy.get(dataSelector('gestion-acces-reserve')).should('not.exist');
  cy.get('router-outlet').should('not.exist');
  cy.location('pathname').should('eq', `/anomalies/${suiviFinAutomatiqueFixture}`);
};

const thenTheDossierIsDisplayed = (): void => {
  cy.get(dataSelector('anomalie-retour')).should('be.visible');
  cy.location('pathname').should('eq', `/anomalies/${suiviFinAutomatiqueFixture}`);
};

const thenOnlyTheReservedAccessScreenIsShown = (routedScreen: string): void => {
  cy.get(dataSelector('gestion-acces-reserve')).should('be.visible').and('contain.text', 'Accès réservé aux gestionnaires');
  cy.get(dataSelector('gestion-acces-reserve-deconnexion')).should('be.visible');
  cy.get(dataSelector('gestion-navigation')).should('not.exist');
  cy.get('router-outlet').should('not.exist');
  cy.get(dataSelector(routedScreen)).should('not.exist');
};

const thenNoRequestWasSentToTheApi = (): void => {
  cy.get('@api.all').should('have.length', 0);
};

const thenTheSessionIsOver = (authenticationFixture: AuthenticationFixture): void => {
  cy.wrap(authenticationFixture).invoke('currentToken').should('be.undefined');
};

const thenTheAddressIsUnchangedAndOnlyTheRefusalIsReported = (reportedErrors: readonly string[]): void => {
  cy.wrap(reportedErrors).should('deep.equal', ['Error: login refused']);
  cy.location('pathname').should('eq', `/anomalies/${suiviFinAutomatiqueFixture}`);
  cy.get(dataSelector('gestion-acces-reserve')).should('not.exist');
  cy.get('router-outlet').should('not.exist');
};

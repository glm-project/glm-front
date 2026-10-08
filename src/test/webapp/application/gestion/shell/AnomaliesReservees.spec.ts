import { dataSelector } from '../../../utils/DataSelector';
import {
  dossierFixture,
  finFixture,
  givenTheElements,
  givenTheReferentiel,
  suiviFixture,
} from '../../../utils/gestion/anomalies-de-pointage/AnomaliesHttp.fixture';
import { AtelierApiFixture } from '../../../utils/gestion/atelier/AtelierApiFixture';
import { AuthenticationFixture } from '../../../utils/gestion/authentication/AuthenticationFixture';
import type {} from '../../../utils/gestion/authentication/RolesFixture';
import { SupervisionApiFixture } from '../../../utils/gestion/supervision-atelier/SupervisionApiFixture';

const CONSULTANT_ROLES = ['ROLE_CONSULTANT'];
const DOSSIER_ADDRESS = `/anomalies/${suiviFixture}?pointage=${finFixture}`;

describe('Anomalies reserved to the gestionnaire', () => {
  beforeEach(() => {
    new SupervisionApiFixture().intercept();
    new AtelierApiFixture().install();
    givenTheReferentiel();
    givenTheElements();
    givenAnAddressedDossier();
  });

  it('should keep the dossier closed behind a visible header while the roles are unknown', () => {
    const authenticationFixture = new AuthenticationFixture();

    whenOpeningTheDossierWithRetainedAuthentication(authenticationFixture);

    thenTheHeaderIsVisibleAndTheDossierAbsent();
  });

  it('should open the dossier for a gestionnaire once authentication completes', () => {
    const authenticationFixture = new AuthenticationFixture();

    whenOpeningTheDossierWithRetainedAuthentication(authenticationFixture);
    whenAuthenticationCompletes(authenticationFixture);

    thenTheDossierIsDisplayed();
  });

  it('should send a consultant to the supervision once authentication completes', () => {
    const authenticationFixture = new AuthenticationFixture();

    whenOpeningTheDossierWithRetainedAuthentication(authenticationFixture, CONSULTANT_ROLES);
    whenAuthenticationCompletes(authenticationFixture);

    thenTheConsultantIsOnTheSupervisionWithoutTheAnomaliesEntry();
  });

  it('should keep the address and report only the refusal when authentication is refused', () => {
    const authenticationFixture = new AuthenticationFixture();
    const reportedErrors: string[] = [];

    whenOpeningTheDossierWithRetainedAuthentication(authenticationFixture, CONSULTANT_ROLES, reportedErrors);
    whenAuthenticationIsRefused(authenticationFixture);

    thenTheAddressIsUnchangedAndOnlyTheRefusalIsReported(reportedErrors);
  });

  it('should send a consultant who opens the list of anomalies to the supervision', () => {
    whenVisitingTheListAsAConsultant();

    thenTheConsultantIsOnTheSupervisionWithoutTheAnomaliesEntry();
  });

  it('should return a consultant to the previous page, not to the reserved address, when going back from the redirection', () => {
    whenVisitingTheWorkshopThenTheListAsAConsultantAndGoingBack();

    thenTheConsultantIsBackOnTheWorkshop();
  });
});

const givenAnAddressedDossier = (): void => {
  cy.intercept('GET', `/api/atelier/suivis/${suiviFixture}/anomalies/${finFixture}`, { body: dossierFixture() });
};

const openingWithRoles =
  (roles: readonly string[] | undefined, authenticationFixture?: AuthenticationFixture, errors?: string[]) =>
  (window: Cypress.AUTWindow): void => {
    if (authenticationFixture !== undefined) window.gestionAuthenticationFixture = authenticationFixture;
    if (roles !== undefined) window.gestionRolesFixture = roles;
    if (errors !== undefined) {
      cy.stub(window.console, 'error').callsFake((failure: unknown) => {
        errors.push(String(failure));
      });
    }
  };

const whenOpeningTheDossierWithRetainedAuthentication = (
  authenticationFixture: AuthenticationFixture,
  roles?: readonly string[],
  errors?: string[],
): void => {
  cy.viewport(1440, 900);
  cy.visit(DOSSIER_ADDRESS, { onBeforeLoad: openingWithRoles(roles, authenticationFixture, errors) });
  cy.then(() => authenticationFixture.started);
  cy.get(dataSelector('gestion-header')).should('be.visible');
};

const whenAuthenticationCompletes = (authenticationFixture: AuthenticationFixture): void => {
  cy.then(() => authenticationFixture.release());
};

const whenAuthenticationIsRefused = (authenticationFixture: AuthenticationFixture): void => {
  cy.then(() => authenticationFixture.refuse());
};

const whenVisitingTheListAsAConsultant = (): void => {
  cy.viewport(1440, 900);
  cy.visit('/anomalies', { onBeforeLoad: openingWithRoles(CONSULTANT_ROLES) });
};

const whenVisitingTheWorkshopThenTheListAsAConsultantAndGoingBack = (): void => {
  cy.viewport(1440, 900);
  cy.visit('/atelier', { onBeforeLoad: openingWithRoles(CONSULTANT_ROLES) });
  cy.get(dataSelector('gestion-header')).should('be.visible');
  cy.visit('/anomalies', { onBeforeLoad: openingWithRoles(CONSULTANT_ROLES) });
  cy.location('pathname').should('eq', '/');
  cy.go('back');
};

const thenTheHeaderIsVisibleAndTheDossierAbsent = (): void => {
  cy.get(dataSelector('gestion-header')).should('be.visible');
  cy.get(dataSelector('anomalie-retour')).should('not.exist');
  cy.location('pathname').should('eq', `/anomalies/${suiviFixture}`);
};

const thenTheDossierIsDisplayed = (): void => {
  cy.get(dataSelector('anomalie-retour')).should('be.visible');
  cy.get(dataSelector('anomalie-pointage')).should('have.length', 3);
  cy.location('pathname').should('eq', `/anomalies/${suiviFixture}`);
};

const thenTheConsultantIsOnTheSupervisionWithoutTheAnomaliesEntry = (): void => {
  cy.location('pathname').should('eq', '/');
  cy.get(dataSelector('supervision-atelier')).should('be.visible');
  cy.get(dataSelector('gestion-navigation-supervision')).should('exist');
  cy.get(dataSelector('gestion-navigation-anomalies')).should('not.exist');
  cy.get(dataSelector('anomalie-retour')).should('not.exist');
};

const thenTheAddressIsUnchangedAndOnlyTheRefusalIsReported = (reportedErrors: readonly string[]): void => {
  cy.wrap(reportedErrors).should('deep.equal', ['Error: login refused']);
  cy.location('pathname').should('eq', `/anomalies/${suiviFixture}`);
  cy.get(dataSelector('anomalie-retour')).should('not.exist');
  cy.get(dataSelector('supervision-atelier')).should('not.exist');
};

const thenTheConsultantIsBackOnTheWorkshop = (): void => {
  cy.location('pathname').should('eq', '/atelier');
  cy.get(dataSelector('gestion-header')).should('be.visible');
};

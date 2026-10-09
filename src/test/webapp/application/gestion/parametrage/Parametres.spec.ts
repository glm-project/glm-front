import { dataSelector } from '../../../utils/DataSelector';
import type {} from '../../../utils/gestion/authentication/RolesFixture';
import { ParametrageApiFixture } from '../../../utils/gestion/parametrage/ParametrageApiFixture';
import { SupervisionApiFixture } from '../../../utils/gestion/supervision-atelier/SupervisionApiFixture';

const CONSULTANT_ROLES = ['ROLE_CONSULTANT'];

describe('Company settings in gestion', () => {
  beforeEach(() => new SupervisionApiFixture().intercept());

  it('should reach the settings from the gestion header', () => {
    givenSettings();
    whenOpeningFromTheHeader();

    thenTheDurationIs('13');
  });

  it('should save the maximum duration of an activity and read it again', () => {
    const api = givenSettings();
    whenVisitingSettings();
    whenSavingTheDuration('10');
    whenVisitingSettings();

    thenTheDurationWasSavedAs(api, '10');
  });

  it('should send a consultant who opens the settings to the supervision, without the settings access', () => {
    givenSettings();
    whenVisitingSettingsAsAConsultant();

    thenTheConsultantIsOnTheSupervisionWithoutTheSettingsAccess();
  });
});

const givenSettings = (): ParametrageApiFixture => {
  const api = new ParametrageApiFixture();
  api.install();
  return api;
};

const whenOpeningFromTheHeader = (): void => {
  cy.viewport(1440, 900);
  cy.visit('/');
  cy.get(dataSelector('gestion-parametres')).click();
};

const whenVisitingSettings = (): void => {
  cy.viewport(1440, 900);
  cy.visit('/parametres');
  cy.wait('@parametrageRead');
};

const whenSavingTheDuration = (heures: string): void => {
  cy.get(dataSelector('duree-max')).clear();
  cy.get(dataSelector('duree-max')).type(heures);
  cy.get(dataSelector('duree-save')).click();
  cy.wait('@dureeUpdate');
  cy.get(dataSelector('duree-saved')).should('be.visible');
};

const whenVisitingSettingsAsAConsultant = (): void => {
  cy.viewport(1440, 900);
  cy.visit('/parametres', {
    onBeforeLoad: window => {
      window.gestionRolesFixture = CONSULTANT_ROLES;
    },
  });
};

const thenTheDurationIs = (heures: string): void => {
  cy.location('pathname').should('eq', '/parametres');
  cy.get(dataSelector('duree-max')).should('have.value', heures);
};

const thenTheDurationWasSavedAs = (api: ParametrageApiFixture, heures: string): void => {
  cy.wrap(api.durees).should('deep.equal', [`PT${heures}H`]);
  cy.get(dataSelector('duree-max')).should('have.value', heures);
};

const thenTheConsultantIsOnTheSupervisionWithoutTheSettingsAccess = (): void => {
  cy.location('pathname').should('eq', '/');
  cy.get(dataSelector('supervision-atelier')).should('be.visible');
  cy.get(dataSelector('gestion-parametres')).should('not.exist');
};

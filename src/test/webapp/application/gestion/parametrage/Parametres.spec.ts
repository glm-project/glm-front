import { dataSelector } from '../../../utils/DataSelector';
import type {} from '../../../utils/gestion/authentication/RolesFixture';
import { ParametrageApiFixture, pngFixture } from '../../../utils/gestion/parametrage/ParametrageApiFixture';
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

  it('should send the chosen logo at once and show it', () => {
    const api = givenSettings();
    whenVisitingSettings();
    whenChoosingTheLogo(pngFixture(50, 50));

    thenTheLogoIsShown(api);
  });

  it('should refuse a logo of the wrong size without sending it', () => {
    const api = givenSettings();
    whenVisitingSettings();
    whenChoosingTheLogo(pngFixture(300, 80));

    thenTheLogoIsRefusedWithoutBeingSent(api, 'Le logo doit tenir dans 256 × 256 pixels (reçu : 300 × 80).');
  });

  it('should remove the logo after a confirmation and show the GLM logo again', () => {
    const api = givenSettingsWithALogo();
    whenVisitingSettings();
    whenRemovingTheLogo();

    thenTheGlmLogoIsBack(api);
  });

  it('should show the logo of the company in the header, in place of the GLM logo', () => {
    givenSettingsWithALogo();
    whenVisitingSettings();

    thenTheHeaderShowsTheCompanyLogo();
  });

  it('should show the chosen logo in the header at once, without reloading the page', () => {
    const api = givenSettings();
    whenVisitingSettings();
    whenChoosingTheLogo(pngFixture(50, 50));

    thenTheLogoIsShown(api);
    thenTheHeaderShowsTheCompanyLogo();
  });

  it('should fit a wide logo in the header, without deforming it', () => {
    givenSettingsWithAWideLogo();
    whenVisitingSettings();

    thenTheHeaderLogoMeasures(81.92, 32);
  });

  it('should preview a wide logo at its real size', () => {
    givenSettingsWithAWideLogo();
    whenVisitingSettings();

    thenThePreviewMeasures(256, 100);
  });

  it('should send a consultant who opens the settings to the supervision, without the settings access', () => {
    givenSettings();
    whenVisitingSettingsAsAConsultant();

    thenTheConsultantIsOnTheSupervisionWithoutTheSettingsAccess();
  });
});

const givenSettings = (api = new ParametrageApiFixture()): ParametrageApiFixture => {
  api.install();
  return api;
};

const givenSettingsWithALogo = (api = new ParametrageApiFixture()): ParametrageApiFixture => {
  givenSettings(api).logo = 'aaaaaaaaaaaaaaaa';
  return api;
};

const givenSettingsWithAWideLogo = (): void => {
  givenSettingsWithALogo(new ParametrageApiFixture({ largeur: 256, hauteur: 100 }));
};

const whenRemovingTheLogo = (): void => {
  cy.get(dataSelector('logo-retirer')).click();
  cy.get(dataSelector('logo-retrait-confirmer')).click();
  cy.wait('@logoRetrait');
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

const whenChoosingTheLogo = (octets: Uint8Array): void => {
  cy.get(dataSelector('logo-fichier')).selectFile(
    { contents: Cypress.Buffer.from(octets), fileName: 'logo.png', mimeType: 'image/png' },
    { force: true },
  );
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

const thenTheLogoIsShown = (api: ParametrageApiFixture): void => {
  cy.wait('@logoDepot');
  cy.wait('@logoImage');
  cy.get(dataSelector('logo-enregistre')).should('have.text', 'Logo enregistré.');
  cy.get(dataSelector('logo-apercu'))
    .should('have.attr', 'src')
    .and('match', /^data:image\/png;base64,/);
  cy.wrap(api).its('depots').should('eq', 1);
};

const thenTheLogoIsRefusedWithoutBeingSent = (api: ParametrageApiFixture, refus: string): void => {
  cy.get(dataSelector('logo-refus')).should('have.text', refus);
  cy.wrap(api).its('depots').should('eq', 0);
};

const thenTheGlmLogoIsBack = (api: ParametrageApiFixture): void => {
  cy.get(dataSelector('logo-retire')).should('have.text', 'Logo retiré. Les en-têtes affichent le logo GLM.');
  cy.get(dataSelector('logo-glm')).should('be.visible');
  cy.get(dataSelector('logo-retirer')).should('not.exist');
  cy.wrap(api).its('retraits').should('eq', 1);
};

const thenTheHeaderShowsTheCompanyLogo = (): void => {
  cy.get(dataSelector('gestion-header'))
    .find(dataSelector('logo-de-l-entreprise'))
    .should('be.visible')
    .and('have.attr', 'src')
    .and('match', /^data:image\/png;base64,/);
};

const thenTheHeaderLogoMeasures = (largeur: number, hauteur: number): void => {
  cy.get(dataSelector('gestion-header'))
    .find(dataSelector('logo-de-l-entreprise'))
    .should(image => {
      const cadre = image.get(0).getBoundingClientRect();
      expect(cadre.width).to.be.closeTo(largeur, 0.5);
      expect(cadre.height).to.be.closeTo(hauteur, 0.5);
    });
};

const thenThePreviewMeasures = (largeur: number, hauteur: number): void => {
  cy.get(dataSelector('logo-apercu')).should(image => {
    const cadre = image.get(0).getBoundingClientRect();
    expect(cadre.width).to.equal(largeur);
    expect(cadre.height).to.equal(hauteur);
  });
};

const thenTheConsultantIsOnTheSupervisionWithoutTheSettingsAccess = (): void => {
  cy.location('pathname').should('eq', '/');
  cy.get(dataSelector('supervision-atelier')).should('be.visible');
  cy.get(dataSelector('gestion-parametres')).should('not.exist');
};

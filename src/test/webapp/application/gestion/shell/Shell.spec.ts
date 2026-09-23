import { dataSelector } from '../../../utils/DataSelector';
import { AtelierApiFixture } from '../../../utils/gestion/atelier/AtelierApiFixture';
import { SyntheseDesHeuresApiFixture } from '../../../utils/gestion/releve-des-heures/SyntheseDesHeuresApiFixture';

describe('Gestion shell', () => {
  it('should boot the gestion front on its own port', () => {
    whenVisitingTheRoot();

    thenTheBackOfficeShellIsMounted();
  });

  it('should mark the section of the current page in the navigation', () => {
    givenAWideScreen();
    new SyntheseDesHeuresApiFixture().install();

    whenVisitingTheHoursOfAnOperator();

    thenOnlyTheOperatorsSectionIsCurrent();
  });

  it('should fold the navigation away once a destination is chosen on a narrow screen', () => {
    givenANarrowScreen();
    new AtelierApiFixture().install();
    whenVisitingTheRoot();

    whenChoosingTheWorkshopFromTheMenu();

    thenTheMenuIsFolded();
  });
});

const givenAWideScreen = (): void => {
  cy.viewport(1280, 900);
};

const givenANarrowScreen = (): void => {
  cy.viewport(390, 844);
};

const whenVisitingTheRoot = (): void => {
  cy.visit('/');
};

const whenVisitingTheHoursOfAnOperator = (): void => {
  cy.visit('/operateurs/op-1/heures');
};

const whenChoosingTheWorkshopFromTheMenu = (): void => {
  cy.get(dataSelector('gestion-navigation-atelier')).should('not.be.visible');
  cy.get(dataSelector('gestion-menu')).click();
  cy.get(dataSelector('gestion-navigation-atelier')).click();
};

const thenTheBackOfficeShellIsMounted = (): void => {
  cy.get(dataSelector('gestion-shell')).should('exist');
};

const thenOnlyTheOperatorsSectionIsCurrent = (): void => {
  cy.get(dataSelector('gestion-navigation-operateurs')).should('have.attr', 'aria-current', 'page');
  cy.get(dataSelector('gestion-navigation-supervision')).should('not.have.attr', 'aria-current');
};

const thenTheMenuIsFolded = (): void => {
  cy.location('pathname').should('eq', '/atelier');
  cy.get(dataSelector('gestion-menu')).should('have.attr', 'aria-expanded', 'false');
  cy.get(dataSelector('gestion-navigation-atelier')).should('not.be.visible');
};

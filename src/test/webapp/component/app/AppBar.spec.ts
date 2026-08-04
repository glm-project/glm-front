import { dataSelector } from '../utils/DataSelector';

describe('App bar', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('display the application bar with its menu trigger and the logout button', () => {
    cy.get(dataSelector('app-bar')).should('be.visible').and('contain.text', 'glmfront');
    cy.get(dataSelector('app-bar-menu-trigger')).should('be.visible');
    cy.get(dataSelector('logout-button')).should('be.visible').and('contain.text', 'Logout');
  });

  it('open the dropdown menu on click on the menu trigger', () => {
    cy.get(dataSelector('app-bar-menu')).should('not.exist');
    cy.get(dataSelector('app-bar-menu-trigger')).should('have.attr', 'aria-expanded', 'false');

    cy.get(dataSelector('app-bar-menu-trigger')).click();

    cy.get(dataSelector('app-bar-menu')).should('be.visible');
    cy.get(dataSelector('app-bar-menu-trigger')).should('have.attr', 'aria-expanded', 'true');
  });
});

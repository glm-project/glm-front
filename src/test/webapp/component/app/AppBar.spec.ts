/*
 * La barre applicative n'est plus un `mat-toolbar` mais du HTML natif style en Tailwind, avec un menu
 * deroulant spartan. Les tests unitaires jsdom n'asserent que `appName()` : une barre cassee (icone
 * absente, menu qui ne s'ouvre pas) y passerait inapercue. Ce test couvre donc le rendu reel dans un
 * navigateur.
 *
 * Les selecteurs s'appuient sur le contrat ARIA (`aria-label`, `role="menu"`, `aria-expanded`) et non
 * sur les classes generees par spartan, qui sont du code tiers susceptible de changer.
 */
describe('App bar', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('display the application bar with its menu trigger and the logout button', () => {
    cy.get('header').should('be.visible');

    cy.get('header button[aria-label="Menu"]').should('be.visible');
    cy.get('header button[aria-label="Menu"] ng-icon svg').should('exist');

    cy.get('header #btn-logout').should('be.visible').and('contain.text', 'Logout');

    cy.screenshot('app-bar');
  });

  it('open the dropdown menu on click on the menu trigger', () => {
    cy.get('[role="menu"]').should('not.exist');
    cy.get('header button[aria-label="Menu"]').should('have.attr', 'aria-expanded', 'false');

    cy.get('header button[aria-label="Menu"]').click();

    cy.get('[role="menu"]').should('be.visible');
    cy.get('header button[aria-label="Menu"]').should('have.attr', 'aria-expanded', 'true');
  });
});

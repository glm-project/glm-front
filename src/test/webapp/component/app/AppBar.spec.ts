/*
 * La barre applicative n'est plus un `mat-toolbar` mais du HTML natif style en Tailwind, avec un menu
 * deroulant spartan. Les tests unitaires jsdom n'asserent que `appName()` : une barre cassee (icone
 * absente, menu qui ne s'ouvre pas) y passerait inapercue. Ce test couvre donc le rendu reel dans un
 * navigateur.
 *
 * Les selecteurs s'appuient sur le contrat ARIA (`aria-label`, `role="menu"`, `aria-expanded`) et non
 * sur les classes generees par spartan, qui sont du code tiers susceptible de changer ; l'assertion sur
 * `ng-icon svg` est l'exception assumee a cette politique, car c'est la seule qui prouve que
 * `provideIcons({ lucideMenu })` a reellement resolu l'icone.
 */
describe('App bar', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('display the application bar with its menu trigger and the logout button', () => {
    cy.get('header').should('be.visible');
    cy.get('header').should('contain.text', 'glmfront');

    // Sans l'import de `@spartan-ng/brain/hlm-tailwind-preset.css` dans `styles.css`, `bg-primary` n'est
    // plus genere et la barre se peint sur un fond transparent : toutes les autres assertions passeraient
    // quand meme. La forme negative evite d'etre fragile a la serialisation `oklch` -> `rgb`.
    cy.get('header').should('not.have.css', 'background-color', 'rgba(0, 0, 0, 0)');

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

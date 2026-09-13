import { dataSelector } from '../../../utils/DataSelector';

describe('Material bridge', () => {
  it('should paint the Material chrome with the design tokens', () => {
    const colours = whenVisitingTheRoot();

    thenTheLogoutButtonWearsTheAccentOnASurface(colours);
  });
});

interface ColoursFixture {
  readonly accent: string;
  readonly surface: string;
}

const whenVisitingTheRoot = (): Cypress.Chainable<ColoursFixture> => {
  cy.visit('/');
  return cy.window().then(window => ({
    accent: givenTheBrowsersValueOf(window, '--color-accent'),
    surface: givenTheBrowsersValueOf(window, '--color-surface'),
  }));
};

const givenTheBrowsersValueOf = (window: Window, token: string): string => {
  const probe = window.document.createElement('span');
  probe.style.color = `var(${token})`;
  window.document.body.appendChild(probe);
  const resolved = window.getComputedStyle(probe).color;
  probe.remove();
  return resolved;
};

const thenTheLogoutButtonWearsTheAccentOnASurface = (colours: Cypress.Chainable<ColoursFixture>): void => {
  colours.then(({ accent, surface }) => {
    cy.get(dataSelector('gestion-logout')).should('have.css', 'color', accent).and('have.css', 'background-color', surface);
  });
};

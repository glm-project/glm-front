import { dataSelector } from '../../../utils/DataSelector';
import { AtelierApiFixture } from '../../../utils/gestion/atelier/AtelierApiFixture';

describe('Material bridge', () => {
  it('should paint the Material chrome with the design tokens', () => {
    const colours = whenVisitingTheWorkshop();

    thenThePrimaryActionWearsTheAccent(colours);
  });
});

interface ColoursFixture {
  readonly accent: string;
  readonly onAccent: string;
}

const whenVisitingTheWorkshop = (): Cypress.Chainable<ColoursFixture> => {
  new AtelierApiFixture().install();
  cy.visit('/atelier');
  return cy.window().then(window => ({
    accent: givenTheBrowsersValueOf(window, '--color-accent'),
    onAccent: givenTheBrowsersValueOf(window, '--color-on-accent'),
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

const thenThePrimaryActionWearsTheAccent = (colours: Cypress.Chainable<ColoursFixture>): void => {
  colours.then(({ accent, onAccent }) => {
    cy.get(dataSelector('atelier-new')).should('have.css', 'background-color', accent).and('have.css', 'color', onAccent);
  });
};

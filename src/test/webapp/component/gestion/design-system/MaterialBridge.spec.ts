import { dataSelector } from '../../../utils/DataSelector';

describe('Material bridge', () => {
  it('should paint the Material chrome with the design tokens', () => {
    whenVisitingTheRoot();

    thenTheLogoutButtonWearsTheAccentOnASurface();
  });
});

const whenVisitingTheRoot = (): void => {
  cy.visit('/');
};

const asTheBrowserResolvesIt = (window: Window, token: string): string => {
  const probe = window.document.createElement('span');
  probe.style.color = `var(${token})`;
  window.document.body.appendChild(probe);
  const resolved = window.getComputedStyle(probe).color;
  probe.remove();
  return resolved;
};

const thenTheLogoutButtonWearsTheAccentOnASurface = (): void => {
  cy.window().then(window => {
    cy.get(dataSelector('gestion-logout'))
      .should('have.css', 'color', asTheBrowserResolvesIt(window, '--color-accent'))
      .and('have.css', 'background-color', asTheBrowserResolvesIt(window, '--color-surface'));
  });
};

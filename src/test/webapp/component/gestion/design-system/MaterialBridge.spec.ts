import { dataSelector } from '../../../utils/DataSelector';
import { OperateursApiFixture, operateursFixture, postesFixture } from '../../../utils/gestion/operateur/OperateursApiFixture';

describe('Material bridge', () => {
  it('should paint the Material chrome with the design tokens', () => {
    givenOperators();
    const colours = whenReadingTheAccentTokens();

    thenThePrimaryActionWearsTheAccent(colours);
  });

  it('should set dialog titles at the section level', () => {
    givenOperators();
    const section = whenOpeningADialog();

    thenTheDialogTitleWearsTheSectionLevel(section);
  });

  it('should size Material buttons at the touch target', () => {
    givenOperators();
    const touch = whenMeasuringTheTouchTarget();

    thenTheButtonsReachTheTouchTarget(touch);
  });
});

interface ColoursFixture {
  readonly accent: string;
  readonly onAccent: string;
}

const whenReadingTheAccentTokens = (): Cypress.Chainable<ColoursFixture> =>
  cy.window().then(window => ({
    accent: givenTheBrowsersValueOf(window, '--color-accent'),
    onAccent: givenTheBrowsersValueOf(window, '--color-on-accent'),
  }));

interface SectionLevelFixture {
  readonly size: string;
  readonly weight: string;
}

const whenOpeningADialog = (): Cypress.Chainable<SectionLevelFixture> => {
  cy.get(dataSelector('operateurs-new')).should('be.enabled').click();
  return cy.window().then(window => {
    const probe = window.document.createElement('span');
    probe.className = 'text-section';
    window.document.body.appendChild(probe);
    const { fontSize, fontWeight } = window.getComputedStyle(probe);
    probe.remove();
    return { size: fontSize, weight: fontWeight };
  });
};

const whenMeasuringTheTouchTarget = (): Cypress.Chainable<string> => {
  cy.get(dataSelector('operateurs-new')).should('be.visible');
  return cy.window().then(window => {
    const probe = window.document.createElement('span');
    probe.style.display = 'block';
    probe.style.height = 'var(--spacing-touch)';
    window.document.body.appendChild(probe);
    const { height } = window.getComputedStyle(probe);
    probe.remove();
    return height;
  });
};

const givenOperators = (): void => {
  new OperateursApiFixture(operateursFixture(2), postesFixture(2)).install();
  cy.visit('/operateurs');
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
    cy.get(dataSelector('operateurs-new')).should('have.css', 'background-color', accent).and('have.css', 'color', onAccent);
  });
};

const thenTheDialogTitleWearsTheSectionLevel = (section: Cypress.Chainable<SectionLevelFixture>): void => {
  section.then(({ size, weight }) => {
    cy.get('.mat-mdc-dialog-title').should('have.css', 'font-size', size).and('have.css', 'font-weight', weight);
  });
};

const thenTheButtonsReachTheTouchTarget = (touch: Cypress.Chainable<string>): void => {
  touch.then(height => {
    cy.get(dataSelector('operateurs-new')).should('have.css', 'height', height);
    cy.get('.mat-mdc-paginator-navigation-next').should('have.css', 'height', height);
  });
};

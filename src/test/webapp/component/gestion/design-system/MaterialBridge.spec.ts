import { dataSelector } from '../../../utils/DataSelector';
import { AtelierApiFixture } from '../../../utils/gestion/atelier/AtelierApiFixture';

describe('Material bridge', () => {
  it('should paint the Material chrome with the design tokens', () => {
    const colours = whenVisitingTheWorkshop();

    thenThePrimaryActionWearsTheAccent(colours);
  });

  it('should set dialog titles at the section level', () => {
    const section = whenOpeningADialog();

    thenTheDialogTitleWearsTheSectionLevel(section);
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

interface SectionLevelFixture {
  readonly size: string;
  readonly weight: string;
}

const whenOpeningADialog = (): Cypress.Chainable<SectionLevelFixture> => {
  new AtelierApiFixture().install();
  cy.visit('/atelier');
  cy.get(dataSelector('atelier-new')).should('be.enabled').click();
  return cy.window().then(window => {
    const probe = window.document.createElement('span');
    probe.className = 'text-section';
    window.document.body.appendChild(probe);
    const { fontSize, fontWeight } = window.getComputedStyle(probe);
    probe.remove();
    return { size: fontSize, weight: fontWeight };
  });
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

const thenTheDialogTitleWearsTheSectionLevel = (section: Cypress.Chainable<SectionLevelFixture>): void => {
  section.then(({ size, weight }) => {
    cy.get('.mat-mdc-dialog-title').should('have.css', 'font-size', size).and('have.css', 'font-weight', weight);
  });
};

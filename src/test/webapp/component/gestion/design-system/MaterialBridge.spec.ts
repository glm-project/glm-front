import { dataSelector } from '../../../utils/DataSelector';
import { dossierFixture, finFixture, suiviFixture } from '../../../utils/gestion/anomalies-de-pointage/AnomaliesHttp.fixture';
import { AtelierApiFixture } from '../../../utils/gestion/atelier/AtelierApiFixture';

describe('Material bridge', () => {
  it('should paint the calendar of the instant field with the design tokens', () => {
    const colours = whenOpeningTheCalendarOfTheInstantField();

    thenTheCalendarWearsTheSurfaceAndTheSelectedDayTheAccent(colours);
  });

  it('should paint the time list of the instant field with the design tokens', () => {
    const colours = whenOpeningTheTimeListOfTheInstantField();

    thenTheTimeListWearsTheSurface(colours);
  });

  it('should paint the Material chrome with the design tokens', () => {
    const colours = whenVisitingTheWorkshop();

    thenThePrimaryActionWearsTheAccent(colours);
  });

  it('should set dialog titles at the section level', () => {
    const section = whenOpeningADialog();

    thenTheDialogTitleWearsTheSectionLevel(section);
  });

  it('should size Material buttons at the touch target', () => {
    const touch = whenMeasuringTheTouchTarget();

    thenTheButtonsReachTheTouchTarget(touch);
  });
});

interface SurfaceColoursFixture {
  readonly surface: string;
  readonly accent: string;
  readonly onAccent: string;
}

const whenOpeningTheInstantField = (): Cypress.Chainable<SurfaceColoursFixture> => {
  cy.intercept('GET', `/api/atelier/suivis/${suiviFixture}/anomalies/${finFixture}`, { body: dossierFixture() });
  cy.visit(`/anomalies/${suiviFixture}?pointage=${finFixture}`);
  cy.get(dataSelector('anomalie-corriger')).last().click();
  return cy.window().then(window => ({
    surface: givenTheBrowsersBackgroundOf(window, '--color-surface'),
    accent: givenTheBrowsersBackgroundOf(window, '--color-accent'),
    onAccent: givenTheBrowsersValueOf(window, '--color-on-accent'),
  }));
};

const whenOpeningTheCalendarOfTheInstantField = (): Cypress.Chainable<SurfaceColoursFixture> => {
  const colours = whenOpeningTheInstantField();
  cy.get(dataSelector('anomalie-instant-calendrier')).find('button').click();
  return colours;
};

const whenOpeningTheTimeListOfTheInstantField = (): Cypress.Chainable<SurfaceColoursFixture> => {
  const colours = whenOpeningTheInstantField();
  cy.get(dataSelector('anomalie-instant-horloge')).find('button').click();
  return colours;
};

const givenTheBrowsersBackgroundOf = (window: Window, token: string): string => {
  const probe = window.document.createElement('span');
  probe.style.backgroundColor = `var(${token})`;
  window.document.body.appendChild(probe);
  const resolved = window.getComputedStyle(probe).backgroundColor;
  probe.remove();
  return resolved;
};

const thenTheCalendarWearsTheSurfaceAndTheSelectedDayTheAccent = (colours: Cypress.Chainable<SurfaceColoursFixture>): void => {
  colours.then(({ surface, accent, onAccent }) => {
    cy.get('.mat-datepicker-content').should('have.css', 'background-color', surface);
    cy.get('.mat-calendar-body-selected').should('have.css', 'background-color', accent).and('have.css', 'color', onAccent);
  });
};

const thenTheTimeListWearsTheSurface = (colours: Cypress.Chainable<SurfaceColoursFixture>): void => {
  colours.then(({ surface }) => {
    cy.get('.mat-timepicker-panel').should('have.css', 'background-color', surface);
  });
};

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

const whenMeasuringTheTouchTarget = (): Cypress.Chainable<string> => {
  new AtelierApiFixture().install();
  cy.visit('/atelier');
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

const thenTheButtonsReachTheTouchTarget = (touch: Cypress.Chainable<string>): void => {
  touch.then(height => {
    cy.get(dataSelector('atelier-new')).should('have.css', 'height', height);
    cy.get('.mat-mdc-paginator-navigation-next').should('have.css', 'height', height);
  });
};

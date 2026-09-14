import { dataSelector } from '../../../utils/DataSelector';
import { requiredFixture } from '../../../utils/RequiredFixture';

describe('Supervision timeline readability', () => {
  [390, 768, 1440].forEach(width => {
    it(`should keep presence and activity details readable at ${width}px`, () => {
      givenViewport(width);

      whenOpeningSupervision();
      whenOpeningAliceJournal();
      whenFocusingRefresh();

      thenRowsRemainReadable();
    });
  });

  it('should open with Enter and close with Space while preserving visible keyboard focus', () => {
    whenOpeningSupervision();

    whenTogglingJournalWithKeyboard();

    thenKeyboardJournalStatesAreAccessible();
  });

  it('should keep native hover details and an accessible name on keyboard focus', () => {
    whenOpeningSupervision();

    whenFocusingActivityWithKeyboard();

    thenNativeActivityDetailsAreAvailable();
  });

  it('should keep operator identities pinned while scrolling the common timeline', () => {
    givenViewport(390);
    whenOpeningSupervision();

    whenScrollingTimeline();

    thenIdentityRemainsPinned();
  });

  it('should reevaluate supervision only when the thirty-second refresh reads again', () => {
    whenOpeningSupervisionWithPollingClock();
    whenReachingTheNextAnomalyThreshold();
    whenCapturingBeforePollingDeadline();
    whenReachingPollingDeadline();

    thenOnlyTheNewReadChangesTheAnomalies();
  });

  it('should preserve presence colours when GLM, NC or an anomaly is displayed', () => {
    whenOpeningSupervision();

    thenPresenceColoursRemainIndependent();
  });
});

const givenViewport = (width: number): void => {
  cy.viewport(width, 900);
};

const whenOpeningSupervision = (): void => {
  cy.clock(new Date(2026, 8, 13, 10, 0).getTime(), ['Date']);
  cy.visit('/');
};

const whenFocusingRefresh = (): void => {
  cy.get(dataSelector('supervision-refresh')).should('not.be.disabled').focus();
};

const thenRowsRemainReadable = (): void => {
  cy.get(dataSelector('supervision-ligne'))
    .should('have.length', 7)
    .each(tile => {
      const element = requiredFixture(tile[0], 'rendered supervision content');
      expect(element.scrollWidth).to.be.at.most(element.clientWidth);
    });
  cy.get(dataSelector('supervision-activite-nom'))
    .filter(':visible')
    .should('have.length', 2)
    .each(name => {
      const element = requiredFixture(name[0], 'rendered supervision content');
      expect(element.scrollWidth).to.be.at.most(element.clientWidth);
    });
  cy.get(dataSelector('supervision-segment-activite')).each(button => {
    const element = requiredFixture(button[0], 'activity button');
    expect(element.getBoundingClientRect().width).to.be.at.least(44);
    expect(element.getBoundingClientRect().height).to.equal(16);
  });
  cy.get(dataSelector('supervision-segment-presence'))
    .first()
    .then(presence => {
      const presenceHeight = requiredFixture(presence[0], 'presence segment').getBoundingClientRect().height;
      cy.get(dataSelector('supervision-marque-activite')).each(activity => {
        const segment = requiredFixture(activity[0], 'activity segment');
        expect(segment.getBoundingClientRect().height).to.equal(presenceHeight);
      });
    });
  cy.get(dataSelector('supervision-presence')).each(presence => {
    const element = requiredFixture(presence[0], 'rendered supervision content');
    expect(element.scrollWidth).to.be.at.most(element.clientWidth);
  });
  cy.get(dataSelector('supervision-atelier'))
    .should('be.visible')
    .then(view => {
      const element = requiredFixture(view[0], 'rendered supervision content');
      expect(element.scrollWidth).to.be.at.most(element.clientWidth);
    });
  cy.get(dataSelector('supervision-refresh')).should('have.focus').and('have.css', 'outline-style', 'solid');
  cy.screenshot('supervision-responsive', { capture: 'fullPage' });
};

const thenPresenceColoursRemainIndependent = (): void => {
  cy.get(dataSelector('supervision-presence')).eq(0).should('have.css', 'background-color', 'rgb(185, 28, 28)');
  cy.get(dataSelector('supervision-presence')).eq(1).should('have.css', 'background-color', 'rgb(133, 77, 14)');
  cy.get(dataSelector('supervision-presence')).eq(2).should('have.css', 'background-color', 'rgb(22, 101, 52)');
  cy.get(dataSelector('supervision-presence')).eq(3).should('have.css', 'background-color', 'rgb(22, 101, 52)');
  cy.get(dataSelector('supervision-presence')).eq(4).should('have.css', 'background-color', 'rgb(22, 101, 52)');
  cy.get(dataSelector('supervision-presence')).eq(5).should('have.css', 'background-color', 'rgb(133, 77, 14)');
  cy.get(dataSelector('supervision-presence')).eq(6).should('have.css', 'background-color', 'rgb(185, 28, 28)');
};

const whenOpeningSupervisionWithPollingClock = (): void => {
  cy.clock(new Date(2026, 8, 13, 10, 0).getTime(), ['Date', 'setInterval', 'clearInterval']);
  cy.visit('/');
  cy.get(dataSelector('supervision-refresh')).should('not.be.disabled');
};

const whenReachingTheNextAnomalyThreshold = (): void => {
  cy.clock().then(clock => clock.setSystemTime(new Date(2026, 8, 13, 23, 0).getTime()));
};

const whenCapturingBeforePollingDeadline = (): void => {
  cy.tick(29_999);
  cy.get(dataSelector('supervision-anomalie')).its('length').as('anomaliesBeforeDeadline', { type: 'static' });
};

const whenReachingPollingDeadline = (): void => {
  cy.tick(1);
};

const thenOnlyTheNewReadChangesTheAnomalies = (): void => {
  cy.get('@anomaliesBeforeDeadline').should('equal', 3);
  cy.get(dataSelector('supervision-anomalie')).should('have.length', 5);
  cy.get(dataSelector('supervision-activite-debut')).first().should('have.text', '08:12');
  cy.get(dataSelector('supervision-ligne')).should('have.length', 7);
  cy.screenshot('supervision-automatic-refresh', { capture: 'fullPage' });
};

const whenOpeningAliceJournal = (): void => {
  cy.get(dataSelector('supervision-deplier')).eq(2).click();
};

const whenTogglingJournalWithKeyboard = (): void => {
  cy.get(dataSelector('supervision-deplier')).first().focus();
  cy.press(Cypress.Keyboard.Keys.ENTER);
  cy.get(dataSelector('supervision-journal')).first().should('be.visible');
  cy.get(dataSelector('supervision-deplier')).first().invoke('attr', 'aria-expanded').as('expandedAfterEnter', { type: 'static' });
  cy.press(Cypress.Keyboard.Keys.SPACE);
};

const thenKeyboardJournalStatesAreAccessible = (): void => {
  cy.get('@expandedAfterEnter').should('equal', 'true');
  cy.get(dataSelector('supervision-journal')).first().should('not.be.visible');
  cy.get(dataSelector('supervision-deplier'))
    .first()
    .should('have.attr', 'aria-expanded', 'false')
    .and('have.focus')
    .and('have.css', 'outline-style', 'solid');
};

const whenFocusingActivityWithKeyboard = (): void => {
  cy.get(dataSelector('supervision-deplier')).eq(2).focus();
  cy.press(Cypress.Keyboard.Keys.TAB);
};

const thenNativeActivityDetailsAreAvailable = (): void => {
  cy.get(dataSelector('supervision-segment-activite'))
    .first()
    .should('have.focus')
    .and('have.attr', 'title', 'Moule 1015 · NC · Tour 1 · Depuis 08:12 · 108 min · En cours');
  cy.get(dataSelector('supervision-segment-activite'))
    .first()
    .should('have.attr', 'aria-label', 'Moule 1015 · NC · Tour 1 · Depuis 08:12 · 108 min · En cours');
  cy.get(dataSelector('supervision-marque-activite')).should('have.text', '');
};

const whenScrollingTimeline = (): void => {
  cy.get(dataSelector('supervision-operateur-nom'))
    .first()
    .then(name => {
      cy.wrap(requiredFixture(name[0], 'operator name').getBoundingClientRect().left).as('identityBeforeScroll', { type: 'static' });
    });
  cy.get(dataSelector('supervision-grille')).scrollTo('right');
};

const thenIdentityRemainsPinned = (): void => {
  cy.get('@identityBeforeScroll').then(before => {
    cy.get(dataSelector('supervision-operateur-nom'))
      .first()
      .then(name => {
        expect(requiredFixture(name[0], 'operator name').getBoundingClientRect().left).to.equal(before);
      });
  });
};

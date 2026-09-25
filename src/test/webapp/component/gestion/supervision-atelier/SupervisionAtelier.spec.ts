import { dataSelector } from '../../../utils/DataSelector';
import { requiredFixture } from '../../../utils/RequiredFixture';

const DEMONSTRATION = new Date(2026, 8, 24, 9, 10);

describe('Supervision lanes readability', () => {
  [390, 768, 1024, 1440].forEach(width => {
    it(`should keep lanes readable without horizontal overflow at ${width}px`, () => {
      givenViewport(width);

      whenOpeningSupervision();

      thenLanesStayWithinTheirWidth();
    });
  });

  it('should colour each lane by its state and mark a nonconformity in yellow with ink text', () => {
    whenOpeningSupervision();

    thenLaneColoursFollowTheClientCode();
  });

  it('should keep a visible focus ring on « Actualiser »', () => {
    whenOpeningSupervision();

    whenFocusingRefresh();

    thenRefreshShowsItsFocusRing();
  });

  it('should reevaluate lanes only when the thirty-second refresh reads again', () => {
    whenOpeningSupervisionWithPollingClock();
    whenReachingTheNextAnomalyThreshold();
    whenCapturingBeforePollingDeadline();
    whenReachingPollingDeadline();

    thenOnlyTheNewReadChangesTheAnomalies();
  });
});

const givenViewport = (width: number): void => {
  cy.viewport(width, 900);
};

const whenOpeningSupervision = (): void => {
  cy.clock(DEMONSTRATION.getTime(), ['Date']);
  cy.visit('/');
  cy.get(dataSelector('supervision-plateau')).should('be.visible');
};

const whenFocusingRefresh = (): void => {
  cy.get(dataSelector('supervision-refresh')).should('not.be.disabled').focus();
};

const whenOpeningSupervisionWithPollingClock = (): void => {
  cy.clock(DEMONSTRATION.getTime(), ['Date', 'setInterval', 'clearInterval']);
  cy.visit('/');
  cy.get(dataSelector('supervision-refresh')).should('not.be.disabled');
};

const whenReachingTheNextAnomalyThreshold = (): void => {
  cy.clock().then(clock => clock.setSystemTime(new Date(2026, 8, 24, 23, 20).getTime()));
};

const whenCapturingBeforePollingDeadline = (): void => {
  cy.tick(29_999);
  cy.get(dataSelector('supervision-anomalie')).its('length').as('anomaliesBeforeDeadline', { type: 'static' });
};

const whenReachingPollingDeadline = (): void => {
  cy.tick(1);
};

const thenLanesStayWithinTheirWidth = (): void => {
  cy.get(dataSelector('supervision-carte'))
    .should('have.length', 13)
    .each(card => {
      const element = requiredFixture(card[0], 'supervision card');
      expect(element.scrollWidth).to.be.at.most(element.clientWidth);
    });
  cy.get(dataSelector('supervision-atelier')).then(view => {
    const element = requiredFixture(view[0], 'supervision view');
    expect(element.scrollWidth).to.be.at.most(element.clientWidth);
  });
  cy.document().then(document => {
    expect(document.documentElement.scrollWidth).to.be.at.most(document.documentElement.clientWidth);
  });
  cy.screenshot('supervision-couloirs', { capture: 'fullPage' });
};

const thenLaneColoursFollowTheClientCode = (): void => {
  cy.get(dataSelector('supervision-couloir-au-travail')).should('have.css', 'border-top-color', 'rgb(22, 101, 52)');
  cy.get(dataSelector('supervision-couloir-en-pause')).should('have.css', 'border-top-color', 'rgb(133, 77, 14)');
  cy.get(dataSelector('supervision-couloir-absents')).should('have.css', 'border-top-color', 'rgb(185, 28, 28)');
  cy.get(dataSelector('supervision-marque-nc'))
    .first()
    .should('have.css', 'background-color', 'rgb(234, 179, 8)')
    .and('have.css', 'color', 'rgb(15, 24, 36)');
};

const thenRefreshShowsItsFocusRing = (): void => {
  cy.get(dataSelector('supervision-refresh')).should('have.focus').and('have.css', 'outline-style', 'solid');
};

const thenOnlyTheNewReadChangesTheAnomalies = (): void => {
  cy.get('@anomaliesBeforeDeadline').should('equal', 3);
  cy.get(dataSelector('supervision-anomalie')).should('have.length', 8);
  cy.get(dataSelector('supervision-activite-debut'))
    .first()
    .should(debut => {
      expect(debut.text().replace(/\s+/g, ' ').trim()).to.equal('depuis 07:05');
    });
  cy.get(dataSelector('supervision-carte')).should('have.length', 13);
};

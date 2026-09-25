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

  it('should show the demonstration workshop as the plan describes it', () => {
    whenOpeningSupervision();

    thenTheLanesHoldTheDemonstrationOperators();
    thenTheCardsTellTheirTimesActivitiesAndAnomalies();
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
  cardOf('op-perrin').should('have.css', 'color', 'rgb(74, 90, 107)').and('have.css', 'opacity', '1');
  cardOf('op-perrin').find(dataSelector('supervision-activite')).should('have.css', 'opacity', '1');
};

const thenTheLanesHoldTheDemonstrationOperators = (): void => {
  [
    {
      couloir: 'au-travail',
      operateurs: ['Aubert Lucas', 'Benali Samir', 'Chevalier Mathis', 'Garnier Thomas', 'Marchand Kevin', 'Morel Inès', 'Vidal Hugo'],
    },
    { couloir: 'sans-affectation', operateurs: ['Lefèvre Sophie'] },
    { couloir: 'en-pause', operateurs: ['Dumas Julien', 'Roux Nathalie', 'Schmitt Yanis'] },
    { couloir: 'absents', operateurs: ['Fabre Lucie', 'Perrin Loïc'] },
  ].forEach(({ couloir, operateurs }) => {
    cy.get(dataSelector(`supervision-couloir-${couloir}`))
      .find(dataSelector('supervision-operateur-nom'))
      .should(noms => {
        expect(noms.toArray().map(nom => normalise(nom.textContent))).to.deep.equal(operateurs);
      });
  });
};

const thenTheCardsTellTheirTimesActivitiesAndAnomalies = (): void => {
  thenTextIs(cardOf('op-marchand').find(dataSelector('supervision-heure')), 'arrivée le 23/09 à 06:04');
  cardOf('op-marchand')
    .find(dataSelector('supervision-heure'))
    .find(dataSelector('supervision-jour'))
    .should('have.text', 'le 23/09')
    .and('have.css', 'font-weight', '600')
    .and('have.css', 'color', 'rgb(15, 24, 36)');
  thenTextIs(cardOf('op-marchand').find(dataSelector('supervision-activite-debut')), 'depuis le 23/09 à 14:20');
  thenTextIs(cardOf('op-marchand').find(dataSelector('supervision-anomalie')), 'Aucun départ pointé depuis plus de 16 h');
  thenTextIs(cardOf('op-dumas').find(dataSelector('supervision-heure')), 'pause depuis 09:00');
  thenTextIs(cardOf('op-dumas').find(dataSelector('supervision-suspendue')), 'suspendue');
  cardOf('op-schmitt').find(dataSelector('supervision-heure')).should('not.exist');
  thenTextIs(cardOf('op-schmitt').find(dataSelector('supervision-anomalie')), 'Venue ouverte sans heure d’arrivée');
  thenTextIs(cardOf('op-chevalier').find(dataSelector('supervision-activite-element')), 'Hors OF');
  thenTextIs(cardOf('op-vidal').find(dataSelector('supervision-activite-element')), 'OF OF-2026-000048');
  thenTextIs(cardOf('op-vidal').find(dataSelector('supervision-activite-poste')), 'Sans poste');
  thenTextIs(cardOf('op-perrin').find(dataSelector('supervision-anomalie')), 'Activité d’un opérateur absent');
};

const thenTextIs = (element: Cypress.Chainable<JQuery>, attendu: string): void => {
  element.should(noeud => {
    expect(normalise(noeud.text())).to.equal(attendu);
  });
};

const cardOf = (id: string): Cypress.Chainable<JQuery> => cy.get(dataSelector('supervision-carte')).filter(`[data-operateur-id="${id}"]`);

const normalise = (texte: string | null): string => (texte ?? '').replace(/\s+/g, ' ').trim();

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

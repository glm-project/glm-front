import { dataSelector } from '../../../utils/DataSelector';
import { SupervisionApiFixture, updatedSupervisionFixture } from '../../../utils/gestion/supervision-atelier/SupervisionApiFixture';
import { requiredFixture } from '../../../utils/RequiredFixture';

const DEMONSTRATION = new Date(2026, 8, 24, 9, 10);

let apiFixture: SupervisionApiFixture;

describe('Supervision lanes readability', () => {
  beforeEach(() => {
    apiFixture = new SupervisionApiFixture();
    apiFixture.intercept();
  });
  [390, 768, 1024, 1440].forEach(width => {
    it(`should keep lanes readable without horizontal overflow at ${width}px`, () => {
      givenViewport(width);

      whenOpeningSupervision();

      thenLanesStayWithinTheirWidth();
    });
  });

  it('should show exactly the lanes « Au travail » and « Sans activité », in this order', () => {
    whenOpeningSupervision();

    thenThePlateauHoldsTheTwoLanesInOrder();
  });

  it('should share the plateau width between the two lanes on a wide screen', () => {
    givenViewport(1440);

    whenOpeningSupervision();

    thenTheLanesFillThePlateau();
  });

  it('should colour each lane by its state and mark a nonconformity in yellow with ink text', () => {
    whenOpeningSupervision();

    thenLaneColoursFollowTheClientCode();
  });

  it('should show the acquired workshop as the plan describes it', () => {
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
  cy.get(dataSelector('supervision-plateau')).should('be.visible');
};

const whenReachingTheNextAnomalyThreshold = (): void => {
  cy.clock().then(clock => {
    clock.setSystemTime(new Date(2026, 8, 24, 20, 5).getTime());
    apiFixture.replace(updatedSupervisionFixture());
  });
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

const thenThePlateauHoldsTheTwoLanesInOrder = (): void => {
  cy.get(dataSelector('supervision-plateau'))
    .children()
    .should('have.length', 2)
    .find(dataSelector('supervision-couloir-titre'))
    .should('be.visible')
    .should(titres => {
      expect(titres.toArray().map(titre => normalise(titre.innerText))).to.deep.equal(['Au travail', 'Sans activité']);
    });
};

const thenTheLanesFillThePlateau = (): void => {
  cy.get(dataSelector('supervision-plateau')).then(plateau => {
    cy.get(dataSelector('supervision-couloir-sans-activite')).should(couloir => {
      expect(rightEdgeOf(couloir)).to.be.closeTo(rightEdgeOf(plateau), 1);
    });
  });
};

const rightEdgeOf = (element: JQuery): number => requiredFixture(element[0], 'measured element').getBoundingClientRect().right;

const thenLaneColoursFollowTheClientCode = (): void => {
  cy.get(dataSelector('supervision-couloir-au-travail')).should('have.css', 'border-top-color', 'rgb(22, 101, 52)');
  cy.get(dataSelector('supervision-couloir-sans-activite')).should('have.css', 'border-top-color', 'rgb(169, 182, 196)');
  cy.get(dataSelector('supervision-marque-nc'))
    .first()
    .should('have.css', 'background-color', 'rgb(234, 179, 8)')
    .and('have.css', 'color', 'rgb(15, 24, 36)');
};

const thenTheLanesHoldTheDemonstrationOperators = (): void => {
  [
    {
      couloir: 'au-travail',
      operateurs: ['Aubert Lucas', 'Benali Samir', 'Chevalier Mathis', 'Garnier Thomas', 'Morel Inès', 'Vidal Hugo'],
    },
    {
      couloir: 'sans-activite',
      operateurs: ['Dumas Julien', 'Fabre Lucie', 'Lefèvre Sophie', 'Marchand Kevin', 'Perrin Loïc', 'Roux Nathalie', 'Schmitt Yanis'],
    },
  ].forEach(({ couloir, operateurs }) => {
    cy.get(dataSelector(`supervision-couloir-${couloir}`))
      .find(dataSelector('supervision-operateur-nom'))
      .should(noms => {
        expect(noms.toArray().map(nom => normalise(nom.textContent))).to.deep.equal(operateurs);
      });
  });
};

const thenTheCardsTellTheirTimesActivitiesAndAnomalies = (): void => {
  thenTextIs(cardOf('op-marchand').find(dataSelector('supervision-anomalie')), 'Activité terminée automatiquement · fin 03:20');
  cardOf('op-marchand').find(dataSelector('supervision-activite')).should('not.exist');
  thenVisibleTextIs(cardOf('op-dumas'), 'Dumas Julien Aucune activité en cours Métiers : Sciage, Tournage');
  thenTextIs(cardOf('op-schmitt').find(dataSelector('supervision-sequence-en-conflit')), 'Séquence en conflit · Sans poste');
  thenTextIs(cardOf('op-chevalier').find(dataSelector('supervision-activite-element')), 'OF OF Perso');
  thenTextIs(cardOf('op-vidal').find(dataSelector('supervision-activite-element')), 'OF OF-2026-000048');
  thenTextIs(cardOf('op-vidal').find(dataSelector('supervision-activite-poste')), 'Sans poste');
  cardOf('op-perrin').find(dataSelector('supervision-sequence-en-conflit')).should('contain.text', 'Séquence en conflit · Tour 1');
  thenTextIs(cardOf('op-perrin').find(dataSelector('supervision-conflit-activite')), 'OF 3006 · À résoudre');
  cardOf('op-morel').find(dataSelector('supervision-activite')).should('have.length', 2);
  cardOf('op-morel').find(dataSelector('supervision-sequence-en-conflit')).should('contain.text', 'Séquence en conflit · Erodeuse F');
  thenTextIs(cardOf('op-morel').find(dataSelector('supervision-conflit-activite')), 'OF OF Perso · À résoudre');
};

const thenVisibleTextIs = (element: Cypress.Chainable<JQuery>, attendu: string): void => {
  element.should(noeud => {
    expect(normalise(requiredFixture(noeud[0], 'observed element').innerText)).to.equal(attendu);
  });
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
  cy.get('@anomaliesBeforeDeadline').should('equal', 1);
  cy.get(dataSelector('supervision-anomalie')).should('have.length', 3);
  cy.get(dataSelector('supervision-activite-debut'))
    .first()
    .should(debut => {
      expect(debut.text().replace(/\s+/g, ' ').trim()).to.equal('depuis 08:40');
    });
  cy.get(dataSelector('supervision-carte')).should('have.length', 13);
};

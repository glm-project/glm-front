import { dataSelector } from '../../../utils/DataSelector';
import { pageFinsAutomatiquesFixture } from '../../../utils/gestion/anomalies-de-pointage/FinsAutomatiquesHttp.fixture';

describe('Automatic end tab of the anomalies list', () => {
  beforeEach(() => {
    givenOneAutomaticEnd();
  });

  it('should keep the tabs and the automatic end inside the page on a narrow screen', () => {
    whenVisitingTheAutomaticEndsAt(320);

    thenTheTabsAndTheLineAreVisible();
    thenThePageDoesNotOverflow();
  });

  it('should expose a visible focus ring on the tab links', () => {
    whenVisitingTheAutomaticEndsAt(1280);
    whenFocusingTheConflictsTab();

    thenTheTabUsesTheFocusRing();
  });

  const givenOneAutomaticEnd = (): void => {
    cy.intercept('GET', '/api/atelier/anomalies*', { body: pageFinsAutomatiquesFixture() });
  };

  const whenVisitingTheAutomaticEndsAt = (width: number): void => {
    cy.viewport(width, 900);
    cy.visit('/anomalies?nature=FIN_AUTOMATIQUE');
  };

  const whenFocusingTheConflictsTab = (): void => {
    cy.get(dataSelector('anomalies-onglet-conflits')).focus();
  };

  const thenTheTabsAndTheLineAreVisible = (): void => {
    cy.get(dataSelector('anomalies-onglet-fins-automatiques')).should('be.visible');
    cy.get(dataSelector('fin-automatique-ligne')).should('have.length', 1);
  };

  const thenThePageDoesNotOverflow = (): void => {
    cy.document().should(document => {
      expect(document.documentElement.scrollWidth).to.equal(document.documentElement.clientWidth);
    });
  };

  const thenTheTabUsesTheFocusRing = (): void => {
    cy.get(dataSelector('anomalies-onglet-conflits')).should($tab => {
      const focus = getComputedStyle($tab[0] as Element);
      expect(focus.outlineWidth).to.equal('2px');
      expect(focus.outlineStyle).to.equal('solid');
    });
  };
});

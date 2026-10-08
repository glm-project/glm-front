import { dataSelector } from '../../../utils/DataSelector';
import {
  givenTheElementsFinsAutomatiques,
  givenTheReferentielFinsAutomatiques,
  pageFinsAutomatiquesFixture,
} from '../../../utils/gestion/anomalies-de-pointage/FinsAutomatiquesHttp.fixture';

describe('Automatic end tab of the anomalies list', () => {
  beforeEach(() => {
    givenTheReferentielFinsAutomatiques();
    givenTheElementsFinsAutomatiques();
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

  it('should say that no anomaly is left when the address comes from the last resolution, above the list', () => {
    whenVisitingTheAutomaticEndsAt(1280, '&plusAucune=1');

    thenNoAnomalyIsSaidToBeLeftAboveTheList();
  });

  it('should not say that no anomaly is left on an ordinary visit', () => {
    whenVisitingTheAutomaticEndsAt(1280);

    thenNoMessageSaysThatNoAnomalyIsLeft();
  });

  it('should drop the message when the manager moves to the other tab', () => {
    givenTheAddressOfTheLastResolution();

    whenOpeningTheConflictsTab();

    thenTheMessageIsDropped();
  });

  const givenTheAddressOfTheLastResolution = (): void => {
    whenVisitingTheAutomaticEndsAt(1280, '&plusAucune=1');
  };

  const whenOpeningTheConflictsTab = (): void => {
    cy.get(dataSelector('anomalies-onglet-conflits')).click();
  };

  const thenNoAnomalyIsSaidToBeLeftAboveTheList = (): void => {
    cy.get(dataSelector('anomalies-plus-aucune')).should('be.visible').and('contain.text', 'Plus aucune anomalie');
    cy.get(dataSelector('fin-automatique-ligne')).should('have.length', 1);
  };

  const thenNoMessageSaysThatNoAnomalyIsLeft = (): void => {
    cy.get(dataSelector('fin-automatique-ligne')).should('have.length', 1);
    cy.get(dataSelector('anomalies-plus-aucune')).should('not.exist');
  };

  const thenTheMessageIsDropped = (): void => {
    cy.location('search').should('not.contain', 'plusAucune');
    cy.get(dataSelector('anomalies-plus-aucune')).should('not.exist');
  };

  const givenOneAutomaticEnd = (): void => {
    cy.intercept('GET', '/api/atelier/anomalies*', { body: pageFinsAutomatiquesFixture() });
  };

  const whenVisitingTheAutomaticEndsAt = (width: number, more = ''): void => {
    cy.viewport(width, 900);
    cy.visit(`/anomalies?nature=FIN_AUTOMATIQUE${more}`);
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

import { dataSelector } from '../../../utils/DataSelector';

describe('Supervision atelier in back office', () => {
  it('should display the workshop supervision grid on root path', () => {
    whenVisitingTheRoot();

    thenTheSupervisionGridIsDisplayed();
  });

  it('should retain activities and anomalies after refreshing supervision', () => {
    whenVisitingTheRoot();
    whenOpeningGabrielJournal();
    whenRefreshingTheWorkshop();

    thenTheActivityAndAnomaliesRemainVisible();
  });
});

const whenVisitingTheRoot = (): void => {
  cy.viewport(1280, 900);
  cy.clock(new Date(2026, 8, 13, 10, 0).getTime(), ['Date']);
  cy.visit('/');
};

const thenTheSupervisionGridIsDisplayed = (): void => {
  cy.get(dataSelector('supervision-grille')).should('exist');
  cy.get(dataSelector('supervision-ligne')).should('have.length', 7);
  cy.get(dataSelector('supervision-ligne'))
    .eq(0)
    .within(() => {
      cy.get(dataSelector('supervision-operateur-nom')).should('contain.text', 'Bernard Chloé');
      cy.get(dataSelector('supervision-presence')).should('contain.text', 'Absent');
    });
  cy.get(dataSelector('supervision-ligne'))
    .eq(1)
    .within(() => {
      cy.get(dataSelector('supervision-operateur-nom')).should('contain.text', 'Durand Bob');
      cy.get(dataSelector('supervision-presence')).should('contain.text', 'En pause');
    });
  cy.get(dataSelector('supervision-ligne'))
    .eq(2)
    .within(() => {
      cy.get(dataSelector('supervision-operateur-nom')).should('contain.text', 'Martin Alice');
      cy.get(dataSelector('supervision-presence')).should('contain.text', 'Présent');
    });
};

const whenRefreshingTheWorkshop = (): void => {
  cy.get(dataSelector('supervision-refresh')).click();
};

const thenTheActivityAndAnomaliesRemainVisible = (): void => {
  cy.get(dataSelector('supervision-journal')).filter(':visible').should('have.length', 1);
  cy.get(dataSelector('supervision-activite-nom')).filter(':visible').should('have.length', 1).and('contain.text', 'OF-2026-000044');
  cy.get(dataSelector('supervision-indicateur-glm')).should('have.length', 1).and('be.visible');
  cy.get(dataSelector('supervision-indicateur-anomalies')).should('have.length', 3).and('be.visible');
  cy.get(dataSelector('supervision-anomalie'))
    .filter(':visible')
    .should('have.length', 1)
    .and('contain.text', 'Activité d’un opérateur absent');
  cy.get(dataSelector('supervision-ligne'))
    .eq(6)
    .within(() => {
      cy.get(dataSelector('supervision-presence')).should('contain.text', 'Absent');
      cy.get(dataSelector('supervision-activite-nom')).should('contain.text', 'OF-2026-000044');
    });
  cy.screenshot('supervision-desktop', { capture: 'fullPage' });
};

const whenOpeningGabrielJournal = (): void => {
  cy.get(dataSelector('supervision-deplier')).eq(6).click();
};

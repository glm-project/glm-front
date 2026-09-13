import { dataSelector } from '../../../utils/DataSelector';

describe('Supervision atelier in back office', () => {
  it('should display the workshop supervision grid on root path', () => {
    whenVisitingTheRoot();

    thenTheSupervisionGridIsDisplayed();

    whenRefreshingTheWorkshop();

    thenTheActivityAndAnomaliesRemainVisible();
  });
});

const whenVisitingTheRoot = (): void => {
  cy.clock(new Date(2026, 8, 13, 10, 0).getTime(), ['Date']);
  cy.visit('/');
};

const thenTheSupervisionGridIsDisplayed = (): void => {
  cy.get(dataSelector('supervision-grille')).should('exist');
  cy.get(dataSelector('supervision-tuile')).should('have.length', 7);
  cy.get(dataSelector('supervision-tuile'))
    .eq(0)
    .within(() => {
      cy.get(dataSelector('supervision-operateur-nom')).should('contain.text', 'Bernard Chloé');
      cy.get(dataSelector('supervision-presence')).should('contain.text', 'Absent');
    });
  cy.get(dataSelector('supervision-tuile'))
    .eq(1)
    .within(() => {
      cy.get(dataSelector('supervision-operateur-nom')).should('contain.text', 'Durand Bob');
      cy.get(dataSelector('supervision-presence')).should('contain.text', 'En pause');
    });
  cy.get(dataSelector('supervision-tuile'))
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
  cy.get(dataSelector('supervision-activite-nom')).should('have.length', 4).and('contain.text', 'Moule 1015');
  cy.get(dataSelector('supervision-nc')).should('have.length', 1).and('contain.text', 'NC');
  cy.get(dataSelector('supervision-glm')).should('have.length', 1).and('contain.text', 'GLM');
  cy.get(dataSelector('supervision-anomalie'))
    .should('have.length', 3)
    .and('contain.text', 'Journée ouverte depuis plus de 16 h')
    .and('contain.text', "Journée ouverte sans heure d'ouverture")
    .and('contain.text', 'Activité d’un opérateur absent');
  cy.get(dataSelector('supervision-tuile'))
    .eq(6)
    .within(() => {
      cy.get(dataSelector('supervision-presence')).should('contain.text', 'Absent');
      cy.get(dataSelector('supervision-activite-nom')).should('contain.text', 'OF-2026-000044');
    });
  cy.screenshot('supervision-desktop', { capture: 'fullPage' });
};

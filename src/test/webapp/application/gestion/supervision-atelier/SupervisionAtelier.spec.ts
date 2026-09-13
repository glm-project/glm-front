import { dataSelector } from '../../../utils/DataSelector';

describe('Supervision atelier in back office', () => {
  it('should display the workshop supervision grid on root path', () => {
    whenVisitingTheRoot();

    thenTheSupervisionGridIsDisplayed();
  });
});

const whenVisitingTheRoot = (): void => {
  cy.visit('/');
};

const thenTheSupervisionGridIsDisplayed = (): void => {
  cy.get(dataSelector('supervision-grille')).should('exist');
  cy.get(dataSelector('supervision-tuile')).should('have.length', 3);
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

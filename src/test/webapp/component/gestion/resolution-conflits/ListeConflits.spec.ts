import { dataSelector } from '../../../utils/DataSelector';

describe('Conflict list in Gestion', () => {
  it('should keep the wide list inside an accessible scroll region on a narrow screen', () => {
    whenVisitingAt(320);

    thenTheTableOwnsItsHorizontalScroll();
    thenThePageDoesNotOverflow();
  });

  const whenVisitingAt = (width: number): void => {
    cy.viewport(width, 900);
    cy.visit('/conflits');
  };

  const thenTheTableOwnsItsHorizontalScroll = (): void => {
    cy.get(dataSelector('conflits-table')).should('have.attr', 'role', 'region');
    cy.get(dataSelector('conflits-table')).should('have.attr', 'aria-label', 'Conflits de pointage');
    cy.get(dataSelector('conflits-table')).should('have.attr', 'tabindex', '0');
    cy.get(dataSelector('conflits-table')).should($region => {
      expect($region[0]?.scrollWidth).to.be.greaterThan($region[0]?.clientWidth ?? 0);
    });
  };

  const thenThePageDoesNotOverflow = (): void => {
    cy.document().should(document => {
      expect(document.documentElement.scrollWidth).to.equal(document.documentElement.clientWidth);
    });
  };
});

import { dataSelector } from '../../../utils/DataSelector';

describe('Pupitre header', () => {
  it('should show the connectivity sign to whoever walks past', () => {
    whenVisitingTheRoot();

    thenThePupitreSignsItIsConnected();
  });
});

const whenVisitingTheRoot = (): void => {
  cy.visit('/');
};

const thenThePupitreSignsItIsConnected = (): void => {
  cy.get(dataSelector('pupitre-header')).should('be.visible');
  cy.get(dataSelector('pupitre-connected')).should('be.visible');
  cy.get(dataSelector('connectivity-indicator')).should(indicator => {
    const style = getComputedStyle(indicator[0]);

    expect(style.backgroundColor).to.equal(style.color);
    expect(style.borderStyle).to.equal('solid');
  });
};

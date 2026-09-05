import { dataSelector } from '../../../utils/DataSelector';
import { requiredFixture } from '../../../utils/RequiredFixture';

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
    const style = getComputedStyle(requiredFixture(indicator[0], 'connectivity indicator'));

    expect(style.backgroundColor).to.equal(style.color);
    expect(style.borderStyle).to.equal('solid');
  });
};

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
};

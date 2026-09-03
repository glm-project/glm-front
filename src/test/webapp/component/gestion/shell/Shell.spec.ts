import { dataSelector } from '../../utils/DataSelector';

describe('Gestion shell', () => {
  it('should show its header once booted', () => {
    whenVisitingTheRoot();

    thenTheHeaderIsVisible();
  });
});

const whenVisitingTheRoot = (): void => {
  cy.visit('/');
};

const thenTheHeaderIsVisible = (): void => {
  cy.get(dataSelector('gestion-header')).should('be.visible');
};

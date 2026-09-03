import { dataSelector } from '../../utils/DataSelector';

describe('Back-office shell', () => {
  it('should show its header once booted', () => {
    whenVisitingTheRoot();

    thenTheHeaderIsVisible();
  });
});

const whenVisitingTheRoot = (): void => {
  cy.visit('/');
};

const thenTheHeaderIsVisible = (): void => {
  cy.get(dataSelector('backoffice-header')).should('be.visible');
};

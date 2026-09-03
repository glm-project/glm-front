import { dataSelector } from '../../../utils/DataSelector';

describe('Gestion shell', () => {
  it('should boot the gestion front on its own port', () => {
    whenVisitingTheRoot();

    thenTheBackOfficeShellIsMounted();
  });
});

const whenVisitingTheRoot = (): void => {
  cy.visit('/');
};

const thenTheBackOfficeShellIsMounted = (): void => {
  cy.get(dataSelector('gestion-shell')).should('exist');
};

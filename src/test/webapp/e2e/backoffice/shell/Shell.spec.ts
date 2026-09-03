import { dataSelector } from '../../utils/DataSelector';

describe('Back-office shell', () => {
  it('should boot the back-office on its own port', () => {
    whenVisitingTheRoot();

    thenTheBackOfficeShellIsMounted();
  });
});

const whenVisitingTheRoot = (): void => {
  cy.visit('/');
};

const thenTheBackOfficeShellIsMounted = (): void => {
  cy.get(dataSelector('backoffice-shell')).should('exist');
};

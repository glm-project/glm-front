import { dataSelector } from '../../utils/DataSelector';

describe('Pupitre shell', () => {
  it('should boot the pupitre on its own port', () => {
    whenVisitingTheRoot();

    thenThePupitreShellIsMounted();
  });
});

const whenVisitingTheRoot = (): void => {
  cy.visit('/');
};

const thenThePupitreShellIsMounted = (): void => {
  cy.get(dataSelector('pupitre-shell')).should('exist');
};

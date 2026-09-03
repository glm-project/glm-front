import { dataSelector } from '../../utils/DataSelector';

describe('Back-office shell', () => {
  it('should render its toolbar once booted', () => {
    whenVisitingTheRoot();

    thenTheToolbarIsVisible();
  });
});

const whenVisitingTheRoot = (): void => {
  cy.visit('/');
};

const thenTheToolbarIsVisible = (): void => {
  cy.get(dataSelector('backoffice-shell')).find('mat-toolbar').should('be.visible');
};

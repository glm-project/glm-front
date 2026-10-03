import { dataSelector } from '../../../utils/DataSelector';

describe('Conflict list addresses in Gestion', () => {
  it('should retain the list filters and page in the addressed dossier', () => {
    whenVisiting('/conflits?operateur=Camille&element=M-042&page=1');
    whenOpeningTheDossier();

    thenTheDossierKeepsTheListAddress();
  });

  const whenVisiting = (address: string): void => {
    cy.viewport(1280, 900);
    cy.visit(address);
  };

  const whenOpeningTheDossier = (): void => {
    cy.get(dataSelector('conflit-ouvrir')).first().click();
  };

  const thenTheDossierKeepsTheListAddress = (): void => {
    cy.location('pathname').should('eq', '/conflits/demo-remplacement');
    cy.location('search').should(search => {
      const params = Object.fromEntries(new URLSearchParams(search));
      expect(params).to.deep.equal({ operateur: 'Camille', element: 'M-042', page: '1', pointage: 'fin-17' });
    });
  };
});

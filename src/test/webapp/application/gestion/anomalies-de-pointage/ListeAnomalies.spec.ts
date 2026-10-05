import { components } from '@/app/generated/schema';
import { dataSelector } from '../../../utils/DataSelector';
import { dossierFixture, finFixture, ligneFixture, suiviFixture } from '../../../utils/gestion/anomalies-de-pointage/AnomaliesHttp.fixture';

describe('Conflict list addresses in Gestion', () => {
  it('should retain the list filters and page in the addressed dossier', () => {
    givenAnAddressedConflict();

    whenVisitingTheFilteredList();
    whenOpeningTheDossier();

    thenTheDossierKeepsTheListAddress();
  });

  const givenAnAddressedConflict = (): void => {
    cy.intercept('GET', '/api/atelier/conflits*', {
      body: { lignes: [ligneFixture], total: 1, complete: true, page: 0, size: 5 } satisfies components['schemas']['RestPageDesConflits'],
    });
    cy.intercept('GET', `/api/atelier/suivis/${suiviFixture}/conflits/${finFixture}`, { body: dossierFixture() });
  };

  const whenVisitingTheFilteredList = (): void => {
    cy.viewport(1280, 900);
    cy.visit('/conflits?operateur=Camille&element=M-042&page=1');
  };

  const whenOpeningTheDossier = (): void => {
    cy.get(dataSelector('conflit-ouvrir')).first().click();
  };

  const thenTheDossierKeepsTheListAddress = (): void => {
    cy.location('pathname').should('eq', `/conflits/${suiviFixture}`);
    cy.location('search').should(search => {
      const params = Object.fromEntries(new URLSearchParams(search));
      expect(params).to.deep.equal({ operateur: 'Camille', element: 'M-042', page: '1', pointage: finFixture });
    });
    cy.get(dataSelector('conflit-pointage')).should('have.length', 3);
  };
});

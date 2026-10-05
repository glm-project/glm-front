import { components } from '@/app/generated/schema';
import { dataSelector } from '../../../utils/DataSelector';
import {
  dossierFixture,
  elementFixture,
  elementNomFixture,
  elementReferenceFixture,
  finFixture,
  givenTheElements,
  givenTheReferentiel,
  ligneFixture,
  operateurFixture,
  operateurNomFixture,
  suiviFixture,
} from '../../../utils/gestion/anomalies-de-pointage/AnomaliesHttp.fixture';

describe('Conflict list addresses in Gestion', () => {
  beforeEach(() => {
    givenTheReferentiel();
    givenTheElements();
  });

  it('should retain the list filters and page in the addressed dossier', () => {
    givenAnAddressedConflict();

    whenVisitingTheFilteredList();
    whenOpeningTheDossier();

    thenTheDossierKeepsTheListAddress();
  });

  it('should name the filtered operator of the address and never show its identifier', () => {
    givenAnAddressedConflict();

    whenVisitingTheFilteredList();

    thenTheOperatorFilterNamesTheOperatorWithoutItsIdentifier();
  });

  it('should name the filtered element of the address and never show its identifier', () => {
    givenAnAddressedConflict();

    whenVisitingTheFilteredList();

    thenTheElementFilterNamesTheElementWithoutItsIdentifier();
  });

  const givenAnAddressedConflict = (): void => {
    cy.intercept('GET', '/api/atelier/anomalies*', {
      body: { lignes: [ligneFixture], total: 1, complete: true, page: 0, size: 5 } satisfies components['schemas']['RestPageDesAnomalies'],
    });
    cy.intercept('GET', `/api/atelier/suivis/${suiviFixture}/anomalies/${finFixture}`, { body: dossierFixture() });
  };

  const whenVisitingTheFilteredList = (): void => {
    cy.viewport(1280, 900);
    cy.visit(`/anomalies?nature=CONFLIT&operateur=${operateurFixture}&element=${elementFixture}&page=1`);
  };

  const thenTheOperatorFilterNamesTheOperatorWithoutItsIdentifier = (): void => {
    cy.get(dataSelector('anomalies-filtre-operateur')).should('contain.text', operateurNomFixture);
    cy.get(dataSelector('anomalies-filtres')).should('not.contain.text', operateurFixture);
  };

  const thenTheElementFilterNamesTheElementWithoutItsIdentifier = (): void => {
    cy.get(dataSelector('anomalies-filtre-element')).should('have.text', `${elementNomFixture} · ${elementReferenceFixture}`);
    cy.get(dataSelector('anomalies-filtres')).should('not.contain.text', elementFixture);
  };

  const whenOpeningTheDossier = (): void => {
    cy.get(dataSelector('conflit-ouvrir')).first().click();
  };

  const thenTheDossierKeepsTheListAddress = (): void => {
    cy.location('pathname').should('eq', `/anomalies/${suiviFixture}`);
    cy.location('search').should(search => {
      const params = Object.fromEntries(new URLSearchParams(search));
      expect(params).to.deep.equal({
        nature: 'CONFLIT',
        operateur: operateurFixture,
        element: elementFixture,
        page: '1',
        pointage: finFixture,
      });
    });
    cy.get(dataSelector('anomalie-pointage')).should('have.length', 3);
  };
});

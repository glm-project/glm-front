import { dataSelector } from '../../../utils/DataSelector';
import {
  givenTheElementsFinsAutomatiques,
  givenTheReferentielFinsAutomatiques,
  pageFinsAutomatiquesFixture,
} from '../../../utils/gestion/anomalies-de-pointage/FinsAutomatiquesHttp.fixture';

describe('Message of the last resolution in the automatic end list', () => {
  beforeEach(() => {
    givenTheReferentielFinsAutomatiques();
    givenTheElementsFinsAutomatiques();
    cy.intercept('GET', '/api/atelier/anomalies*', { body: pageFinsAutomatiquesFixture() });
  });

  it('should say that no anomaly is left when the address comes from the last resolution, above the list', () => {
    whenVisitingTheAutomaticEnds('?plusAucune=1');

    thenNoAnomalyIsSaidToBeLeftAboveTheList();
  });

  it('should not say that no anomaly is left on an ordinary visit', () => {
    whenVisitingTheAutomaticEnds('');

    thenNoMessageSaysThatNoAnomalyIsLeft();
  });

  const whenVisitingTheAutomaticEnds = (query: string): void => {
    cy.viewport(1280, 900);
    cy.visit(`/anomalies${query}`);
  };

  const thenNoAnomalyIsSaidToBeLeftAboveTheList = (): void => {
    cy.get(dataSelector('anomalies-plus-aucune')).should('be.visible').and('contain.text', 'Plus aucune anomalie');
    cy.get(dataSelector('fin-automatique-ligne')).should('have.length', 1);
  };

  const thenNoMessageSaysThatNoAnomalyIsLeft = (): void => {
    cy.get(dataSelector('fin-automatique-ligne')).should('have.length', 1);
    cy.get(dataSelector('anomalies-plus-aucune')).should('not.exist');
  };
});

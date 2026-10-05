import { dataSelector } from '../../../utils/DataSelector';
import {
  dossierFinAutomatiqueFixture,
  givenTheReferentielFinAutomatique,
  ouvrantFinAutomatiqueFixture,
  suiviFinAutomatiqueFixture,
} from '../../../utils/gestion/anomalies-de-pointage/FinAutomatiqueHttp.fixture';

describe('Automatic end dossier in Gestion', () => {
  beforeEach(() => {
    givenTheReferentielFinAutomatique();
    cy.intercept('GET', `/api/atelier/suivis/${suiviFinAutomatiqueFixture}/anomalies/${ouvrantFinAutomatiqueFixture}`, {
      body: dossierFinAutomatiqueFixture(),
    });
  });

  [320, 1280].forEach(width => {
    it(`should keep the automatic end and the time to enter reachable at ${width} pixels`, () => {
      whenOpeningTheAutomaticEndAt(width);
      whenChoosingTheEndRegularisation();
      whenReachingTheTimeField();

      thenTheTimeIsReachableWithoutHorizontalOverflow();
    });
  });

  const whenOpeningTheAutomaticEndAt = (width: number): void => {
    cy.viewport(width, 900);
    cy.visit(`/anomalies/${suiviFinAutomatiqueFixture}?pointage=${ouvrantFinAutomatiqueFixture}`);
  };

  const whenChoosingTheEndRegularisation = (): void => {
    cy.get(dataSelector('anomalie-fin-automatique')).should('be.visible');
    cy.get(dataSelector('anomalie-choix')).click();
  };

  const whenReachingTheTimeField = (): void => {
    cy.get(dataSelector('anomalie-instant-heure')).scrollIntoView();
  };

  const thenTheTimeIsReachableWithoutHorizontalOverflow = (): void => {
    cy.get(dataSelector('anomalie-instant-date')).should('be.visible').and('have.value', '');
    cy.get(dataSelector('anomalie-instant-heure')).should('be.visible').and('have.value', '');
    cy.get(dataSelector('anomalie-instant-horloge')).should('be.visible');
    cy.document().should(document => {
      expect(document.documentElement.scrollWidth).to.equal(document.documentElement.clientWidth);
    });
  };
});

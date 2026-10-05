import { components } from '@/app/generated/schema';
import { dataSelector } from '../../../utils/DataSelector';
import { ligneFixture } from '../../../utils/gestion/anomalies-de-pointage/AnomaliesHttp.fixture';
import {
  dossierFinAutomatiqueFixture,
  ouvrantFinAutomatiqueFixture,
  suiviFinAutomatiqueFixture,
} from '../../../utils/gestion/anomalies-de-pointage/FinAutomatiqueHttp.fixture';
import {
  finAutomatiqueLigneFixture,
  pageFinsAutomatiquesFixture,
} from '../../../utils/gestion/anomalies-de-pointage/FinsAutomatiquesHttp.fixture';

describe('Automatic end tab of the anomalies list in Gestion', () => {
  beforeEach(() => {
    givenTheTwoNaturesOfAnomalies();
  });

  it('should list the automatic ends of the filtered selection from the second tab, back on the first page', () => {
    whenVisiting('/anomalies?operateur=Jean&element=OF&page=2');
    whenChoosingTheTab('anomalies-onglet-fins-automatiques');

    thenTheListIsRequested('finsAutomatiques', 'nature=FIN_AUTOMATIQUE&operateur=Jean&element=OF&page=0&size=5');
    thenTheAddressIs('?nature=FIN_AUTOMATIQUE&operateur=Jean&element=OF&page=1');
    thenTheTabIsCurrent('anomalies-onglet-fins-automatiques');
    thenTheAutomaticEndIsListedWithItsPeriod();
  });

  it('should return to the conflicts with the same filters when the operator chooses the first tab again', () => {
    whenVisiting('/anomalies?nature=FIN_AUTOMATIQUE&operateur=Jean&element=OF&page=1');
    whenChoosingTheTab('anomalies-onglet-conflits');

    thenTheListIsRequested('conflits', 'nature=CONFLIT&operateur=Jean&element=OF&page=0&size=5');
    thenTheAddressIs('?nature=CONFLIT&operateur=Jean&element=OF&page=1');
    thenOneConflictIsListed();
  });

  it('should open the dossier of the automatic end at its opening, keeping the list address', () => {
    givenADossierAddressedByTheOpening();

    whenVisiting('/anomalies?nature=FIN_AUTOMATIQUE&operateur=Jean&element=OF&page=2');
    whenOpeningTheAutomaticEnd();

    thenTheDossierOfTheOpeningIsRequested();
    thenTheDossierKeepsTheListAddress();
    thenTheAutomaticEndDossierIsShown();
  });

  it('should return from the dossier of an automatic end to the same tab, filters and page', () => {
    givenADossierAddressedByTheOpening();

    whenVisiting('/anomalies?nature=FIN_AUTOMATIQUE&operateur=Jean&element=OF&page=2');
    whenOpeningTheAutomaticEnd();
    whenReturningToTheAnomalies();

    thenTheAddressIs('?nature=FIN_AUTOMATIQUE&operateur=Jean&element=OF&page=2');
    thenTheTabIsCurrent('anomalies-onglet-fins-automatiques');
    thenTheAutomaticEndIsListedWithItsPeriod();
  });

  it('should keep the nature and the filters while paginating the automatic ends and ask the back for each page', () => {
    givenTwelveAutomaticEnds();

    whenVisiting('/anomalies?nature=FIN_AUTOMATIQUE&operateur=Jean&element=OF');
    whenChoosingThePage('anomalies-page-suivante');
    whenChoosingThePage('anomalies-page-suivante');
    whenChoosingThePage('anomalies-page-precedente');

    thenThePagesAreRequested([0, 1, 2, 1]);
    thenTheAddressIs('?nature=FIN_AUTOMATIQUE&operateur=Jean&element=OF&page=2');
    thenTheTabIsCurrent('anomalies-onglet-fins-automatiques');
  });

  it('should explain that no automatic end remains', () => {
    givenNoAutomaticEnd();

    whenVisiting('/anomalies?nature=FIN_AUTOMATIQUE');

    thenTheEmptyListIsExplained();
  });

  it('should refuse an unknown nature without any request', () => {
    whenVisiting('/anomalies?nature=AUTRE');

    thenTheNatureIsRefusedWithoutRequest();
  });

  const givenTheTwoNaturesOfAnomalies = (): void => {
    cy.viewport(1280, 900);
    cy.intercept('GET', '/api/atelier/anomalies?nature=CONFLIT*', {
      body: { lignes: [ligneFixture], total: 1, complete: true, page: 0, size: 5 } satisfies components['schemas']['RestPageDesAnomalies'],
    }).as('conflits');
    cy.intercept('GET', '/api/atelier/anomalies?nature=FIN_AUTOMATIQUE*', { body: pageFinsAutomatiquesFixture() }).as('finsAutomatiques');
  };

  const givenADossierAddressedByTheOpening = (): void => {
    cy.intercept('GET', `/api/atelier/suivis/${suiviFinAutomatiqueFixture}/anomalies/${ouvrantFinAutomatiqueFixture}`, {
      body: dossierFinAutomatiqueFixture(),
    }).as('dossier');
  };

  const givenTwelveAutomaticEnds = (): void => {
    cy.intercept('GET', '/api/atelier/anomalies?nature=FIN_AUTOMATIQUE*', {
      body: { ...pageFinsAutomatiquesFixture(), total: 12 },
    }).as('pagesDesFinsAutomatiques');
  };

  const givenNoAutomaticEnd = (): void => {
    cy.intercept('GET', '/api/atelier/anomalies?nature=FIN_AUTOMATIQUE*', { body: pageFinsAutomatiquesFixture([]) });
  };

  const whenVisiting = (address: string): void => {
    cy.visit(address);
  };

  const whenChoosingTheTab = (selector: string): void => {
    cy.get(dataSelector(selector)).click();
  };

  const whenChoosingThePage = (selector: string): void => {
    cy.get(dataSelector(selector)).click();
  };

  const whenOpeningTheAutomaticEnd = (): void => {
    cy.get(dataSelector('fin-automatique-ouvrir')).click();
  };

  const whenReturningToTheAnomalies = (): void => {
    cy.get(dataSelector('anomalie-retour')).click();
  };

  const thenTheListIsRequested = (alias: string, query: string): void => {
    cy.wait(`@${alias}`).its('request.url').should('contain', query);
  };

  const thenThePagesAreRequested = (pages: number[]): void => {
    cy.get('@pagesDesFinsAutomatiques.all').should('have.length', pages.length);
    pages.forEach((page, index) => {
      cy.get('@pagesDesFinsAutomatiques.all')
        .its(index)
        .its('request.url')
        .should('contain', `nature=FIN_AUTOMATIQUE&operateur=Jean&element=OF&page=${page}&size=5`);
    });
  };

  const thenTheAddressIs = (search: string): void => {
    cy.location('search').should('equal', search);
  };

  const thenTheTabIsCurrent = (selector: string): void => {
    cy.get(dataSelector(selector)).should('have.attr', 'aria-current', 'page');
  };

  const thenTheAutomaticEndIsListedWithItsPeriod = (): void => {
    cy.get(dataSelector('fin-automatique-ligne')).should('have.length', 1);
    cy.get(dataSelector('fin-automatique-ligne'))
      .should('contain.text', finAutomatiqueLigneFixture.designation)
      .and('contain.text', 'Jean Dupont')
      .and('contain.text', 'Fraiseuse 1')
      .and('contain.text', 'Début jeu. 1 à 09:26 · fin automatique à 22:26');
  };

  const thenOneConflictIsListed = (): void => {
    cy.get(dataSelector('conflit-ligne')).should('have.length', 1);
  };

  const thenTheDossierOfTheOpeningIsRequested = (): void => {
    cy.wait('@dossier');
  };

  const thenTheDossierKeepsTheListAddress = (): void => {
    cy.location('pathname').should('equal', `/anomalies/${suiviFinAutomatiqueFixture}`);
    cy.location('search').should(search => {
      expect(Object.fromEntries(new URLSearchParams(search))).to.deep.equal({
        nature: 'FIN_AUTOMATIQUE',
        operateur: 'Jean',
        element: 'OF',
        page: '2',
        pointage: ouvrantFinAutomatiqueFixture,
      });
    });
  };

  const thenTheAutomaticEndDossierIsShown = (): void => {
    cy.get(dataSelector('anomalie-fin-automatique')).should('contain.text', 'Fin automatique');
  };

  const thenTheEmptyListIsExplained = (): void => {
    cy.get(dataSelector('anomalies-vide')).should('have.text', 'Aucune fin automatique à traiter.');
  };

  const thenTheNatureIsRefusedWithoutRequest = (): void => {
    cy.get(dataSelector('anomalies-adresse-invalide')).should('contain.text', 'Nature d’anomalie inconnue');
    cy.get(dataSelector('anomalies-onglet-conflits')).should('not.have.attr', 'aria-current');
    cy.get('@conflits.all').should('have.length', 0);
    cy.get('@finsAutomatiques.all').should('have.length', 0);
  };
});

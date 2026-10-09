import { dataSelector } from '../../../utils/DataSelector';
import {
  dossierFinAutomatiqueFixture,
  elementFinAutomatiqueFixture,
  operateurFinAutomatiqueFixture,
  ouvrantFinAutomatiqueFixture,
  suiviFinAutomatiqueFixture,
} from '../../../utils/gestion/anomalies-de-pointage/FinAutomatiqueHttp.fixture';
import {
  autreElementFinAutomatiqueFixture,
  autreOperateurFinAutomatiqueFixture,
  finAutomatiqueLigneFixture,
  givenTheElementsFinsAutomatiques,
  givenTheReferentielFinsAutomatiques,
  pageFinsAutomatiquesFixture,
} from '../../../utils/gestion/anomalies-de-pointage/FinsAutomatiquesHttp.fixture';

const operateurAbsentFixture = '71000000-0000-0000-0000-000000000099';
const elementAbsentFixture = '71000000-0000-0000-0000-000000000098';

describe('Automatic end list in Gestion', () => {
  beforeEach(() => {
    givenTheListOfAutomaticEnds();
    givenTheReferentielFinsAutomatiques();
    givenTheElementsFinsAutomatiques();
  });

  it('should open on the automatic ends when the address names nothing', () => {
    whenVisiting('/anomalies');

    thenTheListIsRequested('finsAutomatiques', 'operateur=&element=&page=0&size=5');
    thenTheAutomaticEndIsListedWithItsPeriod();
  });

  it('should open the dossier of the automatic end at its opening, keeping the list address', () => {
    givenADossierAddressedByTheOpening();

    whenVisiting(`/anomalies?operateur=${operateurFinAutomatiqueFixture}&element=${elementFinAutomatiqueFixture}&page=2`);
    whenOpeningTheAutomaticEnd();

    thenTheDossierOfTheOpeningIsRequested();
    thenTheDossierKeepsTheListAddress();
    thenTheAutomaticEndDossierIsShown();
  });

  it('should return from the dossier of an automatic end to the same filters and page', () => {
    givenADossierAddressedByTheOpening();

    whenVisiting(`/anomalies?operateur=${operateurFinAutomatiqueFixture}&element=${elementFinAutomatiqueFixture}&page=2`);
    whenOpeningTheAutomaticEnd();
    whenReturningToTheAnomalies();

    thenTheAddressIs(`?operateur=${operateurFinAutomatiqueFixture}&element=${elementFinAutomatiqueFixture}&page=2`);
    thenTheAutomaticEndIsListedWithItsPeriod();
  });

  it('should ignore the nature held by the address of an old link', () => {
    whenVisiting(`/anomalies?nature=CONFLIT&operateur=${operateurFinAutomatiqueFixture}&page=2`);

    thenTheListIsRequested('finsAutomatiques', `operateur=${operateurFinAutomatiqueFixture}&element=&page=1&size=5`);
    thenTheAutomaticEndIsListedWithItsPeriod();
  });

  ['fin-automatique-introuvable', 'suivi-d-atelier-introuvable'].forEach(urn => {
    it(`should lead back to the same filters and page, with no screen in between, when the dossier is not found (${urn})`, () => {
      givenTheDossierIsNotFound(urn);

      whenVisiting(`/anomalies?operateur=${operateurFinAutomatiqueFixture}&element=${elementFinAutomatiqueFixture}&page=2`);
      whenOpeningTheAutomaticEndThatIsNotFound();

      thenNoDossierIsShown();
      thenTheAddressIs(`?operateur=${operateurFinAutomatiqueFixture}&element=${elementFinAutomatiqueFixture}&page=2`);
      thenTheAutomaticEndIsListedWithItsPeriod();
    });
  });

  it('should not bring the manager back to a dossier that is not found when he goes back', () => {
    givenTheDossierIsNotFound('fin-automatique-introuvable');
    whenVisiting('/anomalies');
    whenOpeningTheAutomaticEndThatIsNotFound();

    whenGoingBack();

    thenTheListIsShown();
    thenTheDossierWasRequestedOnce();
  });

  it('should lead back to the list when the address of the dossier names no pointage', () => {
    whenVisiting(`/anomalies/${suiviFinAutomatiqueFixture}?operateur=${operateurFinAutomatiqueFixture}`);

    thenTheListIsShown();
    thenTheAddressIs(`?operateur=${operateurFinAutomatiqueFixture}`);
    thenTheAutomaticEndIsListedWithItsPeriod();
  });

  it('should keep the dossier and offer a retry when reading it fails technically', () => {
    givenTheDossierFailsTechnically();

    whenVisiting('/anomalies');
    whenOpeningTheAutomaticEnd();

    thenARetryIsOfferedOnTheDossier();
  });

  it('should keep the filters while paginating the automatic ends and ask the back for each page', () => {
    givenTwelveAutomaticEnds();

    whenVisiting(`/anomalies?operateur=${operateurFinAutomatiqueFixture}&element=${elementFinAutomatiqueFixture}`);
    whenChoosingThePage('anomalies-page-suivante');
    whenChoosingThePage('anomalies-page-suivante');
    whenChoosingThePage('anomalies-page-precedente');

    thenThePagesAreRequested([0, 1, 2, 1]);
    thenTheAddressIs(`?operateur=${operateurFinAutomatiqueFixture}&element=${elementFinAutomatiqueFixture}&page=2`);
  });

  it('should name the operator held by the address, never its identifier', () => {
    whenVisiting(`/anomalies?operateur=${operateurFinAutomatiqueFixture}`);

    thenTheOperatorFilterNames('Jean Dupont');
    thenTheFiltersNeverShow(operateurFinAutomatiqueFixture);
  });

  it('should hold the identifier of the operator chosen by name in the address and request the list with it', () => {
    whenVisiting('/anomalies');
    whenChoosingTheOperator('Alex Durand · 012');
    whenApplyingTheFilters();

    thenTheLastRequestedListIs(`operateur=${autreOperateurFinAutomatiqueFixture}&element=&page=0&size=5`);
    thenTheAddressIs(`?operateur=${autreOperateurFinAutomatiqueFixture}&element=&page=1`);
    thenTheOperatorFilterNames('Alex Durand · 012');
  });

  it('should remove the operator from the address when all the operators are chosen', () => {
    whenVisiting(`/anomalies?operateur=${operateurFinAutomatiqueFixture}&page=2`);
    whenChoosingTheOperator('Tous les opérateurs');
    whenApplyingTheFilters();

    thenTheAddressIs('?operateur=&element=&page=1');
    thenTheOperatorFilterNames('Tous les opérateurs');
  });

  it('should name an operator of the address that the referentiel does not contain as unresolved, without its identifier', () => {
    whenVisiting(`/anomalies?operateur=${operateurAbsentFixture}`);

    thenTheOperatorFilterNames('Opérateur non résolu (référence actuelle)');
    thenTheFiltersNeverShow(operateurAbsentFixture);
  });

  it('should tell that the operators are unavailable while the list stays usable', () => {
    givenTheReferentielFails();

    whenVisiting('/anomalies');

    thenTheOperatorsAreUnavailable();
    thenTheAutomaticEndIsListedWithItsPeriod();
  });

  it('should keep the operator held by the address without calling it unresolved while the operators are unavailable', () => {
    givenTheReferentielFails();

    whenVisiting(`/anomalies?operateur=${operateurFinAutomatiqueFixture}`);

    thenTheOperatorFilterNames('Opérateur actuel conservé');
    thenTheFiltersNeverShow(operateurFinAutomatiqueFixture);
  });

  it('should offer the operator filter again when the manager retries after a failed referentiel', () => {
    givenTheReferentielFails();
    whenVisiting('/anomalies');

    whenRetryingTheReferentiel();

    thenTheOperatorFilterIsEnabled();
  });

  it('should keep the operator filter usable without reading the workstations, whatever they would answer', () => {
    givenTheWorkstationsFail();

    whenVisiting('/anomalies');

    thenTheOperatorFilterIsEnabled();
    thenNoWorkstationWasRead();
  });

  it('should name the element held by the address, never its identifier', () => {
    whenVisiting(`/anomalies?element=${elementFinAutomatiqueFixture}`);

    thenTheElementFilterNames('OF M24-0655');
    thenTheFiltersNeverShow(elementFinAutomatiqueFixture);
  });

  it('should hold the identifier of the element chosen by designation in the address and request the list with it', () => {
    whenVisiting('/anomalies');
    whenChoosingTheElement('Bielle · B-12');
    whenApplyingTheFilters();

    thenTheLastRequestedListIs(`operateur=&element=${autreElementFinAutomatiqueFixture}&page=0&size=5`);
    thenTheAddressIs(`?operateur=&element=${autreElementFinAutomatiqueFixture}&page=1`);
    thenTheElementFilterNames('Bielle · B-12');
  });

  it('should remove the element from the address when all the elements are chosen', () => {
    whenVisiting(`/anomalies?element=${elementFinAutomatiqueFixture}&page=2`);
    whenChoosingTheElement('Tous les éléments');
    whenApplyingTheFilters();

    thenTheAddressIs('?operateur=&element=&page=1');
    thenTheElementFilterNames('Tous les éléments');
  });

  it('should name an element of the address that the referentiel does not contain as unresolved, without its identifier', () => {
    whenVisiting(`/anomalies?element=${elementAbsentFixture}`);

    thenTheElementFilterNames('Élément non résolu (référence actuelle)');
    thenTheFiltersNeverShow(elementAbsentFixture);
  });

  it('should tell that the elements are unavailable while the list and the operator filter stay usable', () => {
    givenTheElementsFail();

    whenVisiting('/anomalies');

    thenTheElementsAreUnavailable();
    thenTheAutomaticEndIsListedWithItsPeriod();
  });

  it('should offer the element filter again when the manager retries after a failed read of the elements', () => {
    givenTheElementsFail();
    whenVisiting('/anomalies');

    whenRetryingTheElements();

    thenTheElementFilterIsEnabled();
  });

  it('should explain that no automatic end remains', () => {
    givenNoAutomaticEnd();

    whenVisiting('/anomalies');

    thenTheEmptyListIsExplained();
  });

  const givenTheListOfAutomaticEnds = (): void => {
    cy.viewport(1280, 900);
    cy.intercept('GET', '/api/atelier/anomalies*', { body: pageFinsAutomatiquesFixture() }).as('finsAutomatiques');
  };

  const givenADossierAddressedByTheOpening = (): void => {
    cy.intercept('GET', `/api/atelier/suivis/${suiviFinAutomatiqueFixture}/anomalies/${ouvrantFinAutomatiqueFixture}`, {
      body: dossierFinAutomatiqueFixture(),
    }).as('dossier');
  };

  const givenTheDossierIsNotFound = (urn: string): void => {
    cy.intercept('GET', `/api/atelier/suivis/${suiviFinAutomatiqueFixture}/anomalies/${ouvrantFinAutomatiqueFixture}`, {
      statusCode: 404,
      body: { type: `urn:glm:erreur:atelier:${urn}`, title: 'Introuvable', status: 404, detail: 'Introuvable.' },
    }).as('dossier');
  };

  const givenTheDossierFailsTechnically = (): void => {
    cy.intercept('GET', `/api/atelier/suivis/${suiviFinAutomatiqueFixture}/anomalies/${ouvrantFinAutomatiqueFixture}`, {
      statusCode: 500,
      body: {},
    });
  };

  const givenTwelveAutomaticEnds = (): void => {
    cy.intercept('GET', '/api/atelier/anomalies*', {
      body: { ...pageFinsAutomatiquesFixture(), totalElementsCount: 12 },
    }).as('pagesDesFinsAutomatiques');
  };

  const givenNoAutomaticEnd = (): void => {
    cy.intercept('GET', '/api/atelier/anomalies*', { body: pageFinsAutomatiquesFixture([]) });
  };

  const whenVisiting = (address: string): void => {
    cy.visit(address);
  };

  const givenTheReferentielFails = (): void => {
    cy.intercept({ method: 'GET', url: '/api/operateurs*', times: 1 }, { statusCode: 500, body: {} });
  };

  const givenTheWorkstationsFail = (): void => {
    cy.intercept('GET', '/api/postes-de-travail*', { statusCode: 500, body: {} }).as('postes');
  };

  const thenNoWorkstationWasRead = (): void => {
    cy.get('@postes.all').should('have.length', 0);
  };

  const whenRetryingTheReferentiel = (): void => {
    cy.get(dataSelector('anomalies-referentiel-reessayer')).click();
  };

  const thenTheOperatorsAreUnavailable = (): void => {
    cy.get(dataSelector('anomalies-referentiel-erreur')).should('contain.text', 'Liste des opérateurs indisponible');
    cy.get(dataSelector('anomalies-filtre-operateur')).should('be.disabled');
  };

  const thenTheOperatorFilterIsEnabled = (): void => {
    cy.get(dataSelector('anomalies-referentiel-erreur')).should('not.exist');
    cy.get(dataSelector('anomalies-filtre-operateur')).should('not.be.disabled');
  };

  const givenTheElementsFail = (): void => {
    cy.intercept({ method: 'GET', url: '/api/elements-de-fabrication*', times: 1 }, { statusCode: 500, body: {} });
  };

  const whenRetryingTheElements = (): void => {
    cy.get(dataSelector('anomalies-elements-reessayer')).click();
  };

  const thenTheElementsAreUnavailable = (): void => {
    cy.get(dataSelector('anomalies-elements-erreur')).should('contain.text', 'Liste des éléments indisponible');
    cy.get(dataSelector('anomalies-filtre-element')).should('be.disabled');
    cy.get(dataSelector('anomalies-filtre-operateur')).should('not.be.disabled');
  };

  const thenTheElementFilterIsEnabled = (): void => {
    cy.get(dataSelector('anomalies-elements-erreur')).should('not.exist');
    cy.get(dataSelector('anomalies-filtre-element')).should('not.be.disabled');
  };

  const whenChoosingTheElement = (libelle: string): void => {
    cy.get(dataSelector('anomalies-filtre-element')).click();
    cy.get(dataSelector('anomalies-filtre-element-proposition')).contains(libelle).click();
  };

  const thenTheElementFilterNames = (libelle: string): void => {
    cy.get(dataSelector('anomalies-filtre-element')).should('have.text', libelle);
  };

  const thenTheFiltersNeverShow = (identifier: string): void => {
    cy.get(dataSelector('anomalies-filtres')).should('not.contain.text', identifier);
  };

  const whenChoosingTheOperator = (libelle: string): void => {
    cy.get(dataSelector('anomalies-filtre-operateur')).click();
    cy.get(dataSelector('anomalies-filtre-operateur-proposition')).contains(libelle).click();
  };

  const whenApplyingTheFilters = (): void => {
    cy.get(dataSelector('anomalies-filtrer')).click();
  };

  const thenTheOperatorFilterNames = (libelle: string): void => {
    cy.get(dataSelector('anomalies-filtre-operateur')).should('have.text', libelle);
  };

  const whenChoosingThePage = (selector: string): void => {
    cy.get(dataSelector(selector)).click();
  };

  const whenOpeningTheAutomaticEnd = (): void => {
    cy.get(dataSelector('fin-automatique-ouvrir')).click();
  };

  const whenOpeningTheAutomaticEndThatIsNotFound = (): void => {
    whenOpeningTheAutomaticEnd();
    cy.wait('@dossier');
    thenNoDossierIsShown();
  };

  const thenTheListIsShown = (): void => {
    cy.location('pathname').should('equal', '/anomalies');
  };

  const thenARetryIsOfferedOnTheDossier = (): void => {
    cy.get(dataSelector('anomalie-retry')).should('contain.text', 'Réessayer');
    cy.location('pathname').should('equal', `/anomalies/${suiviFinAutomatiqueFixture}`);
  };

  const whenGoingBack = (): void => {
    cy.go('back');
  };

  const thenTheDossierWasRequestedOnce = (): void => {
    cy.get('@dossier.all').should('have.length', 1);
  };

  const thenNoDossierIsShown = (): void => {
    cy.get(dataSelector('anomalie-resolution')).should('not.exist');
    cy.get(dataSelector('anomalie-retour')).should('not.exist');
  };

  const whenReturningToTheAnomalies = (): void => {
    cy.get(dataSelector('anomalie-retour')).click();
  };

  const thenTheListIsRequested = (alias: string, query: string): void => {
    cy.wait(`@${alias}`).its('request.url').should('contain', query);
  };

  const thenTheLastRequestedListIs = (query: string): void => {
    cy.get<{ request: { url: string } }[]>('@finsAutomatiques.all').should(requests => {
      expect(requests.at(-1)?.request.url).to.contain(query);
    });
  };

  const thenThePagesAreRequested = (pages: number[]): void => {
    cy.get('@pagesDesFinsAutomatiques.all').should('have.length', pages.length);
    pages.forEach((page, index) => {
      cy.get('@pagesDesFinsAutomatiques.all')
        .its(index)
        .its('request.url')
        .should('contain', `operateur=${operateurFinAutomatiqueFixture}&element=${elementFinAutomatiqueFixture}&page=${page}&size=5`);
    });
  };

  const thenTheAddressIs = (search: string): void => {
    cy.location('search').should('equal', search);
  };

  const thenTheAutomaticEndIsListedWithItsPeriod = (): void => {
    cy.get(dataSelector('fin-automatique-ligne')).should('have.length', 1);
    cy.get(dataSelector('fin-automatique-ligne'))
      .should('contain.text', finAutomatiqueLigneFixture.designation)
      .and('contain.text', 'Jean Dupont')
      .and('contain.text', 'Fraiseuse 1')
      .and('contain.text', 'Début jeu. 1 à 09:26 · fin automatique à 22:26');
  };

  const thenTheDossierOfTheOpeningIsRequested = (): void => {
    cy.wait('@dossier');
  };

  const thenTheDossierKeepsTheListAddress = (): void => {
    cy.location('pathname').should('equal', `/anomalies/${suiviFinAutomatiqueFixture}`);
    cy.location('search').should(search => {
      expect(Object.fromEntries(new URLSearchParams(search))).to.deep.equal({
        operateur: operateurFinAutomatiqueFixture,
        element: elementFinAutomatiqueFixture,
        page: '2',
        pointage: ouvrantFinAutomatiqueFixture,
      });
    });
  };

  const thenTheAutomaticEndDossierIsShown = (): void => {
    cy.get(dataSelector('anomalie-probleme')).should('contain.text', 'fin automatique à 21:00');
  };

  const thenTheEmptyListIsExplained = (): void => {
    cy.get(dataSelector('anomalies-vide')).should('have.text', 'Aucune fin automatique à traiter.');
  };
});

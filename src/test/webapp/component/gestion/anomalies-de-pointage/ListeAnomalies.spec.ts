import { components } from '@/app/generated/schema';
import { dataSelector } from '../../../utils/DataSelector';
import {
  autreElementFixture,
  autreElementNomFixture,
  autreOperateurFixture,
  autreOperateurNomFixture,
  elementFixture,
  elementNomFixture,
  elementReferenceFixture,
  givenTheElements,
  givenTheReferentiel,
  ligneFixture,
} from '../../../utils/gestion/anomalies-de-pointage/AnomaliesHttp.fixture';

describe('Conflict list in Gestion', () => {
  beforeEach(() => {
    givenTheReferentiel();
    givenTheElements();
    cy.intercept('GET', '/api/atelier/anomalies*', {
      body: { lignes: [ligneFixture], total: 1, complete: true, page: 0, size: 5 } satisfies components['schemas']['RestPageDesAnomalies'],
    });
  });
  it('should keep the wide list inside an accessible scroll region on a narrow screen', () => {
    whenVisitingAt(320);

    thenTheTableOwnsItsHorizontalScroll();
    thenThePageDoesNotOverflow();
  });

  it('should explain an unmatched selection when the chosen operator and element are applied', () => {
    whenVisitingAt(1280);
    whenApplyingTheChosenOperatorAndElement();

    thenNoConflictMatchesTheFilters();
  });

  it('should choose the element by its designation with the picker, without showing its identifier', () => {
    whenVisitingAt(1280);
    whenChoosingTheElement(autreElementNomFixture);

    thenTheElementFilterNames(autreElementNomFixture);
    thenTheFiltersNeverShow(autreElementFixture);
  });

  it('should find an element by its reference and name it with that reference', () => {
    whenVisitingAt(1280);
    whenSearchingTheElement('m-042');

    thenOnlyTheElementIsProposed(`${elementNomFixture} · ${elementReferenceFixture}`);
  });

  it('should name all the elements once the manager chooses that entry', () => {
    whenVisitingAt(1280);
    whenChoosingTheElement(autreElementNomFixture);
    whenChoosingTheElement('Tous les éléments');

    thenTheElementFilterNames('Tous les éléments');
  });

  it('should choose the operator by name with the picker', () => {
    whenVisitingAt(1280);
    whenChoosingTheOperator(autreOperateurNomFixture);

    thenTheOperatorFilterNames(autreOperateurNomFixture);
  });

  it('should name all the operators once the manager chooses that entry', () => {
    whenVisitingAt(1280);
    whenChoosingTheOperator(autreOperateurNomFixture);
    whenChoosingTheOperator('Tous les opérateurs');

    thenTheOperatorFilterNames('Tous les opérateurs');
  });

  const whenApplyingTheChosenOperatorAndElement = (): void => {
    cy.intercept(
      'GET',
      `/api/atelier/anomalies?nature=CONFLIT&operateur=${autreOperateurFixture}&element=${elementFixture}&page=0&size=5`,
      {
        body: { lignes: [], total: 0, complete: true, page: 0, size: 5 } satisfies components['schemas']['RestPageDesAnomalies'],
      },
    );
    whenChoosingTheOperator(autreOperateurNomFixture);
    whenChoosingTheElement(`${elementNomFixture} · ${elementReferenceFixture}`);
    cy.get(dataSelector('anomalies-filtrer')).click();
  };

  const whenChoosingTheElement = (libelle: string): void => {
    cy.get(dataSelector('anomalies-filtre-element')).click();
    cy.get(dataSelector('anomalies-filtre-element-proposition')).contains(libelle).click();
  };

  const whenSearchingTheElement = (recherche: string): void => {
    cy.get(dataSelector('anomalies-filtre-element')).click();
    cy.get(dataSelector('anomalies-filtre-element-recherche')).type(recherche);
  };

  const thenOnlyTheElementIsProposed = (libelle: string): void => {
    cy.get(dataSelector('anomalies-filtre-element-proposition')).should('have.length', 1).and('have.text', libelle);
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

  const thenTheOperatorFilterNames = (libelle: string): void => {
    cy.get(dataSelector('anomalies-filtre-operateur')).should('have.text', libelle);
  };

  const thenNoConflictMatchesTheFilters = (): void => {
    cy.get(dataSelector('anomalies-vide-filtre')).should('contain.text', 'Aucun conflit ne correspond');
    cy.get(dataSelector('conflit-ligne')).should('not.exist');
    cy.get(dataSelector('anomalies-vide')).should('not.exist');
  };

  const focusControls = [
    { selector: 'anomalies-filtre-operateur', description: 'operator filter' },
    { selector: 'anomalies-filtre-element', description: 'element filter' },
    { selector: 'anomalies-filtrer', description: 'filtering action' },
    { selector: 'conflit-ouvrir', description: 'dossier link' },
  ];

  focusControls.forEach(({ selector, description }) => {
    it(`should expose a visible focus ring on the ${description}`, () => {
      whenVisitingAt(1280);
      whenFocusingTheControl(selector);

      thenTheControlUsesTheFocusToken(selector);
    });
  });

  const whenFocusingTheControl = (selector: string): void => {
    cy.get(dataSelector(selector)).first().focus();
  };

  const thenTheControlUsesTheFocusToken = (selector: string): void => {
    cy.get(dataSelector(selector)).first().should('have.focus');
    cy.get(dataSelector(selector))
      .first()
      .should($input => {
        const input = $input[0];
        if (input === undefined) {
          throw new Error('The focused control is unavailable');
        }
        const button = input.ownerDocument.querySelector(dataSelector('anomalies-filtrer'));
        if (button === null) {
          throw new Error('The filtering action is unavailable');
        }
        const focus = getComputedStyle(input);
        const accent = getComputedStyle(button).backgroundColor;
        expect(focus.outlineWidth).to.equal('2px');
        expect(focus.outlineStyle).to.equal('solid');
        expect(focus.outlineColor).to.equal(accent);
      });
  };

  const whenVisitingAt = (width: number): void => {
    cy.viewport(width, 900);
    cy.visit('/anomalies?nature=CONFLIT');
  };

  const thenTheTableOwnsItsHorizontalScroll = (): void => {
    cy.get(dataSelector('anomalies-table')).should('have.attr', 'role', 'region');
    cy.get(dataSelector('anomalies-table')).should('have.attr', 'aria-label', 'Anomalies de pointage');
    cy.get(dataSelector('anomalies-table')).should('have.attr', 'tabindex', '0');
    cy.get(dataSelector('anomalies-table')).should($region => {
      expect($region[0]?.scrollWidth).to.be.greaterThan($region[0]?.clientWidth ?? 0);
    });
  };

  const thenThePageDoesNotOverflow = (): void => {
    cy.document().should(document => {
      expect(document.documentElement.scrollWidth).to.equal(document.documentElement.clientWidth);
    });
  };
});

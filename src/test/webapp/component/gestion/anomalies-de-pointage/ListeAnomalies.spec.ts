import { components } from '@/app/generated/schema';
import { dataSelector } from '../../../utils/DataSelector';
import {
  autreOperateurFixture,
  autreOperateurNomFixture,
  givenTheReferentiel,
  ligneFixture,
} from '../../../utils/gestion/anomalies-de-pointage/AnomaliesHttp.fixture';

describe('Conflict list in Gestion', () => {
  beforeEach(() => {
    givenTheReferentiel();
    cy.intercept('GET', '/api/atelier/anomalies*', {
      body: { lignes: [ligneFixture], total: 1, complete: true, page: 0, size: 5 } satisfies components['schemas']['RestPageDesAnomalies'],
    });
  });
  it('should keep the wide list inside an accessible scroll region on a narrow screen', () => {
    whenVisitingAt(320);

    thenTheTableOwnsItsHorizontalScroll();
    thenThePageDoesNotOverflow();
  });

  it('should explain an unmatched operator when filters are submitted with Enter', () => {
    whenVisitingAt(1280);
    whenFilteringWithEnter();

    thenNoConflictMatchesTheFilters();
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

  const whenFilteringWithEnter = (): void => {
    cy.intercept('GET', `/api/atelier/anomalies?nature=CONFLIT&operateur=${autreOperateurFixture}&element=M-042&page=0&size=5`, {
      body: { lignes: [], total: 0, complete: true, page: 0, size: 5 } satisfies components['schemas']['RestPageDesAnomalies'],
    });
    whenChoosingTheOperator(autreOperateurNomFixture);
    cy.get(dataSelector('anomalies-filtre-element')).type('M-042{enter}');
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

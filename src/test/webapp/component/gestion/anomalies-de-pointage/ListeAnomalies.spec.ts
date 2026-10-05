import { components } from '@/app/generated/schema';
import { dataSelector } from '../../../utils/DataSelector';
import { ligneFixture } from '../../../utils/gestion/anomalies-de-pointage/AnomaliesHttp.fixture';

describe('Conflict list in Gestion', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/atelier/conflits*', {
      body: { lignes: [ligneFixture], total: 1, complete: true, page: 0, size: 5 } satisfies components['schemas']['RestPageDesConflits'],
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

  const whenFilteringWithEnter = (): void => {
    cy.intercept('GET', '/api/atelier/conflits?operateur=Op%C3%A9rateur%20absent&element=M-042&page=0&size=5', {
      body: { lignes: [], total: 0, complete: true, page: 0, size: 5 } satisfies components['schemas']['RestPageDesConflits'],
    });
    cy.get(dataSelector('conflits-filtre-operateur')).type('Opérateur absent');
    cy.get(dataSelector('conflits-filtre-element')).type('M-042{enter}');
  };

  const thenNoConflictMatchesTheFilters = (): void => {
    cy.get(dataSelector('conflits-vide-filtre')).should('contain.text', 'Aucun conflit ne correspond');
    cy.get(dataSelector('conflit-ligne')).should('not.exist');
    cy.get(dataSelector('conflits-vide')).should('not.exist');
  };

  const focusControls = [
    { selector: 'conflits-filtre-operateur', description: 'operator filter' },
    { selector: 'conflits-filtrer', description: 'filtering action' },
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
        const button = input.ownerDocument.querySelector(dataSelector('conflits-filtrer'));
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
    cy.visit('/conflits');
  };

  const thenTheTableOwnsItsHorizontalScroll = (): void => {
    cy.get(dataSelector('conflits-table')).should('have.attr', 'role', 'region');
    cy.get(dataSelector('conflits-table')).should('have.attr', 'aria-label', 'Conflits de pointage');
    cy.get(dataSelector('conflits-table')).should('have.attr', 'tabindex', '0');
    cy.get(dataSelector('conflits-table')).should($region => {
      expect($region[0]?.scrollWidth).to.be.greaterThan($region[0]?.clientWidth ?? 0);
    });
  };

  const thenThePageDoesNotOverflow = (): void => {
    cy.document().should(document => {
      expect(document.documentElement.scrollWidth).to.equal(document.documentElement.clientWidth);
    });
  };
});

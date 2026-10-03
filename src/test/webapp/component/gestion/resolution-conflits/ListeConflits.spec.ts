import { dataSelector } from '../../../utils/DataSelector';

describe('Conflict list in Gestion', () => {
  it('should keep the wide list inside an accessible scroll region on a narrow screen', () => {
    whenVisitingAt(320);

    thenTheTableOwnsItsHorizontalScroll();
    thenThePageDoesNotOverflow();
  });

  it('should expose a visible focus ring on the operator filter', () => {
    whenVisitingAt(1280);
    whenFocusingTheControl('conflits-filtre-operateur');

    thenTheControlUsesTheFocusToken('conflits-filtre-operateur');
  });

  it('should expose a visible focus ring on the filtering action', () => {
    whenVisitingAt(1280);
    whenFocusingTheControl('conflits-filtrer');

    thenTheControlUsesTheFocusToken('conflits-filtrer');
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

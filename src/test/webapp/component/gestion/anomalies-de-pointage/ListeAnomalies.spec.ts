import { dataSelector } from '../../../utils/DataSelector';
import {
  autreElementFinAutomatiqueFixture,
  autreOperateurFinAutomatiqueFixture,
  givenTheElementsFinsAutomatiques,
  givenTheReferentielFinsAutomatiques,
  pageFinsAutomatiquesFixture,
} from '../../../utils/gestion/anomalies-de-pointage/FinsAutomatiquesHttp.fixture';

const AUTRE_ELEMENT_NOM = 'Bielle';
const AUTRE_ELEMENT_REFERENCE = 'B-12';
const AUTRE_OPERATEUR_NOM = 'Alex Durand · 012';

describe('Automatic end list in Gestion', () => {
  beforeEach(() => {
    givenTheReferentielFinsAutomatiques();
    givenTheElementsFinsAutomatiques();
    cy.intercept('GET', '/api/atelier/anomalies*', { body: pageFinsAutomatiquesFixture() });
  });

  it('should keep the wide list inside an accessible scroll region on a narrow screen', () => {
    whenVisitingAt(320);

    thenTheTableOwnsItsHorizontalScroll();
    thenThePageDoesNotOverflow();
  });

  it('should explain an unmatched selection when the chosen operator and element are applied', () => {
    whenVisitingAt(1280);
    whenApplyingTheChosenOperatorAndElement();

    thenNoAutomaticEndMatchesTheFilters();
  });

  it('should choose the element by its designation with the picker, without showing its identifier', () => {
    whenVisitingAt(1280);
    whenChoosingTheElement(AUTRE_ELEMENT_NOM);

    thenTheElementFilterNames(`${AUTRE_ELEMENT_NOM} · ${AUTRE_ELEMENT_REFERENCE}`);
    thenTheFiltersNeverShow(autreElementFinAutomatiqueFixture);
  });

  it('should find an element by its reference and name it with that reference', () => {
    whenVisitingAt(1280);
    whenSearchingTheElement('b-12');

    thenOnlyTheElementIsProposed(`${AUTRE_ELEMENT_NOM} · ${AUTRE_ELEMENT_REFERENCE}`);
  });

  it('should name all the elements once the manager chooses that entry', () => {
    whenVisitingAt(1280);
    whenChoosingTheElement(AUTRE_ELEMENT_NOM);
    whenChoosingTheElement('Tous les éléments');

    thenTheElementFilterNames('Tous les éléments');
  });

  it('should choose the operator by name with the picker', () => {
    whenVisitingAt(1280);
    whenChoosingTheOperator(AUTRE_OPERATEUR_NOM);

    thenTheOperatorFilterNames(AUTRE_OPERATEUR_NOM);
  });

  it('should name all the operators once the manager chooses that entry', () => {
    whenVisitingAt(1280);
    whenChoosingTheOperator(AUTRE_OPERATEUR_NOM);
    whenChoosingTheOperator('Tous les opérateurs');

    thenTheOperatorFilterNames('Tous les opérateurs');
  });

  const whenApplyingTheChosenOperatorAndElement = (): void => {
    cy.intercept(
      'GET',
      `/api/atelier/anomalies?operateur=${autreOperateurFinAutomatiqueFixture}&element=${autreElementFinAutomatiqueFixture}&page=0&size=5`,
      { body: pageFinsAutomatiquesFixture([]) },
    );
    whenChoosingTheOperator(AUTRE_OPERATEUR_NOM);
    whenChoosingTheElement(`${AUTRE_ELEMENT_NOM} · ${AUTRE_ELEMENT_REFERENCE}`);
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

  const thenNoAutomaticEndMatchesTheFilters = (): void => {
    cy.get(dataSelector('anomalies-vide-filtre')).should('contain.text', 'Aucune fin automatique ne correspond');
    cy.get(dataSelector('fin-automatique-ligne')).should('not.exist');
    cy.get(dataSelector('anomalies-vide')).should('not.exist');
  };

  const focusControls = [
    { selector: 'anomalies-filtre-operateur', description: 'operator filter' },
    { selector: 'anomalies-filtre-element', description: 'element filter' },
    { selector: 'anomalies-filtrer', description: 'filtering action' },
    { selector: 'fin-automatique-ouvrir', description: 'dossier link' },
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
    cy.visit('/anomalies');
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

import { dataSelector } from '../../../utils/DataSelector';
import { CoutDeRevientApiFixture } from '../../../utils/gestion/cout-de-revient/CoutDeRevientApiFixture';
import { interceptForever } from '../../../utils/Interceptor';

describe('Element choice in the cost report', () => {
  let api: CoutDeRevientApiFixture;

  beforeEach(() => {
    api = new CoutDeRevientApiFixture();
  });

  it('should keep the labelled element control available when its report is missing', () => {
    givenAnUnknownReportWithAvailableElements();

    whenVisitingTheReport();

    thenTheElementControlUsesTheReferenceIdentity();
  });

  it('should open anchored choices and focus the element search', () => {
    givenAnUnknownReportWithAvailableElements();
    whenVisitingTheReport();

    whenOpeningTheChoices();

    thenTheSearchAndChoicesAreAvailable();
  });

  it('should search names without accents case or surrounding spaces without rereading data', () => {
    givenAnUnknownReportWithAvailableElements();
    whenVisitingTheReport();
    whenOpeningTheChoices();

    whenSearchingFor('  EBAUCHE  ');

    thenOnlyTheMatchingElementIsOffered();
  });

  it('should sort choices by name then displayed type', () => {
    givenAnUnknownReportWithAvailableElements();
    whenVisitingTheReport();

    whenOpeningTheChoices();

    thenTheChoicesAreAlphabetical();
  });

  it('should identify the current choice without relying on colour', () => {
    givenAnUnknownReportWithAvailableElements();
    whenVisitingTheReport();

    whenOpeningTheChoices();

    thenTheCurrentElementIsNamed();
  });

  const thenTheCurrentElementIsNamed = (): void => {
    cy.get(dataSelector('cout-element-option')).last().should('have.attr', 'aria-current', 'true').and('contain.text', 'Élément courant');
    cy.get(dataSelector('cout-element-option')).first().should('not.have.attr', 'aria-current');
  };

  ['cout-element-search', 'cout-element-option'].forEach(selector => {
    it(`should close with Escape from ${selector} and restore trigger focus`, () => {
      givenAnUnknownReportWithAvailableElements();
      whenVisitingTheReport();
      whenOpeningTheChoices();

      whenPressingEscapeFrom(selector);

      thenThePanelIsClosedWithTriggerFocus();
    });
  });

  it('should close the current choice without rereading or closing its report detail', () => {
    givenAReportWithAvailableElements();
    whenVisitingTheReport();
    whenOpeningTheReportDetail();
    whenOpeningTheChoices();

    whenChoosingElement('element-1');

    thenTheCurrentReportAndDetailAreRetained();
  });

  const givenAReportWithAvailableElements = (): void => {
    givenAnUnknownReportWithAvailableElements();
    api.elementInconnu = false;
  };
  const whenOpeningTheReportDetail = (): void => {
    cy.get(dataSelector('cout-detail-toggle')).first().click();
  };
  const whenChoosingElement = (id: string): void => {
    cy.get(dataSelector('cout-element-option')).filter(`[data-element="${id}"]`).click();
  };
  const thenTheCurrentReportAndDetailAreRetained = (): void => {
    cy.get(dataSelector('cout-detail')).should('be.visible');
    cy.get(dataSelector('cout-element-panel')).should('not.exist');
    cy.get(dataSelector('cout-element-trigger')).should('have.focus');
    cy.get('@elementsRead.all').should('have.length', 1);
    cy.get('@coutDeRevientRead.all').should('have.length', 1);
    cy.location('pathname').should('equal', '/couts-de-revient/element-1');
  };

  it('should keep the report readable beside a failed choice collection and offer an independent retry', () => {
    givenAFailedCollection();

    whenVisitingTheReport();

    thenOnlyTheChoiceIsUnavailable();
  });

  it('should explain an empty collection without hiding the successful report', () => {
    givenAnEmptyCollection();

    whenVisitingTheReport();

    thenTheEmptyChoiceAndReportAreVisible();
  });

  it('should close on an outside click while leaving focus on that target', () => {
    givenAReportWithAvailableElements();
    whenVisitingTheReport();
    whenOpeningTheChoices();

    whenClickingTheReportDetailOutsideThePanel();

    thenTheOutsideTargetKeepsFocus();
  });

  const whenClickingTheReportDetailOutsideThePanel = (): void => {
    cy.get(dataSelector('cout-detail-toggle')).first().click();
  };
  const thenTheOutsideTargetKeepsFocus = (): void => {
    cy.get(dataSelector('cout-element-panel')).should('not.exist');
    cy.get(dataSelector('cout-detail-toggle')).first().should('have.focus');
    cy.get('@coutDeRevientRead.all').should('have.length', 1);
  };

  it('should clear the previous search when reopening the choices', () => {
    givenAReportWithAvailableElements();
    whenVisitingTheReport();
    whenOpeningTheChoices();
    whenSearchingFor('Ébauche');
    whenPressingEscapeFrom('cout-element-search');

    whenOpeningTheChoices();

    thenTheWholeCollectionIsOfferedAgain();
  });

  const thenTheWholeCollectionIsOfferedAgain = (): void => {
    cy.get(dataSelector('cout-element-search')).should('have.value', '');
    cy.get(dataSelector('cout-element-option')).should('have.length', 2);
    cy.get('@elementsRead.all').should('have.length', 1);
  };

  it('should explain that no choice matches the search', () => {
    givenAReportWithAvailableElements();
    whenVisitingTheReport();
    whenOpeningTheChoices();

    whenSearchingFor('introuvable');

    thenTheSearchHasNoMatchingChoice();
  });

  const thenTheSearchHasNoMatchingChoice = (): void => {
    cy.get(dataSelector('cout-element-no-match')).should('contain.text', 'Aucun élément ne correspond');
    cy.get(dataSelector('cout-element-option')).should('not.exist');
    cy.get('@coutDeRevientRead.all').should('have.length', 1);
  };

  it('should display local collection loading while the independent report is already readable', () => {
    const pending = givenAPendingCollection();
    whenVisitingTheReport();

    whenObservingAndReleasingTheCollection(pending);

    thenLoadingWasLocalToTheChoice();
  });

  const givenAPendingCollection = (): { send: () => void } => {
    api.install();
    return interceptForever(
      { method: 'GET', pathname: '/api/elements-de-fabrication' },
      {
        body: {
          content: [{ id: 'element-1', nom: 'OF Alpha', type: 'ORDRE_DE_FABRICATION' }],
          currentPage: 0,
          pageSize: 100,
          totalElementsCount: 1,
        },
      },
      'elementsRead',
    );
  };
  const whenObservingAndReleasingTheCollection = (pending: { send: () => void }): void => {
    cy.get(dataSelector('cout-element-loading')).invoke('text').as('loadingText', { type: 'static' });
    cy.get(dataSelector('cout-total')).invoke('text').as('independentCost', { type: 'static' });
    cy.get(dataSelector('cout-element-trigger')).invoke('prop', 'disabled').as('choiceDisabled', { type: 'static' });
    cy.then(() => {
      pending.send();
    });
  };
  const thenLoadingWasLocalToTheChoice = (): void => {
    cy.get('@loadingText').should('contain', 'Chargement des éléments');
    cy.get('@independentCost').should('contain', '295,00');
    cy.get('@choiceDisabled').should('equal', true);
    cy.get(dataSelector('cout-element-trigger')).should('be.enabled');
    cy.get(dataSelector('cout-element-loading')).should('not.exist');
  };

  ['OF', 'moule'].forEach(type => {
    it(`should find choices by their displayed ${type} type`, () => {
      givenAReportWithAvailableElements();
      whenVisitingTheReport();
      whenOpeningTheChoices();

      whenSearchingFor(type);

      thenTheDisplayedTypeMatches(type);
    });
  });

  it('should retry only the failed collection and keep the already visible report', () => {
    givenACollectionThatRecovers();
    whenVisitingTheReport();

    whenRetryingTheCollection();

    thenOnlyTheCollectionWasRetried();
  });

  it('should retry only the report while preserving the acquired choices', () => {
    givenAFailedReportWithAvailableChoices();
    whenVisitingTheReport();

    whenRetryingTheReport();

    thenOnlyTheReportWasRetried();
  });

  it('should use a neutral identity for an unknown address without inventing a choice', () => {
    givenAnUnknownReportWithAvailableElements();

    whenVisitingAnUnknownAddressAndOpeningTheChoices();

    thenTheUnknownAddressHasNoFictitiousChoice();
  });

  it('should allow Tab and Shift Tab between search and native choice buttons', () => {
    givenAReportWithAvailableElements();
    whenVisitingTheReport();
    whenOpeningTheChoices();

    whenMovingForwardAndBackThroughTheControls();

    thenTheNativeTabOrderIsPreserved();
  });

  it('should choose another element with the keyboard and restore trigger focus', () => {
    givenAReportWithAvailableElements();
    whenVisitingTheReport();
    whenOpeningTheChoices();

    whenChoosingTheNextElementWithTheKeyboard();

    thenTheKeyboardChoiceClosesAndRestoresFocus();
  });

  const whenChoosingTheNextElementWithTheKeyboard = (): void => {
    cy.press(Cypress.Keyboard.Keys.TAB);
    cy.focused().should('have.attr', 'data-element', 'element-2');
    cy.press(Cypress.Keyboard.Keys.SPACE);
  };
  const thenTheKeyboardChoiceClosesAndRestoresFocus = (): void => {
    cy.location('pathname').should('equal', '/couts-de-revient/element-2');
    cy.get(dataSelector('cout-element-panel')).should('not.exist');
    cy.get(dataSelector('cout-element-trigger')).should('have.focus');
    cy.get('@elementsRead.all').should('have.length', 1);
    cy.get('@coutDeRevientRead.all').should('have.length', 2);
  };

  const givenACollectionThatRecovers = (): void => {
    api.install();
    let attempts = 0;
    cy.intercept('GET', '/api/elements-de-fabrication*', request => {
      attempts += 1;
      request.reply(
        attempts === 1
          ? { statusCode: 500, body: {} }
          : {
              body: {
                content: [{ id: 'element-1', nom: 'OF Alpha', type: 'ORDRE_DE_FABRICATION' }],
                currentPage: 0,
                pageSize: 100,
                totalElementsCount: 1,
              },
            },
      );
    }).as('elementsRead');
  };
  const givenAFailedReportWithAvailableChoices = (): void => {
    givenAReportWithAvailableElements();
    api.failRead = true;
  };
  const whenRetryingTheCollection = (): void => {
    cy.get(dataSelector('cout-element-retry')).click();
  };
  const whenRetryingTheReport = (): void => {
    cy.get(dataSelector('cout-retry')).should('be.enabled');
    cy.then(() => {
      api.failRead = false;
    });
    cy.get(dataSelector('cout-retry')).click();
  };
  const whenVisitingAnUnknownAddressAndOpeningTheChoices = (): void => {
    cy.visit('/couts-de-revient/inconnu');
    whenOpeningTheChoices();
  };
  const whenMovingForwardAndBackThroughTheControls = (): void => {
    cy.press(Cypress.Keyboard.Keys.TAB);
    cy.focused().invoke('attr', 'data-element').as('tabbedElement', { type: 'static' });
    cy.get(dataSelector('cout-element-option')).first().type('{shift}', { release: false });
    cy.press(Cypress.Keyboard.Keys.TAB);
    cy.get(dataSelector('cout-element-search')).type('{shift}');
  };
  const thenTheDisplayedTypeMatches = (type: string): void => {
    cy.get(dataSelector('cout-element-option'))
      .should('have.length', 1)
      .and('contain.text', type === 'OF' ? 'OF · OF Alpha' : 'Moule · Ébauche');
  };
  const thenOnlyTheCollectionWasRetried = (): void => {
    cy.get(dataSelector('cout-element-trigger')).should('be.enabled');
    cy.get(dataSelector('cout-element-error')).should('not.exist');
    cy.get(dataSelector('cout-total')).should('contain.text', '295,00');
    cy.get('@elementsRead.all').should('have.length', 2);
    cy.get('@coutDeRevientRead.all').should('have.length', 1);
  };
  const thenOnlyTheReportWasRetried = (): void => {
    cy.get(dataSelector('cout-total')).should('contain.text', '295,00');
    cy.get('@elementsRead.all').should('have.length', 1);
    cy.get('@coutDeRevientRead.all').should('have.length', 2);
  };
  const thenTheUnknownAddressHasNoFictitiousChoice = (): void => {
    cy.get(dataSelector('cout-identite')).should('contain.text', 'Choisir un élément');
    cy.get(dataSelector('cout-element-option')).should('have.length', 2).and('not.have.attr', 'aria-current');
  };
  const thenTheNativeTabOrderIsPreserved = (): void => {
    cy.get('@tabbedElement').should('equal', 'element-2');
    cy.get(dataSelector('cout-element-search')).should('have.focus');
    cy.get(dataSelector('cout-element-panel')).should('be.visible');
  };

  [320, 1024, 1280].forEach(width => {
    it(`should keep long identities and the anchored panel inside a ${String(width)} pixel viewport`, () => {
      givenLongElementNames();

      whenViewingTheChoicesAt(width);

      thenTheControlsFitTheViewport(width);
    });
  });

  const givenLongElementNames = (): void => {
    givenAReportWithAvailableElements();
    api.rapport = {
      ...api.rapport,
      element: { id: 'element-1', nom: 'OF avec une désignation très longue '.repeat(8).trim(), type: 'ORDRE_DE_FABRICATION' },
    };
    cy.intercept('GET', '/api/elements-de-fabrication*', {
      body: {
        content: [
          { id: 'element-1', nom: 'OF avec une désignation très longue '.repeat(8).trim(), type: 'ORDRE_DE_FABRICATION' },
          { id: 'element-2', nom: 'Ébauche '.repeat(20).trim(), type: 'PRODUIT' },
        ],
        currentPage: 0,
        pageSize: 100,
        totalElementsCount: 2,
      },
    });
  };
  const whenViewingTheChoicesAt = (width: number): void => {
    cy.viewport(width, 900);
    whenVisitingTheReport();
    whenOpeningTheChoices();
  };
  const thenTheControlsFitTheViewport = (width: number): void => {
    cy.get(dataSelector('cout-identite')).should('contain.text', 'OF avec une désignation très longue '.repeat(8).trim());
    cy.get(dataSelector('cout-element-panel')).should(panel => {
      const bounds = panel[0]?.getBoundingClientRect();
      expect(bounds?.left).to.be.at.least(0);
      expect(bounds?.right).to.be.at.most(width);
      expect(bounds?.bottom).to.be.at.most(900);
    });
    cy.get(dataSelector('cout-element-option')).each(option => {
      expect(option[0]?.getBoundingClientRect().height).to.be.at.least(44);
    });
    cy.get(dataSelector('cout-element-trigger')).should(trigger => {
      expect(trigger[0]?.getBoundingClientRect().height).to.be.at.least(44);
    });
    cy.document().then(doc => {
      expect(doc.documentElement.scrollWidth).to.be.at.most(width);
    });
    cy.screenshot(`cout-element-choice-${String(width)}`, { capture: 'viewport' });
  };

  const givenAnEmptyCollection = (): void => {
    api.install();
    cy.intercept('GET', '/api/elements-de-fabrication*', { body: { content: [], currentPage: 0, pageSize: 100, totalElementsCount: 0 } });
  };
  const thenTheEmptyChoiceAndReportAreVisible = (): void => {
    cy.get(dataSelector('cout-element-empty')).should('contain.text', 'Aucun élément disponible');
    cy.get(dataSelector('cout-element-trigger')).should('be.disabled').and('contain.text', 'OF · OF-2026-000001');
    cy.get(dataSelector('cout-total')).should('contain.text', '295,00');
  };

  const givenAFailedCollection = (): void => {
    api.install();
    cy.intercept('GET', '/api/elements-de-fabrication*', { statusCode: 500, body: {} }).as('elementsRead');
  };
  const thenOnlyTheChoiceIsUnavailable = (): void => {
    cy.get(dataSelector('cout-total')).should('contain.text', '295,00');
    cy.get(dataSelector('cout-element-error')).should('be.visible');
    cy.get(dataSelector('cout-element-retry')).should('be.enabled');
    cy.get(dataSelector('cout-element-trigger')).should('be.disabled');
  };

  const whenPressingEscapeFrom = (selector: string): void => {
    cy.get(dataSelector(selector)).first().focus();
    cy.get(dataSelector(selector)).first().type('{esc}');
  };
  const thenThePanelIsClosedWithTriggerFocus = (): void => {
    cy.get(dataSelector('cout-element-panel')).should('not.exist');
    cy.get(dataSelector('cout-element-trigger')).should('have.focus').and('have.attr', 'aria-expanded', 'false');
  };

  const thenTheChoicesAreAlphabetical = (): void => {
    cy.get(dataSelector('cout-element-option')).then(options => {
      expect([...options].map(option => option.dataset['element'])).to.deep.equal(['element-2', 'element-1']);
    });
  };

  const whenSearchingFor = (search: string): void => {
    cy.get(dataSelector('cout-element-search')).type(search);
  };
  const thenOnlyTheMatchingElementIsOffered = (): void => {
    cy.get(dataSelector('cout-element-option')).should('have.length', 1).and('contain.text', 'Moule · Ébauche');
    cy.get('@elementsRead.all').should('have.length', 1);
    cy.get('@coutDeRevientRead.all').should('have.length', 1);
  };

  const whenOpeningTheChoices = (): void => {
    cy.get(dataSelector('cout-element-trigger')).click();
  };

  const thenTheSearchAndChoicesAreAvailable = (): void => {
    cy.get(dataSelector('cout-element-search')).should('have.focus').and('have.attr', 'aria-label', 'Rechercher un élément');
    cy.get(dataSelector('cout-element-option')).should('have.length', 2);
    cy.get(dataSelector('cout-element-trigger'))
      .should('have.attr', 'aria-expanded', 'true')
      .and('have.attr', 'aria-controls', 'cout-element-panel');
  };

  const givenAnUnknownReportWithAvailableElements = (): void => {
    api.elementInconnu = true;
    api.install();
    cy.intercept('GET', '/api/elements-de-fabrication*', {
      body: {
        content: [
          { id: 'element-1', nom: 'OF Alpha', type: 'ORDRE_DE_FABRICATION' },
          { id: 'element-2', nom: 'Ébauche', type: 'PRODUIT' },
        ],
        currentPage: 0,
        pageSize: 100,
        totalElementsCount: 2,
      },
    }).as('elementsRead');
  };

  const whenVisitingTheReport = (): void => {
    cy.visit('/couts-de-revient/element-1');
  };

  const thenTheElementControlUsesTheReferenceIdentity = (): void => {
    cy.get(dataSelector('cout-element-label')).should('have.text', 'Élément');
    cy.get(dataSelector('cout-element-trigger')).should('be.enabled').and('contain.text', 'OF · OF Alpha');
  };
});

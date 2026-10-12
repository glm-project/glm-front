import { dataSelector } from '../../../utils/DataSelector';
import { ElementsApiFixture, elementsFixture } from '../../../utils/gestion/element-de-fabrication/ElementsApiFixture';
import { SupervisionApiFixture } from '../../../utils/gestion/supervision-atelier/SupervisionApiFixture';

describe('Manufacturing element referential in gestion', () => {
  beforeEach(() => new SupervisionApiFixture().intercept());
  it('should reach the referential from the gestion menu', () => {
    givenReferential();
    whenOpeningFromTheMenu();

    thenReferentialIsVisible();
  });

  it('should open on the products in the workshop', () => {
    givenProductsInTheirCycles();
    whenVisitingReferential();

    thenOnlyListed('1015');
  });

  it('should reopen the tab and the search its address carries', () => {
    givenProductsInTheirCycles();
    whenVisiting('/produits?etat=en-preparation&recherche=2001');

    thenOnlyListed('2001');
    thenAddressIs('?etat=en-preparation&recherche=2001');
  });

  it('should write the chosen tab into the address', () => {
    givenProductsInTheirCycles();
    whenVisitingReferential();
    whenChoosingCycle('EN_PREPARATION');

    thenAddressIs('?etat=en-preparation');
  });

  it('should keep the products in preparation on their own tab', () => {
    givenProductsInTheirCycles();
    whenVisitingReferential();
    whenChoosingCycle('EN_PREPARATION');

    thenOnlyListed('2001');
  });

  it('should create the first moule and list it with its screen words', () => {
    givenReferential();
    whenVisitingReferential();
    whenCreating('elements-new', 'MOULE', '1015', 'Moule de capot');

    thenElementIsListed('1015', 'MOULE', 'Moule de capot');
  });

  it('should create an OF in the category chosen in the form', () => {
    givenReferential();
    whenVisitingReferential();
    whenCreating('elements-new', 'OF', '1016', 'Reprise du capot');

    thenElementIsListed('1016', 'OF', 'Reprise du capot');
  });

  it('should create an element reduced to its produced number', () => {
    const api = givenReferential();
    whenVisitingReferential();
    whenOpeningCreation('elements-new');
    whenChoosingCategory('MOULE');
    whenSaving();

    thenElementWithoutFicheIsListed(api);
  });

  it('should save and list the element after correcting a duplicate reference', () => {
    givenReferential(1);
    whenVisitingReferential();
    whenCreating('elements-new', 'MOULE', '1015', 'Moule de capot');
    whenCorrectingReference('1099');

    thenElementIsListed('1099', 'MOULE', 'Moule de capot');
  });

  it('should modify an element and remove its label', () => {
    givenProductsInPreparation(1);
    whenVisitingReferential();
    whenChoosingCycle('EN_PREPARATION');
    whenEditingFirstElement();
    whenReplacing('element-reference', '1099');
    whenReplacing('element-libelle', '');
    whenSavingModification();

    thenElementIsListed('1099', 'MOULE', '—');
  });

  it('should create a product in a category declared from the category management', () => {
    givenReferential();
    whenVisitingReferential();
    whenDeclaringCategory('piece');
    whenCreating('elements-new', 'PIECE', '2001', 'Insert');

    thenElementIsListed('2001', 'PIECE', 'Insert');
  });

  it('should create a product in the category of the active filter without choosing it again', () => {
    givenReferential();
    whenVisitingReferential();
    whenFilteringOn('OF');
    whenOpeningCreation('elements-new');
    whenSaving();

    thenElementIsListed('—', 'OF', '—');
  });

  it('should offer the categories of the creation form in the order chosen in the category management', () => {
    givenReferential();
    whenVisitingReferential();
    whenMovingCategoryDown('MOULE');
    whenOpeningCreation('elements-new');

    thenCreationsAreOffered(['OF', 'MOULE']);
  });

  it('should stop offering the creation in a category removed from the management', () => {
    givenReferential();
    whenVisitingReferential();
    whenRemovingCategory('MOULE');
    whenClosingCategoryManagementWithout('MOULE');
    whenOpeningCreation('elements-new');

    thenCreationsAreOffered(['OF']);
  });

  it('should offer no removal of a category holding products', () => {
    givenReferential(1);
    whenVisitingReferential();
    whenOpeningCategoryManagement();

    thenRemovalIsOfferedOnlyFor('OF');
  });

  it('should paginate the referential without asking for any period', () => {
    givenReferential(21);
    whenVisitingReferential();
    whenGoingToNextPage();

    thenLastPageShowsTheRemainingElement();
  });
});

const givenReferential = (nombre = 0): ElementsApiFixture => {
  const api = new ElementsApiFixture(elementsFixture(nombre));
  api.install();
  return api;
};
const givenProductsInPreparation = (nombre: number): void => {
  new ElementsApiFixture(elementsFixture(nombre, 'EN_PREPARATION')).install();
};
const givenProductsInTheirCycles = (): void => {
  const [enAtelier] = elementsFixture(1);
  const [enPreparation] = elementsFixture(1, 'EN_PREPARATION');
  new ElementsApiFixture([
    ...(enAtelier === undefined ? [] : [enAtelier]),
    ...(enPreparation === undefined ? [] : [{ ...enPreparation, id: 'element-2', reference: '2001' }]),
  ]).install();
};
const whenVisiting = (url: string): void => {
  cy.viewport(1280, 900);
  cy.visit(url);
};
const thenAddressIs = (search: string): void => {
  cy.location('search').should('eq', search);
};
const whenChoosingCycle = (cycle: string): void => {
  cy.get(dataSelector(`elements-cycle-${cycle}`)).click();
};
const thenOnlyListed = (reference: string): void => {
  cy.get(dataSelector('element-reference-cell')).should('have.length', 1).invoke('text').invoke('trim').should('equal', reference);
};
const whenDeclaringCategory = (code: string): void => {
  cy.get(dataSelector('elements-categories')).click();
  cy.get(dataSelector('categorie-item')).should('have.length', 2);
  cy.get(dataSelector('categorie-new')).click();
  cy.get(dataSelector('categorie-code')).type(`${code}{enter}`);
  cy.get(dataSelector('categorie-item')).should('contain.text', code.toUpperCase());
  cy.get(dataSelector('categories-close')).click();
  cy.get(dataSelector(`elements-categorie-${code.toUpperCase()}`)).should('exist');
};
const whenMovingCategoryDown = (code: string): void => {
  cy.get(dataSelector('elements-categories')).click();
  cy.get(dataSelector(`categorie-descendre-${code}`)).click();
  cy.wait('@categoriesReorder');
  cy.get(dataSelector('categories-close')).click();
  cy.get(dataSelector('elements-filtres')).find('button').last().invoke('text').invoke('trim').should('equal', code);
};
const thenCreationsAreOffered = (codes: readonly string[]): void => {
  cy.get(dataSelector('element-categorie'))
    .find('option:not([value=""])')
    .should(options => {
      expect(Array.from(options, option => option.textContent.trim())).to.deep.equal(codes);
    });
};
const whenRemovingCategory = (code: string): void => {
  cy.get(dataSelector('elements-categories')).click();
  cy.get(dataSelector(`categorie-supprimer-${code}`)).click();
  cy.get(dataSelector('categorie-delete-confirm')).click();
  cy.wait('@categorieDelete');
};
const whenClosingCategoryManagementWithout = (code: string): void => {
  cy.get(dataSelector('categorie-delete-confirm')).should('not.exist');
  cy.get(dataSelector('categories-close')).click();
  cy.get(dataSelector(`elements-categorie-${code}`)).should('not.exist');
};
const whenOpeningCategoryManagement = (): void => {
  cy.get(dataSelector('elements-categories')).click();
  cy.get(dataSelector('categorie-item')).should('have.length', 2);
};
const thenRemovalIsOfferedOnlyFor = (code: string): void => {
  cy.get('[data-selector^="categorie-supprimer-"]')
    .should('have.length', 1)
    .and('have.attr', 'data-selector', `categorie-supprimer-${code}`);
};
const whenVisitingReferential = (): void => {
  cy.viewport(1280, 900);
  cy.visit('/produits');
};
const whenOpeningFromTheMenu = (): void => {
  cy.visit('/');
  cy.get(dataSelector('gestion-menu')).click();
  cy.get(dataSelector('gestion-navigation-elements')).click();
};
const whenOpeningCreation = (selector: string): void => {
  cy.get(dataSelector(selector)).should('be.enabled').click();
};
const whenChoosingCategory = (code: string): void => {
  cy.get(dataSelector('element-categorie')).select(code);
};
const whenFilteringOn = (code: string): void => {
  cy.get(dataSelector(`elements-categorie-${code}`)).click();
};
const whenReplacing = (selector: string, value: string): void => {
  cy.get(dataSelector(selector)).clear();
  if (value !== '') cy.get(dataSelector(selector)).type(value);
};
const whenCreating = (selector: string, categorie: string, reference: string, libelle: string): void => {
  whenOpeningCreation(selector);
  whenChoosingCategory(categorie);
  whenReplacing('element-reference', reference);
  whenReplacing('element-libelle', libelle);
  whenSaving();
};
const whenSaving = (): void => {
  cy.get(dataSelector('element-save')).click();
  cy.wait('@elementCreate');
};
const whenSavingModification = (): void => {
  cy.get(dataSelector('element-save')).click();
  cy.wait('@elementUpdate');
};
const whenCorrectingReference = (reference: string): void => {
  whenReplacing('element-reference', reference);
  whenSaving();
};
const whenEditingFirstElement = (): void => {
  cy.get(dataSelector('element-edit')).first().click();
};
const whenGoingToNextPage = (): void => {
  cy.wait('@elementsRead');
  cy.get(dataSelector('elements-page-suivante')).click();
};
const thenReferentialIsVisible = (): void => {
  cy.location('pathname').should('eq', '/produits');
  cy.get(dataSelector('elements-page')).should('be.visible');
  cy.get(dataSelector('elements-empty')).should('contain.text', 'Rien à l’atelier pour l’instant.');
};
const thenElementIsListed = (reference: string, categorie: string, libelle: string): void => {
  cy.get(dataSelector('element-form')).should('not.exist');
  cy.get(dataSelector('element-row')).contains(reference).closest('tr').should('contain.text', categorie).and('contain.text', libelle);
};
const thenElementWithoutFicheIsListed = (api: ElementsApiFixture): void => {
  thenElementIsListed('—', 'MOULE', '—');
  cy.wrap(api.writes).should('deep.equal', [{ categorie: 'MOULE' }]);
};
const thenLastPageShowsTheRemainingElement = (): void => {
  cy.get(dataSelector('element-row')).should('have.length', 1);
  cy.get(dataSelector('elements-pagination')).should('contain.text', '21–21 sur 21');
  cy.get('@elementsRead').its('request.query').should('deep.include', { cycle: 'EN_ATELIER', page: '1' }).and('not.have.property', 'debut');
};

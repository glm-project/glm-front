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

  it('should create the first moule and list it with its screen words', () => {
    givenReferential();
    whenVisitingReferential();
    whenCreating('elements-empty-create-MOULE', '1015', 'Moule de capot');

    thenElementIsListed('1015', 'MOULE', 'Moule de capot');
  });

  it('should create an OF carrying the type of the button that opened the form', () => {
    givenReferential();
    whenVisitingReferential();
    whenCreating('elements-empty-create-OF', '1016', 'Reprise du capot');

    thenElementIsListed('1016', 'OF', 'Reprise du capot');
  });

  it('should create an element reduced to its produced number', () => {
    const api = givenReferential();
    whenVisitingReferential();
    whenOpeningCreation('elements-empty-create-MOULE');
    whenSaving();

    thenElementWithoutFicheIsListed(api);
  });

  it('should save and list the element after correcting a duplicate reference', () => {
    givenReferential(1);
    whenVisitingReferential();
    whenCreating('elements-new-MOULE', '1015', 'Moule de capot');
    whenCorrectingReference('1099');

    thenElementIsListed('1099', 'MOULE', 'Moule de capot');
  });

  it('should modify an element and remove its label', () => {
    givenReferential(1);
    whenVisitingReferential();
    whenEditingFirstElement();
    whenReplacing('element-reference', '1099');
    whenReplacing('element-libelle', '');
    whenSavingModification();

    thenElementIsListed('1099', 'MOULE', '—');
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
const whenVisitingReferential = (): void => {
  cy.viewport(1280, 900);
  cy.visit('/moules-et-of');
};
const whenOpeningFromTheMenu = (): void => {
  cy.visit('/');
  cy.get(dataSelector('gestion-menu')).click();
  cy.get(dataSelector('gestion-navigation-elements')).click();
};
const whenOpeningCreation = (selector: string): void => {
  cy.get(dataSelector(selector)).should('be.enabled').click();
};
const whenReplacing = (selector: string, value: string): void => {
  cy.get(dataSelector(selector)).clear();
  if (value !== '') cy.get(dataSelector(selector)).type(value);
};
const whenCreating = (selector: string, reference: string, libelle: string): void => {
  whenOpeningCreation(selector);
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
  cy.get(dataSelector('elements-pagination')).find('button[aria-label="Page suivante"]').click();
};
const thenReferentialIsVisible = (): void => {
  cy.location('pathname').should('eq', '/moules-et-of');
  cy.get(dataSelector('elements-page')).should('be.visible');
  cy.get(dataSelector('elements-empty')).should('contain.text', 'Aucun moule ni OF');
};
const thenElementIsListed = (reference: string, categorie: string, libelle: string): void => {
  cy.get(dataSelector('element-form')).should('not.exist');
  cy.get(dataSelector('element-row')).contains(reference).closest('tr').should('contain.text', categorie).and('contain.text', libelle);
};
const thenElementWithoutFicheIsListed = (api: ElementsApiFixture): void => {
  thenElementIsListed('—', 'MOULE', '—');
  cy.wrap(api.writes).should('deep.equal', [{ type: 'PRODUIT' }]);
};
const thenLastPageShowsTheRemainingElement = (): void => {
  cy.get(dataSelector('element-row')).should('have.length', 1);
  cy.get(dataSelector('elements-pagination')).should('contain.text', '21–21 sur 21');
  cy.get('@elementsRead').its('request.query').should('deep.include', { debut: '1970-01-01T00:00:00Z', fin: '2999-12-31T23:59:59Z' });
};

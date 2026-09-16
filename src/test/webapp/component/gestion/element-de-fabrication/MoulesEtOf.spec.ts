import { dataSelector } from '../../../utils/DataSelector';
import { ElementsApiFixture, elementsFixture } from '../../../utils/gestion/element-de-fabrication/ElementsApiFixture';
import { interceptForever } from '../../../utils/Interceptor';

describe('Manufacturing element interactions and rendering', () => {
  it('should open an empty creation form without premature validation errors', () => {
    const api = givenReferential();
    whenVisitingReferential();
    whenOpeningCreation('elements-new-moule');

    thenCreationStartsEmpty(api);
  });

  it('should dismiss creation with Escape without writing', () => {
    const api = givenReferential();
    whenVisitingReferential();
    whenOpeningCreation('elements-new-of');
    whenPressingEscape('element-reference');

    thenCreationIsDismissed(api);
  });

  it('should keep the form open and saving disabled until the write completes', () => {
    givenReferential();
    const response = givenPendingCreation();
    whenVisitingReferential();
    whenOpeningCreation('elements-new-moule');
    whenReplacing('element-reference', '1015');
    whenTryingToDismissPendingSave();
    whenCompletingCreation(response);

    thenPendingSaveWasProtected();
  });

  it('should display a duplicate reference refusal and keep the form open', () => {
    givenReferential(1);
    whenVisitingReferential();
    whenCreating('1015', 'Moule de capot');

    thenDuplicateRefusalIsVisible();
  });

  it('should refuse an oversized company number before writing', () => {
    const api = givenReferential();
    whenVisitingReferential();
    whenOpeningCreation('elements-new-moule');
    whenReplacing('element-reference', 'a'.repeat(101));
    whenSubmittingInvalidEntries();

    thenValidationIsVisible(api);
  });

  it('should display a recoverable loading failure instead of an empty referential', () => {
    givenFailedRead();
    whenVisitingReferential();

    thenReadFailureIsVisible();
  });

  it('should retain entered values after a technical write failure', () => {
    givenFailedWrite();
    whenVisitingReferential();
    whenCreating('1015', 'Moule de capot');

    thenWriteFailureIsVisible();
  });

  it('should render the desktop referential with accessible row actions', () => {
    givenReferential(6);
    whenVisitingReferential();

    thenDesktopLayoutIsVisible();
  });

  it('should keep creation usable on a narrow screen', () => {
    givenReferential(2);
    whenVisitingMobileReferential();
    whenOpeningCreation('elements-new-moule');

    thenMobileFormIsUsable();
  });
});

const givenReferential = (nombre = 0): ElementsApiFixture => {
  const api = new ElementsApiFixture(elementsFixture(nombre));
  api.install();
  return api;
};
const givenFailedRead = (): void => {
  givenReferential().failRead = true;
};
const givenFailedWrite = (): void => {
  givenReferential().failWrite = true;
};
const givenPendingCreation = (): ReturnType<typeof interceptForever> =>
  interceptForever(
    { method: 'POST', pathname: '/api/elements-de-fabrication' },
    { statusCode: 201, body: { id: 'created-element', type: 'PRODUIT', nom: 'PRD-2026-000009', reference: '1015' } },
    'pendingCreation',
  );
const whenVisitingReferential = (): void => {
  cy.viewport(1280, 900);
  cy.visit('/moules-et-of');
};
const whenVisitingMobileReferential = (): void => {
  cy.viewport(390, 844);
  cy.visit('/moules-et-of');
  cy.get(dataSelector('element-row')).should('have.length', 2);
  cy.screenshot('elements-mobile', { capture: 'viewport' });
};
const whenOpeningCreation = (selector: string): void => {
  cy.get(dataSelector(selector)).should('be.enabled').click();
};
const whenReplacing = (selector: string, value: string): void => {
  cy.get(dataSelector(selector)).clear();
  if (value !== '') cy.get(dataSelector(selector)).type(value);
};
const whenCreating = (reference: string, libelle: string): void => {
  whenOpeningCreation('elements-new-moule');
  whenReplacing('element-reference', reference);
  whenReplacing('element-libelle', libelle);
  whenSaving();
};
const whenSaving = (): void => {
  cy.get(dataSelector('element-save')).click();
  cy.wait('@elementCreate');
};
const whenSubmittingInvalidEntries = (): void => {
  cy.get(dataSelector('element-save')).click();
};
const whenPressingEscape = (selector: string): void => {
  cy.get(dataSelector(selector)).type('{esc}');
};
const whenTryingToDismissPendingSave = (): void => {
  cy.get(dataSelector('element-save')).click();
  cy.get(dataSelector('element-save')).should('be.disabled');
  cy.get('body').type('{esc}');
  cy.get(dataSelector('element-form-title')).invoke('text').as('pendingTitle', { type: 'static' });
  cy.get(dataSelector('element-save')).invoke('prop', 'disabled').as('pendingDisabled', { type: 'static' });
};
const whenCompletingCreation = (response: ReturnType<typeof interceptForever>): void => {
  cy.then(() => response.send());
  cy.wait('@pendingCreation');
};
const thenPendingSaveWasProtected = (): void => {
  cy.get('@pendingTitle').should('contain', 'Nouveau moule');
  cy.get('@pendingDisabled').should('equal', true);
  cy.get(dataSelector('element-form')).should('not.exist');
};
const thenCreationStartsEmpty = (api: ElementsApiFixture): void => {
  cy.get(dataSelector('element-form-title')).should('have.text', 'Nouveau moule');
  cy.get(dataSelector('element-reference')).should('have.value', '');
  cy.get(dataSelector('element-libelle')).should('have.value', '');
  cy.get(dataSelector('element-reference-error')).invoke('text').should('match', /^\s*$/);
  cy.wrap(api.writes).should('be.empty');
};
const thenCreationIsDismissed = (api: ElementsApiFixture): void => {
  cy.get(dataSelector('element-form')).should('not.exist');
  cy.wrap(api.writes).should('be.empty');
};
const thenDuplicateRefusalIsVisible = (): void => {
  cy.get(dataSelector('element-reference-error')).should('contain.text', 'Un autre moule ou OF porte déjà cette référence.');
  cy.get(dataSelector('element-form')).should('be.visible');
  cy.screenshot('elements-duplicate', { capture: 'viewport' });
};
const thenValidationIsVisible = (api: ElementsApiFixture): void => {
  cy.get(dataSelector('element-reference-error')).should('contain.text', '100 caractères');
  cy.get(dataSelector('element-form')).should('be.visible');
  cy.wrap(api.writes).should('be.empty');
};
const thenReadFailureIsVisible = (): void => {
  cy.get(dataSelector('elements-error')).should('be.visible');
  cy.get(dataSelector('elements-empty')).should('not.exist');
  cy.get(dataSelector('elements-retry')).should('be.enabled');
};
const thenWriteFailureIsVisible = (): void => {
  cy.get(dataSelector('element-technical-error')).should('be.visible');
  cy.get(dataSelector('element-reference')).should('have.value', '1015');
  cy.get(dataSelector('element-save')).should('be.enabled');
};
const thenDesktopLayoutIsVisible = (): void => {
  cy.get(dataSelector('element-row')).should('have.length', 6);
  cy.get(dataSelector('element-type-cell')).first().should('have.text', 'Moule');
  cy.get(dataSelector('element-edit')).first().should('have.attr', 'aria-label', 'Modifier le moule 1015');
  cy.screenshot('elements-desktop', { capture: 'fullPage' });
};
const thenMobileFormIsUsable = (): void => {
  cy.get(dataSelector('element-reference')).should('be.visible');
  cy.get(dataSelector('element-save')).should('be.visible');
  cy.get(dataSelector('element-cancel')).should('be.visible');
  cy.screenshot('elements-form-mobile', { capture: 'viewport' });
};

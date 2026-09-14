import { dataSelector } from '../../../utils/DataSelector';
import { PostesApiFixture, postesFixture } from '../../../utils/gestion/poste/PostesApiFixture';
import { interceptForever } from '../../../utils/Interceptor';

describe('Workstation interactions and rendering', () => {
  it('should open an empty creation form without premature validation errors', () => {
    const api = givenReferential();
    whenVisitingSettings();
    whenOpeningCreation();

    thenCreationStartsEmpty(api);
  });

  it('should dismiss creation with Escape without writing', () => {
    const api = givenReferential();
    whenVisitingSettings();
    whenOpeningCreation();
    whenPressingEscape('poste-libelle');

    thenCreationIsDismissed(api);
  });

  it('should dismiss deletion with Escape without removing the workstation', () => {
    const api = givenReferential(1);
    whenVisitingSettings();
    whenRequestingDeletion();
    whenPressingEscape('poste-delete-cancel');

    thenDeletionIsDismissed(api);
  });

  it('should keep the form open and saving disabled until the write completes', () => {
    givenReferential();
    const response = givenPendingCreation();
    whenVisitingSettings();
    whenOpeningCreation();
    whenReplacing('poste-libelle', 'Tour 1');
    whenReplacing('poste-nature', 'tournage');
    whenSubmittingInvalidEntries();
    whenTryingToDismissPendingSave();
    whenCompletingCreation(response);

    thenPendingSaveWasProtected();
  });

  it('should display a duplicate label refusal and keep the form open', () => {
    givenReferential(1);
    whenVisitingSettings();
    whenCreating('Poste 01', 'tournage', '45.5');

    thenDuplicateRefusalIsVisible();
  });

  it('should cancel deletion without removing a workstation', () => {
    givenReferential(1);
    whenVisitingSettings();
    whenRequestingDeletion();
    whenCancellingDeletion();

    thenPosteIsListed('Poste 01', 'ponçage', '45,50');
  });

  it('should explain why a workstation with habilitated operators cannot be removed', () => {
    givenProtectedPoste('poste-de-travail-utilise');
    whenVisitingSettings();
    whenRequestingDeletion();
    whenConfirmingDeletion();

    thenDeletionIsRefused();
  });

  it('should validate required and positive fields before writing', () => {
    const api = givenReferential();
    whenVisitingSettings();
    whenOpeningCreation();
    whenReplacing('poste-cout', '-1');
    whenSubmittingInvalidEntries();

    thenValidationIsVisible(api);
  });

  it('should display a recoverable loading failure instead of an empty referential', () => {
    givenFailedRead();
    whenVisitingSettings();

    thenReadFailureIsVisible();
  });

  it('should retain entered values after a technical write failure', () => {
    givenFailedWrite();
    whenVisitingSettings();
    whenCreating('Tour 1', 'tournage', '45.5');

    thenWriteFailureIsVisible();
  });

  it('should render the desktop referential with accessible row actions', () => {
    givenReferential(6);
    whenVisitingSettings();

    thenDesktopLayoutIsVisible();
  });

  it('should render Material text with the GLM font on the page and in the form', () => {
    givenReferential(1);
    whenVisitingSettings();
    const pageFonts = whenReadingPageFonts();
    whenOpeningCreation();

    thenMaterialUsesThePageFont(pageFonts);
  });

  it('should keep creation usable on a narrow screen', () => {
    givenReferential(2);
    whenVisitingMobileSettings();
    whenOpeningCreation();

    thenMobileFormIsUsable();
  });
});

const givenPendingCreation = (): ReturnType<typeof interceptForever> =>
  interceptForever(
    { method: 'POST', pathname: '/api/postes-de-travail' },
    {
      statusCode: 201,
      body: { id: 'tour-1', libelle: 'Tour 1', nature: 'tournage' },
    },
    'pendingCreation',
  );

const whenPressingEscape = (selector: string): void => {
  cy.get(dataSelector(selector)).type('{esc}');
};

const whenTryingToDismissPendingSave = (): void => {
  cy.get(dataSelector('poste-save')).should('be.disabled');
  cy.get('body').type('{esc}');
  cy.get(dataSelector('poste-form-title')).invoke('text').as('pendingTitle', { type: 'static' });
  cy.get(dataSelector('poste-save')).invoke('prop', 'disabled').as('pendingDisabled', { type: 'static' });
};

const whenCompletingCreation = (response: ReturnType<typeof interceptForever>): void => {
  cy.then(() => response.send());
  cy.wait('@pendingCreation');
};

const thenPendingSaveWasProtected = (): void => {
  cy.get('@pendingTitle').should('contain', 'Nouveau poste');
  cy.get('@pendingDisabled').should('equal', true);
  cy.get(dataSelector('poste-form')).should('not.exist');
};

const thenCreationStartsEmpty = (api: PostesApiFixture): void => {
  cy.get(dataSelector('poste-libelle')).should('have.value', '');
  cy.get(dataSelector('poste-nature')).should('have.value', '');
  cy.get(dataSelector('poste-cout')).should('have.value', '');
  cy.get(dataSelector('poste-libelle-error')).invoke('text').should('match', /^\s*$/);
  cy.wrap(api.writes).should('be.empty');
};

const thenCreationIsDismissed = (api: PostesApiFixture): void => {
  cy.get(dataSelector('poste-form')).should('not.exist');
  cy.wrap(api.writes).should('be.empty');
};

const thenDeletionIsDismissed = (api: PostesApiFixture): void => {
  cy.get(dataSelector('poste-delete-confirm')).should('not.exist');
  cy.get(dataSelector('poste-row')).should('have.length', 1);
  cy.wrap(api.deletions).should('be.empty');
};

const givenReferential = (nombre = 0): PostesApiFixture => {
  const api = new PostesApiFixture(postesFixture(nombre));
  api.install();
  return api;
};
const givenProtectedPoste = (code: string): void => {
  const api = givenReferential(1);
  api.protectedCode = code;
};
const givenFailedRead = (): void => {
  givenReferential().failRead = true;
};
const givenFailedWrite = (): void => {
  givenReferential().failWrite = true;
};
const whenVisitingSettings = (): void => {
  cy.viewport(1280, 900);
  cy.visit('/postes-de-travail');
};
const whenVisitingMobileSettings = (): void => {
  cy.viewport(390, 844);
  cy.visit('/postes-de-travail');
  cy.get(dataSelector('poste-row')).should('have.length', 2);
  cy.screenshot('postes-mobile', { capture: 'viewport' });
};
const whenOpeningCreation = (): void => {
  cy.get(dataSelector('postes-new')).should('be.enabled').click();
};
const whenReplacing = (selector: string, value: string): void => {
  cy.get(dataSelector(selector)).clear();
  if (value !== '') cy.get(dataSelector(selector)).type(value);
};
const whenCreating = (libelle: string, nature: string, cout: string): void => {
  whenOpeningCreation();
  whenReplacing('poste-libelle', libelle);
  whenReplacing('poste-nature', nature);
  whenReplacing('poste-cout', cout);
  whenSaving('posteCreate');
};
const whenSaving = (alias: string): void => {
  cy.get(dataSelector('poste-save')).click();
  cy.wait(`@${alias}`);
};
const thenDuplicateRefusalIsVisible = (): void => {
  cy.get(dataSelector('poste-libelle-error')).should('contain.text', 'Un autre poste porte déjà ce libellé.');
  cy.get(dataSelector('poste-form')).should('be.visible');
  cy.screenshot('postes-duplicate', { capture: 'viewport' });
};
const whenRequestingDeletion = (): void => {
  cy.get(dataSelector('poste-delete')).first().click();
};
const whenCancellingDeletion = (): void => {
  cy.get(dataSelector('poste-delete-cancel')).click();
};
const whenConfirmingDeletion = (): void => {
  cy.get(dataSelector('poste-delete-confirm')).click();
  cy.wait('@posteDelete');
};
const whenSubmittingInvalidEntries = (): void => {
  cy.get(dataSelector('poste-save')).click();
};
const thenPosteIsListed = (libelle: string, nature: string, cout: string): void => {
  cy.get(dataSelector('poste-form')).should('not.exist');
  cy.get(dataSelector('poste-row')).contains(libelle).closest('tr').should('contain.text', nature).and('contain.text', cout);
};
const thenDeletionIsRefused = (): void => {
  cy.get(dataSelector('poste-delete-refusal')).should(
    'have.text',
    'Ce poste ne peut pas être supprimé : des opérateurs y sont encore habilités ou des pointages y sont associés.',
  );
  cy.get(dataSelector('poste-row')).should('have.length', 1);
  cy.screenshot('postes-deletion-refused', { capture: 'viewport' });
};
const thenValidationIsVisible = (api: PostesApiFixture): void => {
  cy.get(dataSelector('poste-libelle-error')).should('contain.text', 'obligatoire');
  cy.get(dataSelector('poste-nature-error')).should('contain.text', 'obligatoire');
  cy.get(dataSelector('poste-cout-error')).should('contain.text', 'strictement positif');
  cy.wrap(api.writes).should('be.empty');
};
const thenReadFailureIsVisible = (): void => {
  cy.get(dataSelector('postes-error')).should('be.visible');
  cy.get(dataSelector('postes-empty')).should('not.exist');
  cy.get(dataSelector('postes-retry')).should('be.enabled');
};
const thenWriteFailureIsVisible = (): void => {
  cy.get(dataSelector('poste-technical-error')).should('be.visible');
  cy.get(dataSelector('poste-libelle')).should('have.value', 'Tour 1');
  cy.get(dataSelector('poste-save')).should('be.enabled');
};
const thenDesktopLayoutIsVisible = (): void => {
  cy.get(dataSelector('poste-row')).should('have.length', 6);
  cy.get(dataSelector('poste-edit')).first().should('have.attr', 'aria-label', 'Modifier Poste 01');
  cy.screenshot('postes-desktop', { capture: 'fullPage' });
};
const thenMobileFormIsUsable = (): void => {
  cy.get(dataSelector('poste-libelle')).should('be.visible');
  cy.get(dataSelector('poste-save')).should('be.visible');
  cy.get(dataSelector('poste-cancel')).should('be.visible');
  cy.screenshot('postes-form-mobile', { capture: 'viewport' });
};

const whenReadingPageFonts = (): Cypress.Chainable<{ font: string; rowFont: string; buttonFont: string }> => {
  cy.get(dataSelector('poste-nature-cell')).should('be.visible');
  return cy.window().then(window => ({
    font: window.getComputedStyle(window.document.body).fontFamily,
    rowFont: window.getComputedStyle(window.document.querySelector(dataSelector('poste-nature-cell')) as HTMLElement).fontFamily,
    buttonFont: window.getComputedStyle(window.document.querySelector(dataSelector('postes-new')) as HTMLElement).fontFamily,
  }));
};

const thenMaterialUsesThePageFont = (fonts: Cypress.Chainable<{ font: string; rowFont: string; buttonFont: string }>): void => {
  fonts.then(({ font, rowFont, buttonFont }) => {
    expect(rowFont).to.equal(font);
    expect(buttonFont).to.equal(font);
    cy.get(dataSelector('poste-libelle')).should('have.css', 'font-family', font);
    cy.get(dataSelector('poste-save')).should('have.css', 'font-family', font);
  });
};

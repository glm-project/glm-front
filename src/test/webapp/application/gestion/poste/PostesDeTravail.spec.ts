import { dataSelector } from '../../../utils/DataSelector';
import { PostesApiFixture, postesFixture } from './PostesApiFixture';

describe('Workstation settings in gestion', () => {
  it('should create the first workstation and display its saved values', () => {
    givenReferential();
    whenVisitingSettings();
    whenCreating('Tour 1', 'tournage', '45,5');

    thenPosteIsListed('Tour 1', 'tournage', '45,50');
  });

  it('should keep a duplicate label error in the form and allow correction', () => {
    givenReferential(1);
    whenVisitingSettings();
    whenCreating('Poste 01', 'tournage', '45.5');
    whenDuplicateRefusalArrives();
    whenCorrectingLabel('Tour 2');

    thenPosteIsListed('Tour 2', 'tournage', '45,50');
  });

  it('should modify a workstation and remove its optional hourly cost', () => {
    givenReferential(1);
    whenVisitingSettings();
    whenEditingFirstPoste();
    whenReplacing('poste-libelle', 'Tour révisé');
    whenReplacing('poste-cout', '');
    whenSaving('posteUpdate');

    thenPosteIsListed('Tour révisé', 'ponçage', 'Non renseigné');
  });

  it('should cancel deletion without removing a workstation', () => {
    givenReferential(1);
    whenVisitingSettings();
    whenRequestingDeletion();
    whenCancellingDeletion();

    thenPosteIsListed('Poste 01', 'ponçage', '45,50');
  });

  it('should remove the confirmed workstation and show the empty state', () => {
    givenReferential(1);
    whenVisitingSettings();
    whenRequestingDeletion();
    whenConfirmingDeletion();

    thenWorkstationSettingsAreVisible();
  });

  it('should explain why a workstation with clockings cannot be removed', () => {
    givenProtectedPoste('poste-de-travail-pointe');
    whenVisitingSettings();
    whenRequestingDeletion();
    whenConfirmingDeletion();

    thenDeletionIsRefused();
  });

  it('should explain why a workstation with habilitated operators cannot be removed', () => {
    givenProtectedPoste('poste-de-travail-utilise');
    whenVisitingSettings();
    whenRequestingDeletion();
    whenConfirmingDeletion();

    thenDeletionIsRefused();
  });

  it('should paginate the referential and return to the previous page after its last row is deleted', () => {
    givenReferential(21);
    whenVisitingSettings();
    whenGoingToNextPage();
    whenRequestingDeletion();
    whenConfirmingDeletion();

    thenFirstPageOfTwentyIsVisible();
  });

  it('should suggest natures that exist outside the displayed page', () => {
    givenReferential(21);
    whenVisitingSettings();
    whenOpeningCreation();
    whenReplacing('poste-nature', 'pon');
    whenChoosingNature();

    thenNatureIsSelected();
  });

  it('should validate required and positive fields before writing', () => {
    givenReferential();
    whenVisitingSettings();
    whenOpeningCreation();
    whenReplacing('poste-cout', '-1');
    whenSubmittingInvalidEntries();

    thenValidationIsVisible();
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
  it('should reach workstation settings from the gestion menu', () => {
    givenAnEmptyWorkshop();
    whenOpeningFromTheMenu();

    thenWorkstationSettingsAreVisible();
  });

  const givenAnEmptyWorkshop = (): void => {
    cy.intercept('GET', '/api/postes-de-travail*', { content: [], currentPage: 0, pageSize: 20, totalElementsCount: 0 });
  };
  const whenOpeningFromTheMenu = (): void => {
    cy.visit('/');
    cy.get(dataSelector('gestion-menu')).click();
    cy.get(dataSelector('gestion-navigation-postes')).click();
  };
  const thenWorkstationSettingsAreVisible = (): void => {
    cy.location('pathname').should('eq', '/postes-de-travail');
    cy.get(dataSelector('postes-page')).should('be.visible');
    cy.get(dataSelector('postes-empty')).should('contain.text', 'Aucun poste de travail');
  };
});

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
const whenDuplicateRefusalArrives = (): void => {
  cy.get(dataSelector('poste-libelle-error')).should('contain.text', 'Un autre poste porte déjà ce libellé.');
  cy.screenshot('postes-duplicate', { capture: 'viewport' });
};
const whenCorrectingLabel = (libelle: string): void => {
  whenReplacing('poste-libelle', libelle);
  whenSaving('posteCreate');
};
const whenEditingFirstPoste = (): void => {
  cy.get(dataSelector('poste-edit')).first().click();
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
const whenGoingToNextPage = (): void => {
  cy.get(dataSelector('postes-pagination')).find('button[aria-label="Page suivante"]').click();
  cy.get(dataSelector('poste-row')).should('have.length', 1).and('contain.text', 'Poste 21');
};
const whenChoosingNature = (): void => {
  cy.get(dataSelector('poste-nature-option')).contains('ponçage').click();
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
const thenFirstPageOfTwentyIsVisible = (): void => {
  cy.get(dataSelector('poste-delete-confirm')).should('not.exist');
  cy.get(dataSelector('poste-row')).should('have.length', 20);
  cy.get(dataSelector('postes-pagination')).should('contain.text', '1–20 sur 20');
};
const thenNatureIsSelected = (): void => {
  cy.get(dataSelector('poste-nature')).should('have.value', 'ponçage');
};
const thenValidationIsVisible = (): void => {
  cy.get(dataSelector('poste-libelle-error')).should('contain.text', 'obligatoire');
  cy.get(dataSelector('poste-nature-error')).should('contain.text', 'obligatoire');
  cy.get(dataSelector('poste-cout-error')).should('contain.text', 'strictement positif');
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

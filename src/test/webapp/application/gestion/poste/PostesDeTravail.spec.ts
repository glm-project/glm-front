import { dataSelector } from '../../../utils/DataSelector';
import { PostesApiFixture, postesFixture } from '../../../utils/gestion/poste/PostesApiFixture';
import { SupervisionApiFixture } from '../../../utils/gestion/supervision-atelier/SupervisionApiFixture';

describe('Workstation settings in gestion', () => {
  beforeEach(() => new SupervisionApiFixture().intercept());
  it('should create the first workstation and display its saved values', () => {
    givenReferential();
    whenVisitingSettings();
    whenCreating('Tour 1', 'tournage', '45,5');

    thenPosteIsListed('Tour 1', 'tournage', '45,50');
  });

  it('should save and list the workstation after correcting a duplicate label', () => {
    givenReferential(1);
    whenVisitingSettings();
    whenCreating('Poste 01', 'tournage', '45.5');
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
  it('should show the workstations of the chosen nature and keep it in the address', () => {
    givenReferential(3);
    whenVisitingSettings();
    whenFilteringByNature('ponçage');

    thenOnlyWorkstationsAreListed(['Poste 03']);
    thenAddressNamesNature('nature-poncage');
  });

  it('should save a new nature and list it with no workstation yet', () => {
    givenReferential(1);
    whenVisitingSettings();
    whenSavingNature('Rectification');

    thenNatureIsListed('Rectification', '0');
    thenNatureSavingIsAnnounced('Rectification');
  });

  it('should rename the chosen nature everywhere on the page', () => {
    givenReferential(3);
    whenVisitingSettings();
    whenFilteringByNature('ponçage');
    whenRenamingChosenNature('polissage');

    thenNatureIsListed('polissage', '1');
    thenChosenNatureIs('polissage');
  });

  it('should reach workstation settings from the gestion menu', () => {
    givenAnEmptyWorkshop();
    whenOpeningFromTheMenu();

    thenWorkstationSettingsAreVisible();
  });

  const givenAnEmptyWorkshop = (): void => {
    givenReferential();
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
const whenVisitingSettings = (): void => {
  cy.viewport(1280, 900);
  cy.visit('/postes-de-travail');
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
const whenConfirmingDeletion = (): void => {
  cy.get(dataSelector('poste-delete-confirm')).click();
  cy.wait('@posteDelete');
};
const whenGoingToNextPage = (): void => {
  cy.wait('@postesRead');
  cy.get(dataSelector('postes-pagination')).find('button[aria-label="Page suivante"]').click();
  cy.get(dataSelector('poste-row')).should('have.length', 1).and('contain.text', 'Poste 21');
};
const whenChoosingNature = (): void => {
  cy.get(dataSelector('poste-nature-option')).contains('ponçage').click();
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
const whenFilteringByNature = (libelle: string): void => {
  cy.get(dataSelector('nature-filter')).contains(libelle).click();
};
const thenOnlyWorkstationsAreListed = (libelles: string[]): void => {
  cy.get(dataSelector('poste-row')).should('have.length', libelles.length);
  for (const libelle of libelles) {
    cy.get(dataSelector('poste-row')).should('contain.text', libelle);
  }
};
const thenAddressNamesNature = (id: string): void => {
  cy.location('search').should('eq', '?nature=' + id);
};
const whenSavingNature = (libelle: string): void => {
  cy.get(dataSelector('nature-new')).click();
  cy.get('#nature-libelle').type(libelle);
  cy.get(dataSelector('nature-save')).click();
  cy.wait('@natureCreate');
};
const whenRenamingChosenNature = (libelle: string): void => {
  cy.get(dataSelector('nature-rename')).click();
  cy.get('#nature-nouveau-libelle').clear();
  cy.get('#nature-nouveau-libelle').type(libelle);
  cy.get(dataSelector('nature-rename-save')).click();
  cy.wait('@natureRename');
};
const thenNatureIsListed = (libelle: string, postes: string): void => {
  cy.get(dataSelector('nature-filter')).contains(libelle).parents(dataSelector('nature-filter')).should('contain.text', postes);
};
const thenNatureSavingIsAnnounced = (libelle: string): void => {
  cy.get(dataSelector('nature-success')).should('contain.text', libelle);
};
const thenChosenNatureIs = (libelle: string): void => {
  cy.get(dataSelector('postes-selection-title')).invoke('text').invoke('trim').should('eq', libelle);
};

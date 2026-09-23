import { dataSelector } from '../../../utils/DataSelector';
import { OperateursApiFixture, operateursFixture, postesFixture } from '../../../utils/gestion/operateur/OperateursApiFixture';

describe('Operator referential in gestion', () => {
  it('should declare the first operator and show the trades derived from its habilitations', () => {
    givenReferential();
    whenVisitingOperateurs();
    whenDeclaring('Dupont', 'Jean', '049', '22,5');

    thenOperateurIsListed('Dupont', 'Poste 01', 'tournage');
  });

  it('should save and list the operator after correcting a duplicate payroll number', () => {
    givenOperateurUsingPayrollNumber('049');
    whenVisitingOperateurs();
    whenDeclaring('Dupont', 'Jean', '049', '22,5');
    whenCorrectingPayrollNumber('050');

    thenOperateurIsListed('Dupont', 'Poste 01', 'tournage');
  });

  it('should replace the habilitations of a revised operator', () => {
    givenReferential(1);
    whenVisitingOperateurs();
    whenEditingFirstOperateur();
    whenWithdrawingPoste();
    whenChoosingPoste('Poste 03');
    whenSavingRevision();

    thenOperateurIsListed('Nom 01', 'Poste 03', 'ponçage');
  });

  it('should drop the optional payroll number and hourly rate left blank on revision', () => {
    givenReferential(1);
    whenVisitingOperateurs();
    whenEditingFirstOperateur();
    whenReplacing('operateur-matricule', '');
    whenReplacing('operateur-taux', '');
    whenSavingRevision();

    thenOptionalEntriesAreAbsent();
  });

  it('should remove the confirmed operator and show the empty state', () => {
    givenReferential(1);
    whenVisitingOperateurs();
    whenRequestingDeletion();
    whenConfirmingDeletion();

    thenOperateurReferentialIsEmpty();
  });

  it('should explain why an operator who clocked time cannot be removed', () => {
    givenProtectedOperateur('operateur-ayant-pointe');
    whenVisitingOperateurs();
    whenRequestingDeletion();
    whenConfirmingDeletion();

    thenDeletionIsRefused();
  });

  it('should paginate the referential and return to the previous page after its last row is deleted', () => {
    givenReferential(21);
    whenVisitingOperateurs();
    whenGoingToNextPage();
    whenRequestingDeletion();
    whenConfirmingDeletion();

    thenFirstPageOfTwentyIsVisible();
  });

  it('should invite the manager to configure workstations before declaring anyone', () => {
    givenWorkshopWithoutWorkstation();
    whenVisitingOperateurs();

    thenWorkstationConfigurationIsSuggested();
  });

  it('should reach the operator referential from the gestion menu', () => {
    givenReferential();
    whenOpeningFromTheNavigation();

    thenOperateurReferentialIsEmpty();
  });
});

const givenReferential = (nombre = 0): OperateursApiFixture => {
  const api = new OperateursApiFixture(operateursFixture(nombre), postesFixture(3));
  api.install();
  return api;
};
const givenOperateurUsingPayrollNumber = (matricule: string): void => {
  const api = givenReferential();
  api.operateurs.push({ id: 'autre', nom: 'Martin', prenom: 'Léa', matricule, postes: [], natures: [] });
};
const givenProtectedOperateur = (code: string): void => {
  givenReferential(1).deletionRefusalCode = code;
};
const givenWorkshopWithoutWorkstation = (): void => {
  new OperateursApiFixture([], []).install();
};

const whenVisitingOperateurs = (): void => {
  cy.viewport(1280, 900);
  cy.visit('/operateurs');
};
const whenOpeningFromTheNavigation = (): void => {
  cy.viewport(1280, 900);
  cy.visit('/');
  cy.get(dataSelector('gestion-navigation-operateurs')).click();
};
const whenReplacing = (selector: string, value: string): void => {
  cy.get(dataSelector(selector)).clear();
  if (value !== '') cy.get(dataSelector(selector)).type(value);
};
const whenChoosingPoste = (libelle: string): void => {
  cy.get(dataSelector('operateur-poste-recherche')).type(libelle);
  cy.get(dataSelector('operateur-poste-option')).first().click();
};
const whenWithdrawingPoste = (): void => {
  cy.get(dataSelector('operateur-poste-remove')).first().click();
};
const whenDeclaring = (nom: string, prenom: string, matricule: string, taux: string): void => {
  cy.get(dataSelector('operateurs-new')).should('be.enabled').click();
  whenReplacing('operateur-nom', nom);
  whenReplacing('operateur-prenom', prenom);
  whenReplacing('operateur-matricule', matricule);
  whenReplacing('operateur-taux', taux);
  whenChoosingPoste('Poste 01');
  cy.get(dataSelector('operateur-save')).click();
  cy.wait('@operateurCreate');
};
const whenCorrectingPayrollNumber = (matricule: string): void => {
  whenReplacing('operateur-matricule', matricule);
  cy.get(dataSelector('operateur-save')).click();
  cy.wait('@operateurCreate');
};
const whenEditingFirstOperateur = (): void => {
  cy.get(dataSelector('operateur-edit')).first().click();
};
const whenSavingRevision = (): void => {
  cy.get(dataSelector('operateur-save')).click();
  cy.wait('@operateurUpdate').its('request.body').as('revision', { type: 'static' });
};
const whenRequestingDeletion = (): void => {
  cy.get(dataSelector('operateur-delete')).first().click();
};
const whenConfirmingDeletion = (): void => {
  cy.get(dataSelector('operateur-delete-confirm')).click();
  cy.wait('@operateurDelete');
};
const whenGoingToNextPage = (): void => {
  cy.get(dataSelector('operateurs-pagination')).find('.mat-mdc-paginator-navigation-next').click();
};

const thenOperateurIsListed = (nom: string, poste: string, nature: string): void => {
  cy.get(dataSelector('operateur-form')).should('not.exist');
  cy.get(dataSelector('operateur-row')).contains(nom).closest('tr').should('contain.text', poste).and('contain.text', nature);
};
const thenOptionalEntriesAreAbsent = (): void => {
  cy.get(dataSelector('operateur-form')).should('not.exist');
  cy.get('@revision').should('not.have.property', 'matricule');
  cy.get('@revision').should('not.have.property', 'tauxHoraire');
  cy.get(dataSelector('operateur-matricule-cell')).should('contain.text', 'Non renseigné');
  cy.get(dataSelector('operateur-taux-cell')).should('contain.text', 'Non renseigné');
};
const thenOperateurReferentialIsEmpty = (): void => {
  cy.location('pathname').should('eq', '/operateurs');
  cy.get(dataSelector('operateurs-page')).should('be.visible');
  cy.get(dataSelector('operateurs-empty')).should('contain.text', 'Aucun opérateur');
};
const thenWorkstationConfigurationIsSuggested = (): void => {
  cy.get(dataSelector('operateurs-empty-sans-poste')).should('contain.text', 'Configurez d’abord vos postes');
  cy.get(dataSelector('operateurs-empty-postes-link')).should('have.attr', 'href', '/postes-de-travail');
};
const thenDeletionIsRefused = (): void => {
  cy.get(dataSelector('operateur-delete-refusal')).should('contain.text', 'du temps est déjà pointé à son nom');
  cy.get(dataSelector('operateur-row')).should('have.length', 1);
};
const thenFirstPageOfTwentyIsVisible = (): void => {
  cy.get(dataSelector('operateur-delete-confirm')).should('not.exist');
  cy.get(dataSelector('operateur-row')).should('have.length', 20);
  cy.get(dataSelector('operateurs-pagination')).should('contain.text', '1–20 sur 20');
};

import { dataSelector } from '../../../utils/DataSelector';
import { OperateursApiFixture, operateursFixture, postesFixture } from '../../../utils/gestion/operateur/OperateursApiFixture';
import { interceptForever } from '../../../utils/Interceptor';

describe('Operator interactions and rendering', () => {
  it('should open an empty declaration form without premature validation errors', () => {
    const api = givenReferential();
    whenVisitingOperateurs();
    whenOpeningCreation();

    thenDeclarationStartsEmpty(api);
  });

  it('should dismiss a declaration with Escape without writing', () => {
    const api = givenReferential();
    whenVisitingOperateurs();
    whenOpeningCreation();
    whenPressingEscape('operateur-nom');

    thenDeclarationIsDismissed(api);
  });

  it('should dismiss deletion with Escape without removing the operator', () => {
    const api = givenReferential(1);
    whenVisitingOperateurs();
    whenRequestingDeletion();
    whenPressingEscape('operateur-delete-cancel');

    thenDeletionIsDismissed(api);
  });

  it('should keep the form open and saving disabled until the write completes', () => {
    givenReferential();
    const response = givenPendingCreation();
    whenVisitingOperateurs();
    whenOpeningCreation();
    whenReplacing('operateur-nom', 'Dupont');
    whenReplacing('operateur-prenom', 'Jean');
    whenSubmittingInvalidEntries();
    whenTryingToDismissPendingSave();
    whenCompletingCreation(response);

    thenPendingSaveWasProtected();
  });

  it('should display a duplicate identity refusal on the family name and keep the form open', () => {
    givenOperateurNamed('Dupont', 'Jean');
    whenVisitingOperateurs();
    whenDeclaring('Dupont', 'Jean', '049');

    thenDuplicateIdentityIsVisible();
  });

  it('should display a duplicate payroll number refusal on its own field', () => {
    givenOperateurUsingPayrollNumber('049');
    whenVisitingOperateurs();
    whenDeclaring('Dupont', 'Jean', '049');

    thenDuplicatePayrollNumberIsVisible();
  });

  it('should validate the required identity and a positive hourly rate before writing', () => {
    const api = givenReferential();
    whenVisitingOperateurs();
    whenOpeningCreation();
    whenReplacing('operateur-taux', '-1');
    whenSubmittingInvalidEntries();

    thenValidationIsVisible(api);
  });

  it('should grant and withdraw a habilitation through its chip', () => {
    givenReferential();
    whenVisitingOperateurs();
    whenOpeningCreation();
    whenChoosingPoste('Poste 01');
    whenWithdrawingPoste();

    thenNoHabilitationRemains();
  });

  it('should cancel deletion without removing an operator', () => {
    givenReferential(1);
    whenVisitingOperateurs();
    whenRequestingDeletion();
    whenCancellingDeletion();

    thenOperateurIsListed('Nom 01', 'Prenom 1');
  });

  it('should explain why an operator who clocked time cannot be removed', () => {
    givenProtectedOperateur('operateur-ayant-pointe');
    whenVisitingOperateurs();
    whenRequestingDeletion();
    whenConfirmingDeletion();

    thenDeletionIsRefused();
  });

  it('should display a recoverable loading failure instead of an empty referential', () => {
    givenFailedRead();
    whenVisitingOperateurs();

    thenReadFailureIsVisible();
  });

  it('should retain entered values after a technical write failure', () => {
    givenFailedWrite();
    whenVisitingOperateurs();
    whenDeclaring('Dupont', 'Jean', '049');

    thenWriteFailureIsVisible();
  });

  it('should render the desktop referential with accessible row actions', () => {
    givenReferential(6);
    whenVisitingOperateurs();

    thenDesktopLayoutIsVisible();
  });

  it('should keep the declaration usable on a narrow screen', () => {
    givenReferential(2);
    whenVisitingMobileOperateurs();
    whenOpeningCreation();

    thenMobileFormIsUsable();
  });
});

const givenReferential = (nombre = 0): OperateursApiFixture => {
  const api = new OperateursApiFixture(operateursFixture(nombre), postesFixture(3));
  api.install();
  return api;
};
const givenOperateurNamed = (nom: string, prenom: string): void => {
  const api = givenReferential();
  api.operateurs.push({ id: 'autre', nom, prenom, postes: [], natures: [] });
};
const givenOperateurUsingPayrollNumber = (matricule: string): void => {
  const api = givenReferential();
  api.operateurs.push({ id: 'autre', nom: 'Martin', prenom: 'Léa', matricule, postes: [], natures: [] });
};
const givenProtectedOperateur = (code: string): void => {
  givenReferential(1).deletionRefusalCode = code;
};
const givenFailedRead = (): void => {
  givenReferential().failRead = true;
};
const givenFailedWrite = (): void => {
  givenReferential().failWrite = true;
};
const givenPendingCreation = (): ReturnType<typeof interceptForever> =>
  interceptForever(
    { method: 'POST', pathname: '/api/operateurs' },
    { statusCode: 201, body: { id: 'jean', nom: 'Dupont', prenom: 'Jean', postes: [], natures: [] } },
    'pendingCreation',
  );

const whenVisitingOperateurs = (): void => {
  cy.viewport(1280, 900);
  cy.visit('/operateurs');
};
const whenVisitingMobileOperateurs = (): void => {
  cy.viewport(390, 844);
  cy.visit('/operateurs');
  cy.get(dataSelector('operateur-row')).should('have.length', 2);
  cy.screenshot('operateurs-mobile', { capture: 'viewport' });
};
const whenOpeningCreation = (): void => {
  cy.get(dataSelector('operateurs-new')).should('be.enabled').click();
};
const whenReplacing = (selector: string, value: string): void => {
  cy.get(dataSelector(selector)).clear();
  if (value !== '') cy.get(dataSelector(selector)).type(value);
};
const whenDeclaring = (nom: string, prenom: string, matricule: string): void => {
  whenOpeningCreation();
  whenReplacing('operateur-nom', nom);
  whenReplacing('operateur-prenom', prenom);
  whenReplacing('operateur-matricule', matricule);
  whenSaving();
};
const whenSaving = (): void => {
  cy.get(dataSelector('operateur-save')).click();
  cy.wait('@operateurCreate');
};
const whenChoosingPoste = (libelle: string): void => {
  cy.get(dataSelector('operateur-poste-recherche')).type(libelle);
  cy.get(dataSelector('operateur-poste-option')).first().click();
};
const whenWithdrawingPoste = (): void => {
  cy.get(dataSelector('operateur-poste-remove')).first().click();
};
const whenPressingEscape = (selector: string): void => {
  cy.get(dataSelector(selector)).type('{esc}');
};
const whenSubmittingInvalidEntries = (): void => {
  cy.get(dataSelector('operateur-save')).click();
};
const whenTryingToDismissPendingSave = (): void => {
  cy.get(dataSelector('operateur-save')).should('be.disabled');
  cy.get('body').type('{esc}');
  cy.get(dataSelector('operateur-form-title')).invoke('text').as('pendingTitle', { type: 'static' });
  cy.get(dataSelector('operateur-save')).invoke('prop', 'disabled').as('pendingDisabled', { type: 'static' });
};
const whenCompletingCreation = (response: ReturnType<typeof interceptForever>): void => {
  cy.then(() => response.send());
  cy.wait('@pendingCreation');
};
const whenRequestingDeletion = (): void => {
  cy.get(dataSelector('operateur-delete')).first().click();
};
const whenCancellingDeletion = (): void => {
  cy.get(dataSelector('operateur-delete-cancel')).click();
};
const whenConfirmingDeletion = (): void => {
  cy.get(dataSelector('operateur-delete-confirm')).click();
  cy.wait('@operateurDelete');
};

const thenDeclarationStartsEmpty = (api: OperateursApiFixture): void => {
  cy.get(dataSelector('operateur-nom')).should('have.value', '');
  cy.get(dataSelector('operateur-prenom')).should('have.value', '');
  cy.get(dataSelector('operateur-matricule')).should('have.value', '');
  cy.get(dataSelector('operateur-taux')).should('have.value', '');
  cy.get(dataSelector('operateur-nom-error')).invoke('text').should('match', /^\s*$/);
  cy.wrap(api.writes).should('be.empty');
};
const thenDeclarationIsDismissed = (api: OperateursApiFixture): void => {
  cy.get(dataSelector('operateur-form')).should('not.exist');
  cy.wrap(api.writes).should('be.empty');
};
const thenDeletionIsDismissed = (api: OperateursApiFixture): void => {
  cy.get(dataSelector('operateur-delete-confirm')).should('not.exist');
  cy.get(dataSelector('operateur-row')).should('have.length', 1);
  cy.wrap(api.deletions).should('be.empty');
};
const thenPendingSaveWasProtected = (): void => {
  cy.get('@pendingTitle').should('contain', 'Nouvel opérateur');
  cy.get('@pendingDisabled').should('equal', true);
  cy.get(dataSelector('operateur-form')).should('not.exist');
};
const thenDuplicateIdentityIsVisible = (): void => {
  cy.get(dataSelector('operateur-nom-error')).should('contain.text', 'Un autre opérateur porte déjà ce nom et ce prénom.');
  cy.get(dataSelector('operateur-form')).should('be.visible');
  cy.screenshot('operateurs-duplicate-identity', { capture: 'viewport' });
};
const thenDuplicatePayrollNumberIsVisible = (): void => {
  cy.get(dataSelector('operateur-matricule-error')).should('contain.text', 'Un autre opérateur porte déjà ce matricule.');
  cy.get(dataSelector('operateur-form')).should('be.visible');
};
const thenValidationIsVisible = (api: OperateursApiFixture): void => {
  cy.get(dataSelector('operateur-nom-error')).should('contain.text', 'obligatoire');
  cy.get(dataSelector('operateur-prenom-error')).should('contain.text', 'obligatoire');
  cy.get(dataSelector('operateur-taux-error')).should('contain.text', 'strictement positif');
  cy.wrap(api.writes).should('be.empty');
};
const thenNoHabilitationRemains = (): void => {
  cy.get(dataSelector('operateur-poste-chip')).should('not.exist');
  cy.get(dataSelector('operateur-form')).should('be.visible');
};
const thenOperateurIsListed = (nom: string, prenom: string): void => {
  cy.get(dataSelector('operateur-form')).should('not.exist');
  cy.get(dataSelector('operateur-row')).contains(nom).closest('tr').should('contain.text', prenom);
};
const thenDeletionIsRefused = (): void => {
  cy.get(dataSelector('operateur-delete-refusal')).should(
    'have.text',
    'Cet opérateur ne peut pas être supprimé : du temps est déjà pointé à son nom.',
  );
  cy.get(dataSelector('operateur-row')).should('have.length', 1);
  cy.screenshot('operateurs-deletion-refused', { capture: 'viewport' });
};
const thenReadFailureIsVisible = (): void => {
  cy.get(dataSelector('operateurs-error')).should('be.visible');
  cy.get(dataSelector('operateurs-empty')).should('not.exist');
  cy.get(dataSelector('operateurs-retry')).should('be.enabled');
};
const thenWriteFailureIsVisible = (): void => {
  cy.get(dataSelector('operateur-technical-error')).should('be.visible');
  cy.get(dataSelector('operateur-nom')).should('have.value', 'Dupont');
  cy.get(dataSelector('operateur-save')).should('be.enabled');
};
const thenDesktopLayoutIsVisible = (): void => {
  cy.get(dataSelector('operateur-row')).should('have.length', 6);
  cy.get(dataSelector('operateur-edit')).first().should('have.attr', 'aria-label', 'Modifier Prenom 1 Nom 01');
  cy.screenshot('operateurs-desktop', { capture: 'fullPage' });
};
const thenMobileFormIsUsable = (): void => {
  cy.get(dataSelector('operateur-nom')).should('be.visible');
  cy.get(dataSelector('operateur-save')).should('be.visible');
  cy.get(dataSelector('operateur-cancel')).should('be.visible');
  cy.screenshot('operateurs-form-mobile', { capture: 'viewport' });
};

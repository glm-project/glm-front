import { dataSelector } from '../../../utils/DataSelector';
import { AtelierApiFixture, engageablesFixture, suivisFixture } from '../../../utils/gestion/atelier/AtelierApiFixture';
import { ElementsApiFixture, elementsFixture } from '../../../utils/gestion/element-de-fabrication/ElementsApiFixture';
import { interceptForever } from '../../../utils/Interceptor';

describe('Workshop interactions and rendering', () => {
  it('should render the workshop with accessible row actions', () => {
    givenWorkshop(6, 0);
    whenVisitingWorkshop();

    thenDesktopLayoutIsVisible();
  });

  it('should invite putting a first element at the workshop', () => {
    givenWorkshop(0, 0);
    whenVisitingWorkshop();

    thenEmptyStateInvitesEngagement();
  });

  it('should display a recoverable loading failure instead of an empty workshop', () => {
    givenFailedRead();
    whenVisitingWorkshop();

    thenReadFailureIsVisible();
  });

  it('should dismiss the engagement dialog with Escape without engaging anything', () => {
    const api = givenWorkshop(0, 2);
    whenVisitingWorkshop();
    whenOpeningEngagement();
    whenPressingEscape();

    thenEngagementIsDismissed(api);
  });

  it('should dismiss the closure dialog with Escape without closing the element', () => {
    const api = givenWorkshop(1, 0);
    whenVisitingWorkshop();
    whenRequestingClosure();
    whenPressingEscape();

    thenClosureIsDismissed(api);
  });

  it('should keep the dialog open and the button disabled until the engagement completes', () => {
    givenWorkshop(0, 2);
    const response = givenPendingEngagement();
    whenVisitingWorkshop();
    whenOpeningEngagement();
    whenEngagingFirstCandidate();
    whenObservingPendingEngagement();
    whenCompletingEngagement(response);

    thenPendingEngagementWasProtected();
  });

  it('should explain why a reopening was refused without losing the list', () => {
    givenRefusedReopening();
    whenVisitingWorkshop();
    whenShowingClosedElements();
    whenReopeningFirstElement();

    thenReopeningIsRefused();
  });

  it('should show the closure column empty while the element is still at the workshop', () => {
    givenWorkshop(1, 0);
    whenVisitingWorkshop();

    thenClosureColumnIsEmpty();
  });

  it('should keep the workshop usable on a narrow screen', () => {
    givenWorkshop(2, 0);
    whenVisitingMobileWorkshop();

    thenMobileLayoutIsUsable();
  });
});

const givenWorkshop = (engages: number, engageables: number): AtelierApiFixture => {
  const taille = Math.max(engages, engageables, 1);
  const referentiel = new ElementsApiFixture(elementsFixture(taille));
  referentiel.install();
  const api = new AtelierApiFixture(suivisFixture(engages));
  api.engageables = engageablesFixture(taille);
  api.install();
  return api;
};
const givenFailedRead = (): void => {
  givenWorkshop(1, 0).failRead = true;
};
const givenRefusedReopening = (): void => {
  const api = givenWorkshop(1, 0);
  api.suivis = [{ id: 'suivi-1', element: 'element-1', nom: 'PRD-2026-000001', type: 'PRODUIT', etat: 'CLOTURE' }];
  api.failWrite = true;
};
const givenPendingEngagement = (): ReturnType<typeof interceptForever> =>
  interceptForever({ method: 'POST', pathname: '/api/atelier/suivis' }, { statusCode: 201, body: {} }, 'pendingEngagement');

const whenVisitingWorkshop = (): void => {
  cy.viewport(1280, 900);
  cy.visit('/atelier');
};
const whenVisitingMobileWorkshop = (): void => {
  cy.viewport(390, 844);
  cy.visit('/atelier');
  cy.get(dataSelector('atelier-row')).should('have.length', 2);
  cy.screenshot('atelier-mobile', { capture: 'viewport' });
};
const whenOpeningEngagement = (): void => {
  cy.get(dataSelector('atelier-new')).should('be.enabled').click();
  cy.get(dataSelector('engageable-engage')).should('be.visible');
};
const whenEngagingFirstCandidate = (): void => {
  cy.get(dataSelector('engageable-engage')).first().click();
};
const whenPressingEscape = (): void => {
  cy.get('body').type('{esc}');
};
const whenRequestingClosure = (): void => {
  cy.get(dataSelector('atelier-close')).first().click();
  cy.get(dataSelector('atelier-cloture-confirm')).should('be.visible');
};
const whenShowingClosedElements = (): void => {
  cy.get(dataSelector('atelier-filtre-CLOTURES')).click();
  cy.get(dataSelector('atelier-reopen')).should('be.visible');
};
const whenReopeningFirstElement = (): void => {
  cy.get(dataSelector('atelier-reopen')).first().click();
  cy.wait('@atelierReouverture');
};
const whenObservingPendingEngagement = (): void => {
  cy.get(dataSelector('engageable-engage')).first().should('be.disabled');
  cy.get(dataSelector('atelier-engagement-introduction')).invoke('text').as('pendingIntroduction', { type: 'static' });
};
const whenCompletingEngagement = (response: ReturnType<typeof interceptForever>): void => {
  cy.then(() => response.send());
  cy.wait('@pendingEngagement');
};

const thenDesktopLayoutIsVisible = (): void => {
  cy.get(dataSelector('atelier-row')).should('have.length', 6);
  cy.get(dataSelector('atelier-close')).first().should('have.attr', 'aria-label', 'Clôturer PRD-2026-000001');
  cy.screenshot('atelier-desktop', { capture: 'fullPage' });
};
const thenEmptyStateInvitesEngagement = (): void => {
  cy.get(dataSelector('atelier-empty')).should('contain.text', 'Aucun élément à l’atelier');
  cy.get(dataSelector('atelier-empty-new')).should('contain.text', 'Mettre à l’atelier');
  cy.get(dataSelector('atelier-pagination')).should('contain.text', '0 élément');
};
const thenReadFailureIsVisible = (): void => {
  cy.get(dataSelector('atelier-error')).should('be.visible');
  cy.get(dataSelector('atelier-empty')).should('not.exist');
  cy.get(dataSelector('atelier-retry')).should('be.enabled');
};
const thenEngagementIsDismissed = (api: AtelierApiFixture): void => {
  cy.get(dataSelector('atelier-engagement-introduction')).should('not.exist');
  cy.wrap(api.engagements).should('be.empty');
};
const thenClosureIsDismissed = (api: AtelierApiFixture): void => {
  cy.get(dataSelector('atelier-cloture-confirm')).should('not.exist');
  cy.get(dataSelector('atelier-row')).should('have.length', 1);
  cy.wrap(api.clotures).should('be.empty');
};
const thenPendingEngagementWasProtected = (): void => {
  cy.get('@pendingIntroduction').should('contain', 'ne porte aucune date');
  cy.get(dataSelector('atelier-engagement-introduction')).should('not.exist');
};
const thenReopeningIsRefused = (): void => {
  cy.get(dataSelector('atelier-action-refusal')).should('contain.text', 'n’est plus à l’atelier');
  cy.get(dataSelector('atelier-row')).should('have.length', 1);
  cy.screenshot('atelier-reopening-refused', { capture: 'viewport' });
};
const thenClosureColumnIsEmpty = (): void => {
  cy.get(dataSelector('atelier-cloture-cell')).should('contain.text', '—');
  cy.get(dataSelector('atelier-engagement-cell')).should('contain.text', 'par gestionnaire.impeccmold');
};
const thenMobileLayoutIsUsable = (): void => {
  cy.get(dataSelector('atelier-new')).should('be.visible');
  cy.get(dataSelector('atelier-filtre-ACTIFS')).should('be.visible');
  cy.screenshot('atelier-form-mobile', { capture: 'viewport' });
};

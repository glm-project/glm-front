import { dataSelector } from '../../../utils/DataSelector';
import { AtelierApiFixture, engageablesFixture, suivisFixture } from '../../../utils/gestion/atelier/AtelierApiFixture';
import { ElementsApiFixture, elementsFixture } from '../../../utils/gestion/element-de-fabrication/ElementsApiFixture';

describe('Putting moules and OF at the workshop from gestion', () => {
  it('should reach the workshop from the gestion menu', () => {
    givenWorkshop(0, 0);
    whenOpeningFromTheMenu();

    thenWorkshopIsVisible();
  });

  it('should put a first element at the workshop, with no date asked anywhere', () => {
    const api = givenWorkshop(0, 2);
    whenVisitingWorkshop();
    whenOpeningEngagement();
    whenEngagingFirstCandidate();

    thenElementIsAtWorkshop('PRD-2026-000001', 'Moule', 'En attente');
    thenEngagementCarriedOnlyTheElement(api);
  });

  it('should aim the engagement at the element the referential row pointed at', () => {
    givenWorkshop(0, 2);
    whenVisitingReferential();
    whenSendingFirstElementToWorkshop();

    thenCandidateIsAimedAt('1015');
  });

  it('should put the aimed element at the workshop and list it', () => {
    givenWorkshop(0, 2);
    whenVisitingReferential();
    whenSendingFirstElementToWorkshop();
    whenConfirmingAimedEngagement();

    thenElementIsAtWorkshop('PRD-2026-000001', 'Moule', 'En attente');
  });

  it('should explain that an element already at the workshop cannot be put there twice', () => {
    givenWorkshop(1, 2);
    whenVisitingWorkshop();
    whenOpeningEngagement();
    whenEngagingFirstCandidate();

    thenDuplicateIsRefused();
  });

  it('should close an element so it leaves what is at the workshop', () => {
    const api = givenWorkshop(2, 0);
    whenVisitingWorkshop();
    whenClosingFirstElement();

    thenWorkshopShowsOnly('PRD-2026-000002');
    thenClosureCarriedNoDate(api);
  });

  it('should reopen a closed element so it comes back among the active ones', () => {
    givenWorkshop(1, 0);
    whenVisitingWorkshop();
    whenClosingFirstElement();
    whenShowingClosedElements();
    whenReopeningFirstElement();

    thenElementIsAtWorkshop('PRD-2026-000001', 'Moule', 'En attente');
  });

  it('should paginate the workshop without asking for any period', () => {
    givenWorkshop(21, 0);
    whenVisitingWorkshop();
    whenGoingToNextPage();

    thenLastPageShowsTheRemainingElement();
  });
});

const givenWorkshop = (engages: number, engageables: number): AtelierApiFixture => {
  const referentiel = new ElementsApiFixture(elementsFixture(Math.max(engages, engageables)));
  referentiel.install();
  const api = new AtelierApiFixture(suivisFixture(engages));
  api.engageables = engageablesFixture(Math.max(engages, engageables));
  api.install();
  return api;
};

const whenVisitingWorkshop = (): void => {
  cy.viewport(1280, 900);
  cy.visit('/atelier');
  cy.wait('@atelierRead');
};
const whenVisitingReferential = (): void => {
  cy.viewport(1280, 900);
  cy.visit('/moules-et-of');
  cy.wait('@elementsRead');
};
const whenOpeningFromTheMenu = (): void => {
  cy.visit('/');
  cy.get(dataSelector('gestion-menu')).click();
  cy.get(dataSelector('gestion-navigation-atelier')).click();
};
const whenOpeningEngagement = (): void => {
  cy.get(dataSelector('atelier-new')).should('be.enabled').click();
  cy.wait('@elementsRead');
};
const whenEngagingFirstCandidate = (): void => {
  cy.get(dataSelector('engageable-engage')).first().click();
  cy.wait('@atelierEngage');
};
const whenSendingFirstElementToWorkshop = (): void => {
  cy.get(dataSelector('element-mise-a-l-atelier')).first().click();
  cy.wait('@elementRead');
};
const whenConfirmingAimedEngagement = (): void => {
  cy.get(dataSelector('atelier-engagement-confirm')).click();
  cy.wait('@atelierEngage');
};
const whenClosingFirstElement = (): void => {
  cy.get(dataSelector('atelier-close')).first().click();
  cy.get(dataSelector('atelier-cloture-confirm')).click();
  cy.wait('@atelierCloture');
  cy.get(dataSelector('atelier-cloture-description')).should('not.exist');
};
const whenShowingClosedElements = (): void => {
  cy.get(dataSelector('atelier-filtre-CLOTURES')).click();
  cy.get(dataSelector('atelier-reopen')).should('be.visible');
};
const whenReopeningFirstElement = (): void => {
  cy.get(dataSelector('atelier-reopen')).first().click();
  cy.wait('@atelierReouverture');
};
const whenGoingToNextPage = (): void => {
  cy.get(dataSelector('atelier-pagination')).find('button[aria-label="Page suivante"]').click();
  cy.wait('@atelierRead');
};

const thenWorkshopIsVisible = (): void => {
  cy.location('pathname').should('eq', '/atelier');
  cy.get(dataSelector('atelier-page')).should('be.visible');
  cy.get(dataSelector('atelier-empty')).should('contain.text', 'Aucun élément à l’atelier');
};
const thenElementIsAtWorkshop = (nom: string, type: string, etat: string): void => {
  cy.get(dataSelector('atelier-engagement-introduction')).should('not.exist');
  cy.get(dataSelector('atelier-row')).contains(nom).closest('tr').should('contain.text', type).and('contain.text', etat);
};
const thenEngagementCarriedOnlyTheElement = (api: AtelierApiFixture): void => {
  cy.wrap(api.engagements).should('deep.equal', [{ element: 'element-1' }]);
};
const thenCandidateIsAimedAt = (reference: string): void => {
  cy.location('pathname').should('eq', '/atelier');
  cy.get(dataSelector('atelier-candidat-designation')).should('have.text', reference);
  cy.get(dataSelector('engageable-row')).should('not.exist');
};
const thenDuplicateIsRefused = (): void => {
  cy.get(dataSelector('atelier-engagement-refusal')).should('contain.text', 'déjà à l’atelier');
  cy.get(dataSelector('atelier-engagement-introduction')).should('be.visible');
};
const thenWorkshopShowsOnly = (nom: string): void => {
  cy.get(dataSelector('atelier-row')).should('have.length', 1);
  cy.get(dataSelector('atelier-nom-cell')).should('have.text', nom);
};
const thenClosureCarriedNoDate = (api: AtelierApiFixture): void => {
  cy.wrap(api.clotures).should('deep.equal', ['suivi-1']);
};
const thenLastPageShowsTheRemainingElement = (): void => {
  cy.get(dataSelector('atelier-row')).should('have.length', 1);
  cy.get(dataSelector('atelier-pagination')).should('contain.text', '21–21 sur 21');
  cy.get('@atelierRead').its('request.query').should('not.have.property', 'debut');
};

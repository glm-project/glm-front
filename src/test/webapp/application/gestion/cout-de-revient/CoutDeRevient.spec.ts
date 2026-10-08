import { dataSelector } from '../../../utils/DataSelector';
import { AtelierApiFixture, engageablesFixture, suivisFixture } from '../../../utils/gestion/atelier/AtelierApiFixture';
import {
  CoutDeRevientApiFixture,
  rapportEnCoursFixture,
  rapportIncompletFixture,
} from '../../../utils/gestion/cout-de-revient/CoutDeRevientApiFixture';
import { ElementsApiFixture, elementsFixture } from '../../../utils/gestion/element-de-fabrication/ElementsApiFixture';

describe('Cost of manufacture of an element at the workshop', () => {
  let atelier: AtelierApiFixture;
  let elements: ElementsApiFixture;
  let cout: CoutDeRevientApiFixture;

  beforeEach(() => {
    atelier = new AtelierApiFixture(suivisFixture(2));
    atelier.engageables = engageablesFixture(2);
    elements = new ElementsApiFixture(elementsFixture(2));
    cout = new CoutDeRevientApiFixture();
  });

  it('should reach an incomplete report from the workshop and preserve its element address', () => {
    givenIncompleteWorkshopReport();
    whenVisitingWorkshop();
    whenOpeningTheCostOfTheFirstElement();

    thenTheIncompleteElementReportIsVisible();
  });

  it('should return to the workshop from a report carrying only excluded current activities', () => {
    givenCurrentWorkshopReport();
    whenVisitingTheReportOf('element-1');
    whenGoingBackFromTheCurrentReport();

    thenWorkshopIsVisible();
  });

  it('should display the new report after retrying a failed element reading', () => {
    givenFailingReport();
    whenVisitingTheReportOf('element-1');
    whenRetryingTheAvailableReport();

    thenTheReportIsDisplayed();
  });

  it('should reach the cost of manufacture of an element from the workshop', () => {
    givenWorkshopAndReports();
    whenVisitingWorkshop();
    whenOpeningTheCostOfTheFirstElement();

    thenTheReportIsDisplayed();
  });

  it('should ask the server for the element the workshop row pointed at, never for its follow-up', () => {
    givenWorkshopAndReports();
    whenVisitingWorkshop();
    whenOpeningTheCostOfTheFirstElement();

    thenTheServerWasAskedFor('element-1');
  });

  it('should reach the cost of manufacture of an element from the referential, without passing through the workshop', () => {
    givenReferentialAndReports();
    whenVisitingReferential();
    whenOpeningTheCostOfTheFirstElementListed();

    thenTheReportIsDisplayed();
  });

  it('should come back to the workshop from the report', () => {
    givenWorkshopAndReports();
    whenVisitingWorkshop();
    whenOpeningTheCostOfTheFirstElement();
    whenGoingBackToTheWorkshop();

    thenWorkshopIsVisible();
  });

  it('should read the report a shared address names', () => {
    givenWorkshopAndReports();
    whenVisitingTheReportOf('element-2');

    thenTheServerWasAskedFor('element-2');
  });

  it('should explain an element the referential does not know', () => {
    givenAnUnknownElement();
    whenVisitingTheReportOf('element-disparu');

    thenTheUnknownElementIsExplained();
  });

  const givenIncompleteWorkshopReport = (): void => {
    cout.rapport = rapportIncompletFixture();
    givenWorkshopAndReports();
  };

  const givenCurrentWorkshopReport = (): void => {
    cout.rapport = rapportEnCoursFixture();
    givenWorkshopAndReports();
  };

  const givenFailingReport = (): void => {
    cout.failRead = true;
    givenWorkshopAndReports();
  };

  const givenWorkshopAndReports = (): void => {
    atelier.install();
    cout.install();
  };

  const givenReferentialAndReports = (): void => {
    elements.install();
    cout.install();
  };

  const givenAnUnknownElement = (): void => {
    atelier.install();
    cout.elementInconnu = true;
    cout.install();
  };

  const whenRetryingTheAvailableReport = (): void => {
    cy.get(dataSelector('cout-error')).should('be.visible');
    cy.then(() => {
      cout.failRead = false;
    });
    cy.get(dataSelector('cout-retry')).click();
  };

  const whenVisitingWorkshop = (): void => {
    cy.viewport(1280, 900);
    cy.visit('/atelier');
    cy.get(dataSelector('atelier-row')).should('have.length', 2);
  };

  const whenVisitingTheReportOf = (element: string): void => {
    cy.viewport(1280, 900);
    cy.visit(`/couts-de-revient/${element}`);
  };

  const whenVisitingReferential = (): void => {
    cy.viewport(1280, 900);
    cy.visit('/produits');
    cy.wait('@elementsRead');
  };

  const whenOpeningTheCostOfTheFirstElement = (): void => {
    cy.get(dataSelector('atelier-cout-de-revient')).first().click();
  };

  const whenOpeningTheCostOfTheFirstElementListed = (): void => {
    cy.get(dataSelector('element-cout-de-revient')).first().click();
  };

  const whenGoingBackFromTheCurrentReport = (): void => {
    cy.get(dataSelector('cout-activites-exclues')).should('be.visible');
    whenGoingBackToTheWorkshop();
  };

  const whenGoingBackToTheWorkshop = (): void => {
    cy.get(dataSelector('cout-retour')).click();
  };

  const thenTheIncompleteElementReportIsVisible = (): void => {
    cy.location('pathname').should('eq', '/couts-de-revient/element-1');
    cy.get(dataSelector('cout-total')).should('contain.text', 'Incomplet');
    cy.get(dataSelector('cout-machine-cell')).should('contain.text', '300,00');
    cy.get(dataSelector('cout-bandeau-anomalies')).should('be.visible');
  };

  const thenTheReportIsDisplayed = (): void => {
    cy.get(dataSelector('cout-identite')).should('contain.text', 'OF · OF-2026-000001');
    cy.get(dataSelector('cout-ligne-row')).should('have.length', 3);
    cy.get(dataSelector('cout-total')).should('contain.text', '295,00');
  };

  const thenTheServerWasAskedFor = (element: string): void => {
    cy.wait('@coutDeRevientRead');
    cy.wrap(cout.lectures).should('deep.include', element);
  };

  const thenWorkshopIsVisible = (): void => {
    cy.get(dataSelector('atelier-row')).should('have.length', 2);
  };

  const thenTheUnknownElementIsExplained = (): void => {
    cy.get(dataSelector('cout-element-introuvable')).should('contain.text', 'n’existe plus au référentiel');
  };
});

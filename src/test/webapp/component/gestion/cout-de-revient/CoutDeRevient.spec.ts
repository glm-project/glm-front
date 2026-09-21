import { dataSelector } from '../../../utils/DataSelector';
import { interceptForever } from '../../../utils/Interceptor';
import { CoutDeRevientApiFixture, coutDeRevientFixture } from '../../../utils/gestion/cout-de-revient/CoutDeRevientApiFixture';

const RAPPORT = '/couts-de-revient/element-1';

describe('Cost of manufacture in gestion', () => {
  let api: CoutDeRevientApiFixture;

  beforeEach(() => {
    api = new CoutDeRevientApiFixture();
  });

  it('should display the total cost and one row per operation nature on a desktop viewport', () => {
    givenReport();
    whenVisitingTheReport();

    thenTheReportIsDisplayed();
  });

  it('should let the report scroll horizontally on a narrow viewport', () => {
    givenReport();
    whenVisitingTheReportOnAPhone();

    thenTheTableScrollsHorizontally();
  });

  it('should keep the loading status visible until the report arrives', () => {
    const pending = givenAPendingReport();
    whenVisitingTheReport();

    thenTheLoadingStatusIsVisible(pending);
  });

  it('should offer a retry after a read failure', () => {
    givenAFailingRead();
    whenVisitingTheReport();

    thenTheFailureOffersARetry();
  });

  it('should explain an element the referential does not know', () => {
    givenAnUnknownElement();
    whenVisitingTheReport();

    thenTheUnknownElementIsExplained();
  });

  it('should explain an element nobody has clocked on yet', () => {
    givenAnElementWithoutClocking();
    whenVisitingTheReport();

    thenTheAbsenceOfClockingIsExplained();
  });

  it('should date the period and the reworks of a row when its detail is opened', () => {
    givenReport();
    whenVisitingTheReport();
    whenOpeningTheDetailOfTheFirstRow();

    thenTheDatedDetailIsVisible();
  });

  it('should keep the detail toggle reachable from the keyboard', () => {
    givenReport();
    whenVisitingTheReport();
    whenFocusingTheFirstDetailToggle();

    thenTheDetailToggleHasFocus();
  });

  const givenReport = (): void => {
    api.install();
  };

  const givenAPendingReport = (): { send: () => void } =>
    interceptForever({ method: 'GET', pathname: '/api/couts-de-revient/*' }, { body: coutDeRevientFixture() }, 'coutDeRevientRead');

  const givenAFailingRead = (): void => {
    api.failRead = true;
    api.install();
  };

  const givenAnUnknownElement = (): void => {
    api.elementInconnu = true;
    api.install();
  };

  const givenAnElementWithoutClocking = (): void => {
    api.sansPointage = true;
    api.install();
  };

  const whenVisitingTheReport = (): void => {
    cy.viewport(1280, 900);
    cy.visit(RAPPORT);
  };

  const whenVisitingTheReportOnAPhone = (): void => {
    cy.viewport(390, 844);
    cy.visit(RAPPORT);
  };

  const whenOpeningTheDetailOfTheFirstRow = (): void => {
    cy.get(dataSelector('cout-detail-toggle')).first().click();
  };

  const whenFocusingTheFirstDetailToggle = (): void => {
    cy.get(dataSelector('cout-detail-toggle')).first().focus();
  };

  const thenTheReportIsDisplayed = (): void => {
    cy.get(dataSelector('cout-ligne-row')).should('have.length', 3);
    cy.get(dataSelector('cout-total')).should('contain.text', '295,00');
    cy.get(dataSelector('cout-repartition')).should('contain.text', 'Machine 195,00');
    cy.get(dataSelector('cout-temps-total')).should('contain.text', '5 h 00');
    cy.get(dataSelector('cout-nature-cell')).last().should('contain.text', 'Sans poste');
    cy.screenshot('cout-de-revient-desktop', { capture: 'fullPage' });
  };

  const thenTheTableScrollsHorizontally = (): void => {
    cy.get(dataSelector('cout-ligne-row')).should('have.length', 3);
    cy.get('.table-scroll').should($region => {
      expect($region[0]?.scrollWidth).to.be.greaterThan($region[0]?.clientWidth ?? 0);
    });
    cy.screenshot('cout-de-revient-mobile', { capture: 'fullPage' });
  };

  const thenTheLoadingStatusIsVisible = (pending: { send: () => void }): void => {
    cy.get(dataSelector('cout-loading')).should('be.visible');
    cy.then(() => {
      pending.send();
    });
    cy.get(dataSelector('cout-total')).should('be.visible');
  };

  const thenTheFailureOffersARetry = (): void => {
    cy.get(dataSelector('cout-error')).should('be.visible');
    cy.get(dataSelector('cout-retry')).should('be.enabled');
  };

  const thenTheUnknownElementIsExplained = (): void => {
    cy.get(dataSelector('cout-element-introuvable')).should('contain.text', 'n’existe plus au référentiel');
  };

  const thenTheAbsenceOfClockingIsExplained = (): void => {
    cy.get(dataSelector('cout-sans-travail')).should('contain.text', 'Aucun temps pointé');
    cy.get(dataSelector('cout-ligne-row')).should('not.exist');
  };

  const thenTheDatedDetailIsVisible = (): void => {
    cy.get(dataSelector('cout-periode')).should('contain.text', '11 mai 2026');
    cy.get(dataSelector('cout-non-conformite')).should('have.length', 1);
  };

  const thenTheDetailToggleHasFocus = (): void => {
    cy.get(dataSelector('cout-detail-toggle')).first().should('have.focus');
  };
});

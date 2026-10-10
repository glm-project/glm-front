import { dataSelector } from '../../../utils/DataSelector';
import { interceptForever } from '../../../utils/Interceptor';
import {
  CoutDeRevientApiFixture,
  coutDeRevientFixture,
  fichierExporteFixture,
  rapportAutomatiqueFixture,
  rapportEnCoursFixture,
} from '../../../utils/gestion/cout-de-revient/CoutDeRevientApiFixture';

const RAPPORT = '/couts-de-revient/element-1';

describe('Cost of manufacture in gestion', () => {
  let api: CoutDeRevientApiFixture;

  beforeEach(() => {
    api = new CoutDeRevientApiFixture();
  });

  it('should show automatic finishes before expanding a row and explain their counted periods', () => {
    givenAutomaticReport();
    whenVisitingTheReport();

    thenAutomaticFinishIsVisibleBeforeDetail();
  });

  it('should explain automatic periods in the expanded detail', () => {
    givenAutomaticReport();
    whenVisitingTheReport();
    whenOpeningTheDetailOfTheFirstRow();

    thenAutomaticFinishIsExplained();
  });

  it('should explain excluded current activities while retaining complete zero totals', () => {
    givenCurrentReport();
    whenVisitingTheReport();

    thenCurrentActivityExclusionIsVisible();
  });

  it('should remove an automatic alert when a new server report no longer carries it', () => {
    givenAutomaticReport();
    whenVisitingTheReport();
    whenReloadingTheRegularisedReport();

    thenTheRegularisedReportIsVisible();
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

  it('should justify each clocking of a row and the sharing of its operator when its detail is opened', () => {
    givenReport();
    whenVisitingTheReport();
    whenOpeningTheDetailOfTheFirstRow();

    thenTheClockingsAndTheirSharesAreVisible();
  });

  it('should keep the detail toggle reachable from the keyboard', () => {
    givenReport();
    whenVisitingTheReport();
    whenFocusingTheFirstDetailToggle();

    thenTheDetailToggleHasFocus();
  });

  it('should download the workbook of the report under the name the server gave it', () => {
    givenReport();
    whenVisitingTheReport();
    whenExporting('cout-export-excel');

    thenTheFileIsDownloaded('cout-de-revient-OF-2026-000001.xlsx', 'xlsx');
  });

  it('should show the workbook in preparation until the server sends it', () => {
    givenAPendingExport('/api/couts-de-revient/element-1/export.xlsx');
    whenVisitingTheReport();
    whenExporting('cout-export-excel');

    thenTheExportIsInPreparation('cout-export-excel');
  });

  const givenAPendingExport = (route: string): void => {
    api.install();
    interceptForever({ method: 'GET', pathname: route }, fichierExporteFixture(`http://localhost${route}`), 'pendingExport');
  };

  const whenExporting = (selector: string): void => {
    cy.get(dataSelector(selector)).click();
  };

  const thenTheFileIsDownloaded = (nom: string, contenu: string): void => {
    cy.readFile(`cypress/downloads/${nom}`).should('eq', contenu);
  };

  const thenTheExportIsInPreparation = (selector: string): void => {
    cy.get(dataSelector(selector)).should('contain.text', 'Préparation…').and('be.disabled');
  };

  const givenAutomaticReport = (): void => {
    api.rapport = rapportAutomatiqueFixture();
    api.install();
  };

  const givenCurrentReport = (): void => {
    api.rapport = rapportEnCoursFixture();
    api.install();
  };

  const givenReport = (): void => {
    api.install();
  };

  const givenAPendingReport = (): { send: () => void } => {
    api.install();
    return interceptForever({ method: 'GET', pathname: '/api/couts-de-revient/*' }, { body: coutDeRevientFixture() }, 'coutDeRevientRead');
  };

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

  const whenReloadingTheRegularisedReport = (): void => {
    cy.get(dataSelector('cout-nature-anomalie')).should('have.text', '1 fin automatique');
    cy.then(() => {
      api.rapport = coutDeRevientFixture();
    });
    cy.reload();
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

  const thenAutomaticFinishIsVisibleBeforeDetail = (): void => {
    cy.get(dataSelector('cout-nature-anomalie')).should('have.text', '1 fin automatique');
    cy.get(dataSelector('cout-detail')).should('not.exist');
    cy.get(dataSelector('cout-temps-total')).should('contain.text', '13 h 00');
  };

  const thenAutomaticFinishIsExplained = (): void => {
    cy.get(dataSelector('cout-nature-anomalie')).should('have.text', '1 fin automatique');
    cy.get(dataSelector('cout-temps-total')).should('contain.text', '13 h 00');
    cy.get(dataSelector('cout-total')).should('contain.text', '845,00');
    cy.get(dataSelector('cout-pointage-anomalie')).should('have.text', 'Fin automatique');
    cy.get(dataSelector('cout-pointage-explication')).should('contain.text', 'arrêtée automatiquement à son échéance');
    cy.get(dataSelector('cout-pointage-explication')).should('contain.text', 'régulariser la fin automatique');
  };

  const thenCurrentActivityExclusionIsVisible = (): void => {
    cy.get(dataSelector('cout-activites-exclues')).should('contain.text', '2 activités en cours exclues');
    cy.get(dataSelector('cout-temps-total')).should('contain.text', '0 h 00');
    cy.get(dataSelector('cout-total')).should('contain.text', '0,00');
    cy.get(dataSelector('cout-sans-travail')).should('not.exist');
  };

  const thenTheRegularisedReportIsVisible = (): void => {
    cy.get(dataSelector('cout-nature-anomalie')).should('not.exist');
    cy.get(dataSelector('cout-total')).should('contain.text', '295,00');
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
    cy.get('[role="region"]').should($region => {
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

  const thenTheClockingsAndTheirSharesAreVisible = (): void => {
    cy.get(dataSelector('cout-pointage')).should('have.length', 1);
    cy.get(dataSelector('cout-pointage-operateur')).should('have.text', 'Julien Martin');
    cy.get(dataSelector('cout-pointage-main-d-oeuvre')).should('contain.text', '50,00');
    cy.get(dataSelector('cout-part')).should('have.length', 3);
    cy.get(dataSelector('cout-part-contexte')).eq(1).should('contain.text', 'aussi sur Haas VF-2 · OF-2026-000192 (Fraisage)');
    cy.get(dataSelector('cout-part-calcul')).eq(1).should('contain.text', '20,00 × 1,00 ÷ 2 = 10,00');
  };

  const thenTheDetailToggleHasFocus = (): void => {
    cy.get(dataSelector('cout-detail-toggle')).first().should('have.focus');
  };
});

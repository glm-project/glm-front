import { dataSelector } from '../../../utils/DataSelector';
import { interceptForever } from '../../../utils/Interceptor';
import { SyntheseDesHeuresApiFixture, syntheseFixture } from '../../../utils/gestion/releve-des-heures/SyntheseDesHeuresApiFixture';

const HORLOGE = new Date(2026, 8, 17, 10, 0).getTime();
const SEMAINE_EN_COURS = '/operateurs/op-1/heures?annee=2026&semaine=38';

describe('Weekly hours report in gestion', () => {
  let api: SyntheseDesHeuresApiFixture;

  beforeEach(() => {
    api = new SyntheseDesHeuresApiFixture();
  });

  it('should display the seven days and the week total on a desktop viewport', () => {
    givenReport();
    whenVisitingTheReport();

    thenTheWeekIsDisplayed();
  });

  it('should let the seven days scroll horizontally on a narrow viewport', () => {
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

  it('should explain an operator the referential does not know', () => {
    givenAnUnknownOperateur();
    whenVisitingTheReport();

    thenTheUnknownOperateurIsExplained();
  });

  it('should keep the week navigation reachable from the keyboard', () => {
    givenReport();
    whenVisitingTheReport();
    whenFocusingTheWeekSelector();

    thenTheWeekSelectorHasFocus();
  });

  const givenReport = (): void => {
    api.install();
  };

  const givenAPendingReport = (): { send: () => void } =>
    interceptForever({ method: 'GET', pathname: '/api/syntheses-des-heures/*' }, { body: syntheseFixture(2026, 38) }, 'syntheseRead');

  const givenAFailingRead = (): void => {
    api.failRead = true;
    api.install();
  };

  const givenAnUnknownOperateur = (): void => {
    api.operateurInconnu = true;
    api.install();
  };

  const whenVisitingTheReport = (): void => {
    cy.viewport(1280, 900);
    cy.clock(HORLOGE, ['Date']);
    cy.visit(SEMAINE_EN_COURS);
  };

  const whenVisitingTheReportOnAPhone = (): void => {
    cy.viewport(390, 844);
    cy.clock(HORLOGE, ['Date']);
    cy.visit(SEMAINE_EN_COURS);
  };

  const thenTheWeekIsDisplayed = (): void => {
    cy.get(dataSelector('synthese-jour-row')).should('have.length', 7);
    cy.get(dataSelector('synthese-total')).should('contain.text', 'Total : 7 h 30');
    cy.get(dataSelector('synthese-jour-sans-pointage')).should('have.length', 6);
    cy.screenshot('synthese-des-heures-desktop', { capture: 'fullPage' });
  };

  const thenTheTableScrollsHorizontally = (): void => {
    cy.get(dataSelector('synthese-jour-row')).should('have.length', 7);
    cy.get('.table-scroll').should($region => {
      expect($region[0]?.scrollWidth).to.be.greaterThan($region[0]?.clientWidth ?? 0);
    });
    cy.screenshot('synthese-des-heures-mobile', { capture: 'fullPage' });
  };

  const thenTheLoadingStatusIsVisible = (pending: { send: () => void }): void => {
    cy.get(dataSelector('synthese-loading')).should('be.visible');
    cy.then(() => {
      pending.send();
    });
    cy.get(dataSelector('synthese-total')).should('be.visible');
  };

  const thenTheFailureOffersARetry = (): void => {
    cy.get(dataSelector('synthese-error')).should('be.visible');
    cy.get(dataSelector('synthese-retry')).should('be.enabled');
  };

  const thenTheUnknownOperateurIsExplained = (): void => {
    cy.get(dataSelector('synthese-operateur-introuvable')).should('contain.text', 'n’existe plus au référentiel');
  };

  const whenFocusingTheWeekSelector = (): void => {
    cy.get(dataSelector('synthese-semaine')).focus();
  };

  const thenTheWeekSelectorHasFocus = (): void => {
    cy.get(dataSelector('synthese-semaine')).should('have.focus');
  };
});

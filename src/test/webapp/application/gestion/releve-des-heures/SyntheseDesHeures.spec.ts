import { dataSelector } from '../../../utils/DataSelector';
import { OperateursApiFixture, operateursFixture, postesFixture } from '../../../utils/gestion/operateur/OperateursApiFixture';
import { SyntheseDesHeuresApiFixture } from '../../../utils/gestion/releve-des-heures/SyntheseDesHeuresApiFixture';

const HORLOGE = new Date(2026, 8, 17, 10, 0).getTime();

describe('Weekly hours report of an operator', () => {
  let operateurs: OperateursApiFixture;
  let synthese: SyntheseDesHeuresApiFixture;

  beforeEach(() => {
    operateurs = new OperateursApiFixture(operateursFixture(1), postesFixture(3));
    synthese = new SyntheseDesHeuresApiFixture();
  });

  it('should reach the weekly hours of an operator from the referential, on the week in progress', () => {
    givenReferentialAndReports();
    whenVisitingOperateurs();
    whenOpeningTheHoursOfTheFirstOperateur();

    thenTheWeekInProgressIsDisplayed();
  });

  it('should read the week in progress when the address names none', () => {
    givenReferentialAndReports();
    whenVisitingOperateurs();
    whenOpeningTheHoursOfTheFirstOperateur();

    thenTheServerWasAskedFor('2026', '38');
  });

  it('should move to the previous week and come back with the browser history', () => {
    givenReferentialAndReports();
    whenVisitingTheWeek(2026, 38);
    whenAskingForThePreviousWeek();
    whenGoingBack();

    thenTheWeekInProgressIsDisplayed();
  });

  it('should read the week a shared address names', () => {
    givenReferentialAndReports();
    whenVisitingTheWeek(2025, 12);

    thenTheServerWasAskedFor('2025', '12');
  });

  it('should read the year a chosen year names, on the same week', () => {
    givenReferentialAndReports();
    whenVisitingTheWeek(2026, 20);
    whenChoosingTheYear('2025');

    thenTheServerWasAskedFor('2025', '20');
  });

  it('should read the week a chosen week names', () => {
    givenReferentialAndReports();
    whenVisitingTheWeek(2026, 20);
    whenChoosingTheWeek('12');

    thenTheServerWasAskedFor('2026', '12');
  });

  it('should refuse a week the calendar does not carry, without asking the server', () => {
    givenReferentialAndReports();
    whenVisitingTheWeek(2025, 53);

    thenTheAddressIsRefusedWithoutAnyRead();
  });

  const givenReferentialAndReports = (): void => {
    operateurs.install();
    synthese.install();
  };

  const whenVisitingOperateurs = (): void => {
    cy.viewport(1280, 900);
    cy.clock(HORLOGE, ['Date']);
    cy.visit('/operateurs');
    cy.wait('@operateursRead');
  };

  const whenVisitingTheWeek = (annee: number, semaine: number): void => {
    cy.viewport(1280, 900);
    cy.clock(HORLOGE, ['Date']);
    cy.visit(`/operateurs/op-1/heures?annee=${String(annee)}&semaine=${String(semaine)}`);
  };

  const whenOpeningTheHoursOfTheFirstOperateur = (): void => {
    cy.get(dataSelector('operateur-heures')).first().click();
  };

  const whenAskingForThePreviousWeek = (): void => {
    cy.get(dataSelector('synthese-semaine-precedente')).click();
    cy.get(dataSelector('synthese-semaine-libelle')).should('contain.text', 'Semaine 37');
  };

  const whenGoingBack = (): void => {
    cy.go('back');
  };

  const whenChoosingTheYear = (annee: string): void => {
    cy.get(dataSelector('synthese-annee')).select(annee);
  };

  const whenChoosingTheWeek = (semaine: string): void => {
    cy.get(dataSelector('synthese-semaine')).select(`Semaine ${semaine}`);
  };

  const thenTheWeekInProgressIsDisplayed = (): void => {
    cy.get(dataSelector('synthese-semaine-libelle')).should('contain.text', 'Semaine 38');
    cy.get(dataSelector('synthese-jour-row')).should('have.length', 7);
  };

  const thenTheServerWasAskedFor = (annee: string, semaine: string): void => {
    cy.get(dataSelector('synthese-jour-row')).should('have.length', 7);
    cy.wrap(synthese.lectures).should('deep.include', { annee, semaine });
  };

  const thenTheAddressIsRefusedWithoutAnyRead = (): void => {
    cy.get(dataSelector('synthese-adresse-invalide')).should('be.visible');
    cy.wrap(synthese.lectures).should('be.empty');
  };
});

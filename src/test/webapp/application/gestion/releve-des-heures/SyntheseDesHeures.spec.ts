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

  it('should name the link of an operator after their operational time', () => {
    givenReferentialAndReports();
    whenVisitingOperateurs();

    thenTheLinkToTheOperationalTimeIsNamedAfterTheOperator();
  });

  it('should reach the operational time of an operator under its title, with their name', () => {
    givenReferentialAndReports();
    whenVisitingOperateurs();
    whenOpeningTheHoursOfTheFirstOperateur();

    thenTheOperationalTimeIsTitledWithTheOperator();
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

  it('should open today on the week in progress without rewriting the address', () => {
    givenReferentialAndReports();
    whenVisitingTheWeek(2026, 38);

    thenTheOpenDayIs('jeu. 17');
    thenTheAddressNamesNoDay();
  });

  it('should put the day opened by its header in the address', () => {
    givenReferentialAndReports();
    whenVisitingTheWeek(2026, 38);
    whenOpeningTheDay(1);

    thenTheAddressNamesTheDay('2026-09-15');
  });

  it('should open the previous day again when the browser goes back', () => {
    givenReferentialAndReports();
    whenVisitingTheWeek(2026, 38);
    whenOpeningTheDay(1);
    whenGoingBackFromTheOpenedDay('mar. 15');

    thenTheOpenDayIs('jeu. 17');
  });

  it('should leave the day out of the address when moving to the previous week', () => {
    givenReferentialAndReports();
    whenVisitingTheDayOfTheWeek(2026, 38, '2026-09-15');
    whenAskingForThePreviousWeek();

    thenTheAddressNamesNoDay();
  });

  it('should leave the day out of the address when moving to the next week', () => {
    givenReferentialAndReports();
    whenVisitingTheDayOfTheWeek(2026, 37, '2026-09-08');
    whenAskingForTheNextWeek();

    thenTheAddressNamesNoDay();
  });

  it('should refuse a day the week does not carry, without asking the server', () => {
    givenReferentialAndReports();
    whenVisitingTheDay('2026-09-21');

    thenTheAddressIsRefusedWithoutAnyRead();
  });

  it('should reuse the same acquired reports when selecting a clocking, changing only the day and going back', () => {
    givenReferentialAndReports();
    whenVisitingTheDay('2026-09-14');
    whenChoosingTheClocking(0);
    whenOpeningTheDay(1);
    whenGoingBackFromTheOpenedDay('mar. 15');

    thenTheOpenDayIs('lun. 14');
    thenOnlyOneEvaluationWasAcquired();
    thenReuseTheSameAcquiredReportsWhenSelectingAClockingChangingOnlyTheDayAndGoingBack();
  });

  it('should acquire a fresh report when retrying a technical failure', () => {
    synthese.failRead = true;
    givenReferentialAndReports();
    whenVisitingTheWeek(2026, 38);
    whenRetryingAfterTheSourceRecovers();

    thenTheWeekInProgressIsDisplayed();
    thenAcquireAFreshReportWhenRetryingATechnicalFailure();
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

  const whenVisitingTheDay = (jour: string): void => {
    cy.viewport(1280, 900);
    cy.clock(HORLOGE, ['Date']);
    cy.visit(`/operateurs/op-1/heures?annee=2026&semaine=38&jour=${jour}`);
  };

  const whenVisitingTheDayOfTheWeek = (annee: number, semaine: number, jour: string): void => {
    cy.viewport(1280, 900);
    cy.clock(HORLOGE, ['Date']);
    cy.visit(`/operateurs/op-1/heures?annee=${String(annee)}&semaine=${String(semaine)}&jour=${jour}`);
  };

  const whenChoosingTheClocking = (rang: number): void => {
    cy.get(dataSelector('synthese-journal-entree')).eq(rang).click();
  };

  const whenRetryingAfterTheSourceRecovers = (): void => {
    cy.get(dataSelector('synthese-error')).then(() => {
      synthese.failRead = false;
    });
    cy.get(dataSelector('synthese-retry')).click();
  };

  const whenOpeningTheDay = (rang: number): void => {
    cy.get(dataSelector('synthese-jour-lien')).eq(rang).click();
  };

  const whenGoingBackFromTheOpenedDay = (jour: string): void => {
    thenTheOpenDayIs(jour);
    cy.go('back');
  };

  const whenOpeningTheHoursOfTheFirstOperateur = (): void => {
    cy.get(dataSelector('operateur-heures')).first().click();
  };

  const whenAskingForThePreviousWeek = (): void => {
    cy.get(dataSelector('synthese-semaine-precedente')).click();
    cy.get(dataSelector('synthese-semaine-libelle')).should('contain.text', 'Semaine 37');
  };

  const whenAskingForTheNextWeek = (): void => {
    cy.get(dataSelector('synthese-semaine-suivante')).click();
    cy.get(dataSelector('synthese-semaine-libelle')).should('contain.text', 'Semaine 38');
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

  const thenTheLinkToTheOperationalTimeIsNamedAfterTheOperator = (): void => {
    cy.get(dataSelector('operateur-heures'))
      .first()
      .should('have.attr', 'aria-label', 'Voir le temps opérationnel de Prenom 1 Nom 01')
      .and('contain.text', 'Temps opérationnel');
  };

  const thenTheOperationalTimeIsTitledWithTheOperator = (): void => {
    cy.get(dataSelector('synthese-titre')).should('have.text', 'Temps opérationnel');
    cy.get(dataSelector('synthese-identite')).should('contain.text', 'Jean DUPONT');
  };

  const thenTheOpenDayIs = (jour: string): void => {
    cy.get(dataSelector('synthese-jour-lien')).filter('[aria-current="true"]').should('have.length', 1).and('contain.text', jour);
  };

  const thenTheAddressNamesNoDay = (): void => {
    cy.get(dataSelector('synthese-jour-cell')).should('have.length', 7);
    cy.location('search').should('not.contain', 'jour=');
  };

  const thenTheAddressNamesTheDay = (jour: string): void => {
    cy.location('search').should('contain', `jour=${jour}`);
  };

  const thenTheWeekInProgressIsDisplayed = (): void => {
    cy.get(dataSelector('synthese-semaine-libelle')).should('contain.text', 'Semaine 38');
    cy.get(dataSelector('synthese-jour-cell')).should('have.length', 7);
  };

  const thenTheServerWasAskedFor = (annee: string, semaine: string): void => {
    cy.get(dataSelector('synthese-jour-cell')).should('have.length', 7);
    cy.wrap(synthese.lectures).should('deep.include', { annee, semaine });
  };

  const thenOnlyOneEvaluationWasAcquired = (): void => {
    cy.wrap(synthese.evaluations).should(evaluations => {
      expect(evaluations).to.have.length(2);
      expect(evaluations.map(lecture => lecture.source).sort((a, b) => a.localeCompare(b))).to.deep.equal(['FEUILLE', 'SYNTHESE']);
      expect(evaluations.map(lecture => lecture.evaluation)).to.deep.equal([
        new Date(HORLOGE).toISOString(),
        new Date(HORLOGE).toISOString(),
      ]);
    });
  };

  const thenTheAddressIsRefusedWithoutAnyRead = (): void => {
    cy.get(dataSelector('synthese-adresse-invalide')).should('be.visible');
    cy.wrap(synthese.lectures).should('be.empty');
  };

  const thenReuseTheSameAcquiredReportsWhenSelectingAClockingChangingOnlyTheDayAndGoingBack = (): void => {
    cy.get(dataSelector('synthese-journal-entree')).filter('[aria-pressed="true"]').should('have.length', 0);
    cy.location('search').should('not.contain', 'evaluation=');
  };

  const thenAcquireAFreshReportWhenRetryingATechnicalFailure = (): void => {
    cy.wrap(synthese.lectures).should('have.length', 2);
  };
});

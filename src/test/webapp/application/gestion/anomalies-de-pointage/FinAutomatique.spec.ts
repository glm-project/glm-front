import { dataSelector } from '../../../utils/DataSelector';
import { requiredFixture } from '../../../utils/RequiredFixture';
import { abscisseDeLHeure } from '../../../utils/gestion/anomalies-de-pointage/AbscisseSurLaFrise';
import {
  dossierFinAutomatiqueFixture,
  givenTheReferentielFinAutomatique,
  ouvrantFinAutomatiqueFixture,
  suiviFinAutomatiqueFixture,
} from '../../../utils/gestion/anomalies-de-pointage/FinAutomatiqueHttp.fixture';
import {
  givenTheHoursOfTheOperator,
  thenTheHoursOpenOnTheDay,
  whenFollowingTheLinkToTheDayOfTheOperator,
} from '../../../utils/gestion/anomalies-de-pointage/JourneeDeLOperateur';
import { thenTheHandleHolds, thenTheHandleHoldsNoHour } from '../../../utils/gestion/anomalies-de-pointage/PoigneeDeLaFrise';

const urlDossier = `/api/atelier/suivis/${suiviFinAutomatiqueFixture}/anomalies/${ouvrantFinAutomatiqueFixture}`;
const HEURE_CLIQUEE = new Date(2026, 8, 14, 17, 0);

describe('Automatic end of an activity in Gestion', () => {
  beforeEach(() => {
    cy.clock(new Date(2026, 9, 5, 10, 0).getTime(), ['Date']);
    givenTheReferentielFinAutomatique();
    cy.intercept('GET', urlDossier, { body: dossierFinAutomatiqueFixture() });
  });

  it('should show the problem and invent no hour until the manager places the end on the frise', () => {
    whenOpeningTheAutomaticEnd();

    thenNoHourIsInventedAndNothingCanBeValidated();
  });

  it('should place the end at the hour clicked on the bar', () => {
    whenOpeningTheAutomaticEnd();
    whenClickingTheBarAt(HEURE_CLIQUEE);

    thenTheHandleHoldsTheClickedHour();
  });

  it('should open the hours of the operator on the day the automatic end starts', () => {
    const synthese = givenTheHoursOfTheOperator();

    whenOpeningTheAutomaticEnd();
    whenFollowingTheLinkToTheDayOfTheOperator();

    thenTheHoursOpenOnTheDay(synthese, { annee: '2026', semaine: '38' }, 'lun. 14');
  });

  const whenOpeningTheAutomaticEnd = (): void => {
    cy.visit(`/anomalies/${suiviFinAutomatiqueFixture}?pointage=${ouvrantFinAutomatiqueFixture}`);
  };

  const whenClickingTheBarAt = (instant: Date): void => {
    const heures = instant.getHours() + instant.getMinutes() / 60;
    cy.get(dataSelector('anomalie-frise-placement')).then(elements => {
      const { left } = requiredFixture(elements[0], 'rangée de placement').getBoundingClientRect();
      abscisseDeLHeure(heures).then(clientX => {
        cy.get(dataSelector('anomalie-frise-placement')).click(clientX - left, 20);
      });
    });
  };

  const thenTheHandleHoldsTheClickedHour = (): void => {
    thenTheHandleHolds(HEURE_CLIQUEE);
    cy.get(dataSelector('anomalie-poignee')).should('be.visible');
  };

  const thenNoHourIsInventedAndNothingCanBeValidated = (): void => {
    cy.get(dataSelector('anomalie-probleme'))
      .should('have.length', 1)
      .and('have.text', 'Le travail démarré à 08:00 n’a jamais été arrêté : fin automatique à 21:00.');
    thenTheHandleHoldsNoHour();
    cy.get(dataSelector('anomalie-frise-aide')).should('be.visible');
    cy.get(dataSelector('anomalie-resolution-valider')).should('not.exist');
  };
});

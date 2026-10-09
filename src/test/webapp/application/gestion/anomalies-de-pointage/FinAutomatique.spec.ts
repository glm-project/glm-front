import { components } from '@/app/generated/schema';
import { dataSelector } from '../../../utils/DataSelector';
import { requiredFixture } from '../../../utils/RequiredFixture';
import { abscisseDeLHeure } from '../../../utils/gestion/anomalies-de-pointage/AbscisseSurLaFrise';
import {
  activiteFinAutomatiqueFixture,
  dossierFinAutomatiqueFixture,
  givenTheReferentielFinAutomatique,
  ouvrantFinAutomatiqueFixture,
  suiviFinAutomatiqueFixture,
} from '../../../utils/gestion/anomalies-de-pointage/FinAutomatiqueHttp.fixture';
import {
  finAutomatiqueLigneFixture,
  givenTheElementsFinsAutomatiques,
  givenTheReferentielFinsAutomatiques,
  pageFinsAutomatiquesFixture,
} from '../../../utils/gestion/anomalies-de-pointage/FinsAutomatiquesHttp.fixture';
import { instantLocalWithOffsetFixture } from '../../../utils/gestion/anomalies-de-pointage/InstantLocal.fixture';
import {
  givenTheHoursOfTheOperator,
  thenTheHoursOpenOnTheDay,
  whenFollowingTheLinkToTheDayOfTheOperator,
} from '../../../utils/gestion/anomalies-de-pointage/JourneeDeLOperateur';
import { thenTheHandleHolds, thenTheHandleHoldsNoHour } from '../../../utils/gestion/anomalies-de-pointage/PoigneeDeLaFrise';
import {
  givenTheRegularisationIsCreated,
  givenTheRegularisationIsRefusedWith,
  thenTheEndIsSaidRegularisedAt,
  thenTheRefusalIsSaid,
  thenTheRegularisationSentIs,
  whenValidatingTheEnd,
} from '../../../utils/gestion/anomalies-de-pointage/RegularisationHttp.fixture';

const urlDossier = `/api/atelier/suivis/${suiviFinAutomatiqueFixture}/anomalies/${ouvrantFinAutomatiqueFixture}`;
const HEURE_CLIQUEE = new Date(2026, 8, 14, 17, 0);

const autreSuiviFixture = '71000000-0000-0000-0000-000000000020';
const autreOuvrantFixture = '71000000-0000-0000-0000-000000000021';

const autreDossierFixture = (): components['schemas']['RestDossierAnomalie'] => {
  const dossier = dossierFinAutomatiqueFixture();
  return {
    ...dossier,
    adresse: { suivi: autreSuiviFixture, pointage: autreOuvrantFixture },
    activite: { ...dossier.activite, evenement: autreOuvrantFixture },
    pointages: dossier.pointages.map(pointage => ({ ...pointage, id: autreOuvrantFixture })),
  };
};

const autreLigneFixture = (): components['schemas']['RestFinAutomatiqueEnListe'] => ({
  ...finAutomatiqueLigneFixture,
  adresse: { suivi: autreSuiviFixture, pointage: autreOuvrantFixture },
});

const whenClickingTheBarAt = (instant: Date): void => {
  const heures = instant.getHours() + instant.getMinutes() / 60;
  cy.get(dataSelector('anomalie-frise-placement')).then(elements => {
    const { left } = requiredFixture(elements[0], 'rangée de placement').getBoundingClientRect();
    abscisseDeLHeure(heures).then(clientX => {
      cy.get(dataSelector('anomalie-frise-placement')).click(clientX - left, 20);
    });
  });
};

describe('Regularisation of the automatic ends of the list in Gestion', () => {
  beforeEach(() => {
    cy.viewport(1280, 900);
    cy.clock(new Date(2026, 8, 14, 23, 0).getTime(), ['Date']);
    givenTheReferentielFinsAutomatiques();
    givenTheElementsFinsAutomatiques();
    cy.intercept('GET', urlDossier, { body: dossierFinAutomatiqueFixture() });
    cy.intercept('GET', `/api/atelier/suivis/${autreSuiviFixture}/anomalies/${autreOuvrantFixture}`, { body: autreDossierFixture() });
    givenTheRegularisationIsCreated();
  });

  it('should lead from the regularised end to the next automatic end of the list', () => {
    givenTheList([finAutomatiqueLigneFixture, autreLigneFixture()]);

    whenRegularisingTheFirstEndOfTheList();
    whenAskingForTheNextAnomaly();

    thenTheNextAutomaticEndIsOpened();
  });

  it('should lead back to the list saying that no anomaly is left when the regularised end was the last', () => {
    givenTheList([finAutomatiqueLigneFixture]);

    whenRegularisingTheFirstEndOfTheList();
    whenAskingForTheNextAnomaly();

    thenTheListSaysThatNoAnomalyIsLeft();
  });

  const givenTheList = (lignes: components['schemas']['RestFinAutomatiqueEnListe'][]): void => {
    cy.intercept('GET', '/api/atelier/anomalies*', { body: pageFinsAutomatiquesFixture(lignes) });
  };

  const whenRegularisingTheFirstEndOfTheList = (): void => {
    cy.visit('/anomalies');
    cy.get(dataSelector('fin-automatique-ouvrir')).first().click();
    whenClickingTheBarAt(HEURE_CLIQUEE);
    whenValidatingTheEnd();
    thenTheEndIsSaidRegularisedAt('17:00');
  };

  const whenAskingForTheNextAnomaly = (): void => {
    cy.get(dataSelector('anomalie-resolution-suivante')).click();
  };

  const thenTheNextAutomaticEndIsOpened = (): void => {
    cy.location('pathname').should('equal', `/anomalies/${autreSuiviFixture}`);
    cy.location('search').should('contain', `pointage=${autreOuvrantFixture}`);
    cy.get(dataSelector('anomalie-resolution')).should('be.visible');
    cy.get(dataSelector('anomalie-resolution-valider')).should('be.disabled');
  };

  const thenTheListSaysThatNoAnomalyIsLeft = (): void => {
    cy.location('pathname').should('equal', '/anomalies');
    cy.get(dataSelector('anomalies-plus-aucune')).should('contain.text', 'Plus aucune anomalie');
  };
});

describe('Automatic end of an activity in Gestion', () => {
  beforeEach(() => {
    cy.clock(new Date(2026, 8, 14, 23, 0).getTime(), ['Date']);
    givenTheReferentielFinAutomatique();
    cy.intercept('GET', urlDossier, { body: dossierFinAutomatiqueFixture() });
  });

  it('should show the problem and invent no hour until the manager places the end on the frise', () => {
    whenOpeningTheAutomaticEnd();

    thenNoHourIsInventedAndTheValidationWaits();
  });

  it('should regularise the end placed on the frise and say at which hour', () => {
    givenTheRegularisationIsCreated();

    whenOpeningTheAutomaticEnd();
    whenClickingTheBarAt(HEURE_CLIQUEE);
    whenValidatingTheEnd();

    thenTheRegularisationSentIs(activiteFinAutomatiqueFixture, instantLocalWithOffsetFixture(HEURE_CLIQUEE));
    thenTheEndIsSaidRegularisedAt('17:00');
  });

  it('should say the refusal of the server and keep the end to validate again', () => {
    givenTheRegularisationIsRefusedWith(409, 'activite-deja-regularisee');

    whenOpeningTheAutomaticEnd();
    whenClickingTheBarAt(HEURE_CLIQUEE);
    whenValidatingTheEnd();

    thenTheRefusalIsSaid('Cette fin automatique est déjà régularisée.');
    thenTheHandleHolds(HEURE_CLIQUEE);
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

  const thenTheHandleHoldsTheClickedHour = (): void => {
    thenTheHandleHolds(HEURE_CLIQUEE);
    cy.get(dataSelector('anomalie-poignee')).should('be.visible');
  };

  const thenNoHourIsInventedAndTheValidationWaits = (): void => {
    cy.get(dataSelector('anomalie-probleme'))
      .should('have.length', 1)
      .and('have.text', 'Le travail démarré à 08:00 n’a jamais été arrêté : fin automatique à 21:00.');
    thenTheHandleHoldsNoHour();
    cy.get(dataSelector('anomalie-frise-aide')).should('be.visible');
    cy.get(dataSelector('anomalie-resolution-valider')).should('be.disabled');
  };
});
